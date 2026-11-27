import os
import sys
import json
import re
import urllib.parse
import requests
from datetime import datetime, date
from sqlalchemy import create_engine, text
from bs4 import BeautifulSoup

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

REMOTE_DB_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
engine = create_engine(REMOTE_DB_URL)

target_date_str = "2026-08-24"
d_obj = datetime.strptime(target_date_str, "%Y-%m-%d").date()
y, m, d = d_obj.year, d_obj.month, d_obj.day

def clean_tt_name(name_str):
    if not name_str: return ""
    name_str = name_str.replace('^^', ' ')
    return re.sub(r'\s+', ' ', name_str).strip()

def scrape_tt_wtt_all():
    print("=== SCRAPING FULL WTT TABLE TENNIS RANKINGS (RANKS 1-100) ===")
    tt_rows = []
    try:
        from playwright.sync_api import sync_playwright

        categories = [("MEN'S SINGLES", "M", 0), ("WOMEN'S SINGLES", "F", 1)]
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            
            for tab_name, gender_code, gender_int in categories:
                page = context.new_page()
                encoded_tab = urllib.parse.quote(tab_name)
                url = f"https://www.worldtabletennis.com/allplayersranking?selectedTab={encoded_tab}&Age=SENIOR&Rank=1"
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(4000)
                content = page.content()
                page.close()

                soup = BeautifulSoup(content, "html.parser")
                rows = soup.select("tr.cursor_move") or soup.select("table tbody tr")
                print(f"Found {len(rows)} TT rows for {tab_name}")
                for row in rows:
                    try:
                        rank_cell = row.select_one(".player-rank") or row.select_one("td:nth-child(1)")
                        name_cell = row.select_one(".player_name") or row.select_one("td:nth-child(2)")
                        country_cell = row.select_one(".country_name") or row.select_one("td:nth-child(3)")
                        pts_cell = row.select_one(".points") or row.select_one("td:nth-child(4)")
                        if not rank_cell or not name_cell: continue
                        
                        raw_rank_txt = rank_cell.text.strip()
                        # Extract rank digits ignoring movement arrows (▲/▼)
                        match = re.search(r'^\s*(\d+)', raw_rank_txt) or re.search(r'(\d+)', raw_rank_txt)
                        if not match: continue
                        rank = int(match.group(1))

                        name = clean_tt_name(name_cell.text)
                        country = country_cell.text.strip() if country_cell else "Unknown"
                        pts = 0
                        if pts_cell:
                            p_txt = pts_cell.text.strip().replace(",", "")
                            if p_txt.isdigit(): pts = int(p_txt)

                        if name and rank > 0:
                            tt_rows.append({
                                "name": name, "rank": rank, "points": pts, 
                                "country": country, "gender_code": gender_code, 
                                "gender_int": gender_int
                            })
                    except Exception as ex:
                        continue
            browser.close()
    except Exception as e:
        print(f"Error scraping WTT: {e}")

    print(f"Total WTT TT players scraped: {len(tt_rows)}")
    return tt_rows

def main():
    tt_rows = scrape_tt_wtt_all()

    with engine.connect() as conn:
        print("\n=== INSERTING ALL 1-100 WTT RANKINGS INTO DATABASE ===")
        tt_players = conn.execute(text("SELECT id, LOWER(first_name), LOWER(last_name), gender FROM tt_players_historical")).fetchall()
        tt_cache = {}
        for r in tt_players:
            fl = f"{r[1]} {r[2]}".strip()
            lf = f"{r[2]} {r[1]}".strip()
            tt_cache[(fl, r[3])] = r[0]
            tt_cache[(lf, r[3])] = r[0]

        inserted = 0
        for r in tt_rows:
            cleaned_name = clean_tt_name(r["name"])
            key = (cleaned_name.lower(), r["gender_int"])
            pid = tt_cache.get(key)
            if not pid:
                parts = cleaned_name.split()
                fn = parts[0] if parts else ""
                ln = " ".join(parts[1:]) if len(parts) > 1 else ""
                ins = conn.execute(text("""
                    INSERT INTO tt_players_historical (first_name, last_name, gender, country, last_updated)
                    VALUES (:fn, :ln, :g, :country, NOW())
                    RETURNING id
                """), {"fn": fn, "ln": ln, "g": r["gender_int"], "country": r["country"]}).fetchone()
                pid = ins[0]
                tt_cache[key] = pid

            ex = conn.execute(text("""
                SELECT id FROM tt_rankings_historical
                WHERE player_id = :pid AND ranking_year = :y AND ranking_month = :m AND ranking_date = :d
            """), {"pid": pid, "y": y, "m": m, "d": d}).fetchone()
            if not ex:
                conn.execute(text("""
                    INSERT INTO tt_rankings_historical (player_id, rank, points, ranking_year, ranking_month, ranking_date)
                    VALUES (:pid, :rk, :pts, :y, :m, :d)
                """), {"pid": pid, "rk": r["rank"], "pts": r["points"], "y": y, "m": m, "d": d})
                inserted += 1

        conn.commit()
        print(f"Inserted {inserted} WTT rankings into tt_rankings_historical for {target_date_str}.")

        # SANITIZE ACTIVE TABLES
        print("\n=== SANITIZING ACTIVE TABLE_TENNIS_PLAYERS TABLE ===")
        conn.execute(text("UPDATE table_tennis_players SET ranking = NULL"))
        conn.commit()

        lat_tt_m = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id
            WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        lat_tt_f = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id
            WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        if lat_tt_m:
            conn.execute(text("""
                WITH ranked_tt_m AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name_fl,
                           p.last_name || ' ' || p.first_name AS full_name_lf,
                           r.rank,
                           ROW_NUMBER() OVER (PARTITION BY r.rank ORDER BY p.id) as rn
                    FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 0
                      AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE table_tennis_players pl
                SET ranking = rtm.rank
                FROM ranked_tt_m rtm
                WHERE pl.gender = 'M' 
                  AND (LOWER(pl.name) = LOWER(rtm.full_name_fl) OR LOWER(pl.name) = LOWER(rtm.full_name_lf))
                  AND rtm.rn = 1
            """), {"y": lat_tt_m[0], "m": lat_tt_m[1], "d": lat_tt_m[2]})
            conn.commit()

        if lat_tt_f:
            conn.execute(text("""
                WITH ranked_tt_f AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name_fl,
                           p.last_name || ' ' || p.first_name AS full_name_lf,
                           r.rank,
                           ROW_NUMBER() OVER (PARTITION BY r.rank ORDER BY p.id) as rn
                    FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 1
                      AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE table_tennis_players pl
                SET ranking = rtf.rank
                FROM ranked_tt_f rtf
                WHERE pl.gender = 'F' 
                  AND (LOWER(pl.name) = LOWER(rtf.full_name_fl) OR LOWER(pl.name) = LOWER(rtf.full_name_lf))
                  AND rtf.rn = 1
            """), {"y": lat_tt_f[0], "m": lat_tt_f[1], "d": lat_tt_f[2]})
            conn.commit()

        print("Active table_tennis_players table updated successfully.")

        # RE-EXPORT OFFLINE ASSETS
        print("\n=== EXPORTING COMPLETE TT_PLAYERS.JSON ASSET ===")
        out_dir = os.path.join(project_root, "frontend", "assets", "data")
        os.makedirs(out_dir, exist_ok=True)

        tt_players_list = [dict(r._mapping) for r in conn.execute(text("SELECT id, first_name, last_name, country, gender, picture, last_updated FROM tt_players_historical"))]
        tt_m_ranks = {r[0]: r[1] for r in conn.execute(text("SELECT player_id, rank FROM tt_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": lat_tt_m[0], "m": lat_tt_m[1], "d": lat_tt_m[2]})} if lat_tt_m else {}
        tt_f_ranks = {r[0]: r[1] for r in conn.execute(text("SELECT player_id, rank FROM tt_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": lat_tt_f[0], "m": lat_tt_f[1], "d": lat_tt_f[2]})} if lat_tt_f else {}

        tt_ch_res = conn.execute(text("""
            SELECT DISTINCT ON (player_id) player_id, rank, ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical WHERE rank > 0
            ORDER BY player_id, rank ASC, ranking_year ASC, ranking_month ASC, ranking_date ASC
        """))
        tt_ch_dict = {}
        for r in tt_ch_res:
            try: ch_d = date(r[2], r[3], r[4]).isoformat()
            except ValueError: ch_d = None
            tt_ch_dict[r[0]] = {"rank": r[1], "date": ch_d}

        final_tt = []
        for p in tt_players_list:
            pid = p["id"]
            g_str = "M" if p["gender"] == 0 else "F"
            cur_rank = tt_m_ranks.get(pid) if g_str == "M" else tt_f_ranks.get(pid)
            ch = tt_ch_dict.get(pid, {})
            final_tt.append({
                "id": pid,
                "name": f"{p['first_name']} {p['last_name']}".strip(),
                "country": p["country"],
                "ranking": cur_rank,
                "image_url": p["picture"],
                "source": "WTT Historical Database",
                "gender": g_str,
                "last_updated": p["last_updated"].isoformat() if isinstance(p["last_updated"], (date, datetime)) else p["last_updated"],
                "career_high_rank": ch.get("rank"),
                "career_high_date": ch.get("date")
            })

        with open(os.path.join(out_dir, "tt_players.json"), "w", encoding="utf-8") as f:
            json.dump(final_tt, f, ensure_ascii=False, indent=2)
        print(f"Wrote clean {os.path.join(out_dir, 'tt_players.json')} ({len(final_tt)} players)")

    print("Success!")

if __name__ == "__main__":
    main()
