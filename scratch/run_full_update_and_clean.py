import os
import sys
import re
import json
import urllib.parse
import requests
from datetime import datetime, date
from sqlalchemy import create_engine, text
from bs4 import BeautifulSoup

# Add paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

REMOTE_DB_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
LOCAL_SQLITE_URL = f"sqlite:///{os.path.join(project_root, 'backend', 'tennis.db')}"

def clean_and_split_name(full_name: str):
    if not full_name:
        return "", ""
    name = " ".join(full_name.split()).strip()
    name = re.sub(r'\s+[A-Z]{3}$', '', name)
    parts = name.split()
    if len(parts) == 0:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])

def parse_birth_date(birth_val):
    if not birth_val:
        return None, None, None
    if isinstance(birth_val, date):
        return birth_val.day, birth_val.month, birth_val.year
    if isinstance(birth_val, str):
        for fmt in ("%Y-%m-%d", "%B %d, %Y", "%d %b %Y"):
            try:
                d = datetime.strptime(birth_val.strip(), fmt).date()
                return d.day, d.month, d.year
            except ValueError:
                pass
    return None, None, None

def clean_tt_name(name_str):
    if not name_str: return ""
    name_str = name_str.replace('^^', ' ')
    return re.sub(r'\s+', ' ', name_str).strip()

def scrape_tennis_atp(target_date_str="2026-08-24"):
    print(f"\n--- Scraping ATP Tennis Rankings via HTTP for {target_date_str} ---")
    atp_rows = []
    url = "https://www.atptour.com/en/rankings/singles?rankRange=1-100"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.content, "html.parser")
            table = soup.select_one("table.rankings-table") or soup.select_one("table")
            if table:
                rows = table.select("tbody tr")
                for row in rows:
                    rank_cell = row.select_one("td.rank")
                    player_link = row.select_one(".name a")
                    if not rank_cell or not player_link: continue
                    rank_text = rank_cell.text.strip().replace("T", "")
                    if not rank_text.isdigit(): continue
                    ranking = int(rank_text)

                    player_url_path = player_link.get("href", "")
                    raw_name = player_link.text.strip()
                    name = " ".join(raw_name.split()).strip()
                    name = re.sub(r'\s+[A-Z]{3}$', '', name)

                    if "/players/" in player_url_path:
                        parts = player_url_path.split("/")
                        try:
                            slug = parts[parts.index("players") + 1]
                            name_from_slug = " ".join(slug.split("-")).title()
                            if "." in name or len(name) < len(name_from_slug):
                                name = name_from_slug
                        except (ValueError, IndexError):
                            pass

                    country = "Unknown"
                    flag_use = row.select_one("use")
                    if flag_use and flag_use.get("href"):
                        country_match = flag_use.get("href").split("#flag-")
                        if len(country_match) > 1: country = country_match[1].upper()

                    pts_cell = row.select_one("td.points") or row.select_one(".points-cell")
                    pts = 0
                    if pts_cell:
                        pt = pts_cell.text.strip().replace(",", "")
                        if pt.isdigit(): pts = int(pt)

                    if name and ranking > 0:
                        atp_rows.append({"name": name, "rank": ranking, "points": pts, "country": country})
    except Exception as e:
        print(f"Error scraping ATP: {e}")

    print(f"Scraped {len(atp_rows)} ATP players for {target_date_str}")
    return atp_rows

def scrape_tennis_wta(target_date_str="2026-08-24"):
    print(f"\n--- Scraping WTA Tennis Rankings via API for {target_date_str} ---")
    wta_rows = []
    url = f"https://api.wtatennis.com/tennis/players/ranked?metric=SINGLES&type=rankSingles&sort=asc&at={target_date_str}&pageSize=100&page=0"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code == 200:
            data = res.json()
            for item in data:
                p_info = item.get("player", {})
                fn = p_info.get("firstName", "").strip()
                ln = p_info.get("lastName", "").strip()
                name = f"{fn} {ln}".strip()
                rank = item.get("ranking", 0)
                pts = item.get("points", 0)
                country = p_info.get("countryCode", "Unknown")
                dob = p_info.get("dateOfBirth")
                if name and rank:
                    wta_rows.append({"name": name, "rank": rank, "points": pts, "country": country, "wta_dob": dob})
    except Exception as e:
        print(f"Error scraping WTA: {e}")

    print(f"Scraped {len(wta_rows)} WTA players for {target_date_str}")
    return wta_rows

def scrape_tt_wtt(target_date_str="2026-08-24"):
    print(f"\n--- Scraping WTT Table Tennis Rankings via Playwright ---")
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
                page.wait_for_timeout(3000)
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
                    except Exception:
                        continue
            browser.close()
    except Exception as e:
        print(f"Error scraping WTT: {e}")

    print(f"Scraped {len(tt_rows)} TT players in total")
    return tt_rows

def update_db(engine, atp_rows, wta_rows, tt_rows, target_date_str="2026-08-24"):
    d_obj = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    y, m, d = d_obj.year, d_obj.month, d_obj.day
    
    with engine.connect() as conn:
        print(f"\nUpdating database at {engine.url}...")

        # 1. TENNIS HISTORICAL PLAYERS & RANKINGS
        t_players = conn.execute(text("SELECT id, LOWER(first_name), LOWER(last_name), gender FROM tennis_players_historical")).fetchall()
        t_cache = {(r[1], r[2], r[3]): r[0] for r in t_players}

        t_rankings_inserted = 0
        for r in atp_rows:
            fn, ln = clean_and_split_name(r["name"])
            key = (fn.lower(), ln.lower(), 0)
            pid = t_cache.get(key)
            if not pid:
                if "postgresql" in str(engine.url):
                    ins = conn.execute(text("""
                        INSERT INTO tennis_players_historical (first_name, last_name, gender, country, last_updated)
                        VALUES (:fn, :ln, 0, :country, CURRENT_TIMESTAMP)
                        RETURNING id
                    """), {"fn": fn, "ln": ln, "country": r["country"]}).fetchone()
                    pid = ins[0]
                else:
                    conn.execute(text("""
                        INSERT INTO tennis_players_historical (first_name, last_name, gender, country, last_updated)
                        VALUES (:fn, :ln, 0, :country, CURRENT_TIMESTAMP)
                    """), {"fn": fn, "ln": ln, "country": r["country"]})
                    pid = conn.execute(text("SELECT last_insert_rowid()")).scalar()
                t_cache[key] = pid
            
            exist = conn.execute(text("""
                SELECT id FROM tennis_rankings_historical
                WHERE player_id = :pid AND ranking_year = :y AND ranking_month = :m AND ranking_date = :d
            """), {"pid": pid, "y": y, "m": m, "d": d}).fetchone()
            if not exist:
                conn.execute(text("""
                    INSERT INTO tennis_rankings_historical (player_id, rank, points, ranking_year, ranking_month, ranking_date)
                    VALUES (:pid, :rank, :pts, :y, :m, :d)
                """), {"pid": pid, "rank": r["rank"], "pts": r["points"], "y": y, "m": m, "d": d})
                t_rankings_inserted += 1

        for r in wta_rows:
            fn, ln = clean_and_split_name(r["name"])
            key = (fn.lower(), ln.lower(), 1)
            pid = t_cache.get(key)
            b_day, b_month, b_year = parse_birth_date(r.get("wta_dob"))
            if not pid:
                if "postgresql" in str(engine.url):
                    ins = conn.execute(text("""
                        INSERT INTO tennis_players_historical (first_name, last_name, gender, country, birth_date, birth_month, birth_year, last_updated)
                        VALUES (:fn, :ln, 1, :country, :bd, :bm, :by, CURRENT_TIMESTAMP)
                        RETURNING id
                    """), {"fn": fn, "ln": ln, "country": r["country"], "bd": b_day, "bm": b_month, "by": b_year}).fetchone()
                    pid = ins[0]
                else:
                    conn.execute(text("""
                        INSERT INTO tennis_players_historical (first_name, last_name, gender, country, birth_date, birth_month, birth_year, last_updated)
                        VALUES (:fn, :ln, 1, :country, :bd, :bm, :by, CURRENT_TIMESTAMP)
                    """), {"fn": fn, "ln": ln, "country": r["country"], "bd": b_day, "bm": b_month, "by": b_year})
                    pid = conn.execute(text("SELECT last_insert_rowid()")).scalar()
                t_cache[key] = pid

            exist = conn.execute(text("""
                SELECT id FROM tennis_rankings_historical
                WHERE player_id = :pid AND ranking_year = :y AND ranking_month = :m AND ranking_date = :d
            """), {"pid": pid, "y": y, "m": m, "d": d}).fetchone()
            if not exist:
                conn.execute(text("""
                    INSERT INTO tennis_rankings_historical (player_id, rank, points, ranking_year, ranking_month, ranking_date)
                    VALUES (:pid, :rank, :pts, :y, :m, :d)
                """), {"pid": pid, "rank": r["rank"], "pts": r["points"], "y": y, "m": m, "d": d})
                t_rankings_inserted += 1

        # 2. TABLE TENNIS HISTORICAL PLAYERS & RANKINGS
        tt_players = conn.execute(text("SELECT id, LOWER(first_name), LOWER(last_name), gender FROM tt_players_historical")).fetchall()
        tt_cache = {}
        for r in tt_players:
            fl = f"{r[1]} {r[2]}".strip()
            lf = f"{r[2]} {r[1]}".strip()
            tt_cache[(fl, r[3])] = r[0]
            tt_cache[(lf, r[3])] = r[0]

        tt_rankings_inserted = 0
        for r in tt_rows:
            cleaned_name = clean_tt_name(r["name"])
            key = (cleaned_name.lower(), r["gender_int"])
            pid = tt_cache.get(key)
            if not pid:
                fn, ln = clean_and_split_name(cleaned_name)
                if "postgresql" in str(engine.url):
                    ins = conn.execute(text("""
                        INSERT INTO tt_players_historical (first_name, last_name, gender, country, last_updated)
                        VALUES (:fn, :ln, :g, :country, CURRENT_TIMESTAMP)
                        RETURNING id
                    """), {"fn": fn, "ln": ln, "g": r["gender_int"], "country": r["country"]}).fetchone()
                    pid = ins[0]
                else:
                    conn.execute(text("""
                        INSERT INTO tt_players_historical (first_name, last_name, gender, country, last_updated)
                        VALUES (:fn, :ln, :g, :country, CURRENT_TIMESTAMP)
                    """), {"fn": fn, "ln": ln, "g": r["gender_int"], "country": r["country"]})
                    pid = conn.execute(text("SELECT last_insert_rowid()")).scalar()
                tt_cache[key] = pid

            exist = conn.execute(text("""
                SELECT id FROM tt_rankings_historical
                WHERE player_id = :pid AND ranking_year = :y AND ranking_month = :m AND ranking_date = :d
            """), {"pid": pid, "y": y, "m": m, "d": d}).fetchone()
            if not exist:
                conn.execute(text("""
                    INSERT INTO tt_rankings_historical (player_id, rank, points, ranking_year, ranking_month, ranking_date)
                    VALUES (:pid, :rank, :pts, :y, :m, :d)
                """), {"pid": pid, "rank": r["rank"], "pts": r["points"], "y": y, "m": m, "d": d})
                tt_rankings_inserted += 1

        conn.commit()
        print(f"DB Insert complete: {t_rankings_inserted} new Tennis rankings, {tt_rankings_inserted} new TT rankings.")

def sanitize_active_tables(engine):
    print("\n--- SANITIZING & DEDUPLICATING ACTIVE PLAYER TABLES ---")
    with engine.connect() as conn:
        conn.execute(text("UPDATE players SET ranking = NULL"))
        conn.execute(text("UPDATE table_tennis_players SET ranking = NULL"))
        conn.commit()

        latest_atp = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id
            WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 1
        """)).fetchone()

        latest_wta = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id
            WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 1
        """)).fetchone()

        if latest_atp:
            conn.execute(text("""
                WITH ranked_atp AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name, r.rank,
                           ROW_NUMBER() OVER (PARTITION BY r.rank ORDER BY p.id) as rn
                    FROM tennis_rankings_historical r
                    JOIN tennis_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 0
                      AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE players pl
                SET ranking = ra.rank
                FROM ranked_atp ra
                WHERE pl.gender = 'M' AND LOWER(pl.name) = LOWER(ra.full_name) AND ra.rn = 1
            """), {"y": latest_atp[0], "m": latest_atp[1], "d": latest_atp[2]})
            conn.commit()

        if latest_wta:
            conn.execute(text("""
                WITH ranked_wta AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name, r.rank,
                           ROW_NUMBER() OVER (PARTITION BY r.rank ORDER BY p.id) as rn
                    FROM tennis_rankings_historical r
                    JOIN tennis_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 1
                      AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE players pl
                SET ranking = rw.rank
                FROM ranked_wta rw
                WHERE pl.gender = 'F' AND LOWER(pl.name) = LOWER(rw.full_name) AND rw.rn = 1
            """), {"y": latest_wta[0], "m": latest_wta[1], "d": latest_wta[2]})
            conn.commit()

        latest_tt_m = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id
            WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 1
        """)).fetchone()

        latest_tt_f = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id
            WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 1
        """)).fetchone()

        if latest_tt_m:
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
            """), {"y": latest_tt_m[0], "m": latest_tt_m[1], "d": latest_tt_m[2]})
            conn.commit()

        if latest_tt_f:
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
            """), {"y": latest_tt_f[0], "m": latest_tt_f[1], "d": latest_tt_f[2]})
            conn.commit()

        print("Active players table deduplicated and sanitized successfully!")

def export_clean_offline_assets(engine):
    print("\n--- EXPORTING CLEAN OFFLINE ASSETS TO FRONTEND ---")
    out_dir = os.path.join(project_root, "frontend", "assets", "data")
    os.makedirs(out_dir, exist_ok=True)

    with engine.connect() as conn:
        print("Exporting Tennis players.json...")
        latest_atp = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 0 ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()
        latest_wta = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 1 ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        players_res = conn.execute(text("SELECT id, first_name, last_name, country, gender, picture, prize_money, birth_year, birth_month, birth_date, last_updated FROM tennis_players_historical"))
        t_players = [dict(r._mapping) for r in players_res]

        atp_ranks = {}
        if latest_atp:
            res = conn.execute(text("SELECT player_id, rank FROM tennis_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": latest_atp[0], "m": latest_atp[1], "d": latest_atp[2]})
            atp_ranks = {r[0]: r[1] for r in res}
        wta_ranks = {}
        if latest_wta:
            res = conn.execute(text("SELECT player_id, rank FROM tennis_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": latest_wta[0], "m": latest_wta[1], "d": latest_wta[2]})
            wta_ranks = {r[0]: r[1] for r in res}

        ch_res = conn.execute(text("""
            SELECT DISTINCT ON (player_id) player_id, rank, ranking_year, ranking_month, ranking_date
            FROM tennis_rankings_historical WHERE rank > 0
            ORDER BY player_id, rank ASC, ranking_year ASC, ranking_month ASC, ranking_date ASC
        """))
        career_highs = {}
        for r in ch_res:
            try: ch_d = date(r[2], r[3], r[4]).isoformat()
            except ValueError: ch_d = None
            career_highs[r[0]] = {"rank": r[1], "date": ch_d}

        final_t_players = []
        for p in t_players:
            pid = p["id"]
            g_str = "M" if p["gender"] == 0 else "F"
            cur_rank = atp_ranks.get(pid) if g_str == "M" else wta_ranks.get(pid)
            b_d = None
            if p["birth_year"] and p["birth_month"] and p["birth_date"]:
                try: b_d = date(p["birth_year"], p["birth_month"], p["birth_date"]).isoformat()
                except ValueError: pass
            ch = career_highs.get(pid, {})
            final_t_players.append({
                "id": pid,
                "name": f"{p['first_name']} {p['last_name']}",
                "country": p["country"],
                "ranking": cur_rank,
                "birth_date": b_d,
                "prize_money": p["prize_money"] or "Unknown",
                "image_url": p["picture"],
                "source": "ATP/WTA Historical Database",
                "gender": g_str,
                "last_updated": p["last_updated"].isoformat() if isinstance(p["last_updated"], (date, datetime)) else p["last_updated"],
                "highest_ranking": ch.get("rank"),
                "highest_ranking_date": ch.get("date"),
                "career_high_rank": ch.get("rank"),
                "career_high_date": ch.get("date")
            })

        t_json_path = os.path.join(out_dir, "players.json")
        with open(t_json_path, "w", encoding="utf-8") as f:
            json.dump(final_t_players, f, ensure_ascii=False, indent=2)
        print(f"Wrote clean {t_json_path} ({len(final_t_players)} players)")

        print("Exporting Table Tennis tt_players.json...")
        latest_tt_m = conn.execute(text("SELECT ranking_year, ranking_month, ranking_date FROM tt_rankings_historical r JOIN tt_players_historical p ON r.player_id = p.id WHERE p.gender = 0 ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1")).fetchone()
        latest_tt_f = conn.execute(text("SELECT ranking_year, ranking_month, ranking_date FROM tt_rankings_historical r JOIN tt_players_historical p ON r.player_id = p.id WHERE p.gender = 1 ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1")).fetchone()

        tt_players_res = conn.execute(text("SELECT id, first_name, last_name, country, gender, picture, last_updated FROM tt_players_historical"))
        tt_p_list = [dict(r._mapping) for r in tt_players_res]

        tt_m_ranks = {}
        if latest_tt_m:
            res = conn.execute(text("SELECT player_id, rank FROM tt_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": latest_tt_m[0], "m": latest_tt_m[1], "d": latest_tt_m[2]})
            tt_m_ranks = {r[0]: r[1] for r in res}
        tt_f_ranks = {}
        if latest_tt_f:
            res = conn.execute(text("SELECT player_id, rank FROM tt_rankings_historical WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d"), {"y": latest_tt_f[0], "m": latest_tt_f[1], "d": latest_tt_f[2]})
            tt_f_ranks = {r[0]: r[1] for r in res}

        tt_ch_res = conn.execute(text("""
            SELECT DISTINCT ON (player_id) player_id, rank, ranking_year, ranking_month, ranking_date
            FROM tt_rankings_historical WHERE rank > 0
            ORDER BY player_id, rank ASC, ranking_year ASC, ranking_month ASC, ranking_date ASC
        """))
        tt_career_highs = {}
        for r in tt_ch_res:
            try: ch_d = date(r[2], r[3], r[4]).isoformat()
            except ValueError: ch_d = None
            tt_career_highs[r[0]] = {"rank": r[1], "date": ch_d}

        final_tt_players = []
        for p in tt_p_list:
            pid = p["id"]
            g_str = "M" if p["gender"] == 0 else "F"
            cur_rank = tt_m_ranks.get(pid) if g_str == "M" else tt_f_ranks.get(pid)
            ch = tt_career_highs.get(pid, {})
            final_tt_players.append({
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

        tt_json_path = os.path.join(out_dir, "tt_players.json")
        with open(tt_json_path, "w", encoding="utf-8") as f:
            json.dump(final_tt_players, f, ensure_ascii=False, indent=2)
        print(f"Wrote clean {tt_json_path} ({len(final_tt_players)} players)")

if __name__ == "__main__":
    target_date = "2026-08-24"
    atp = scrape_tennis_atp(target_date)
    wta = scrape_tennis_wta(target_date)
    wtt = scrape_tt_wtt(target_date)
    
    print("\n================== UPDATING REMOTE POSTGRES DB ==================")
    remote_engine = create_engine(REMOTE_DB_URL)
    update_db(remote_engine, atp, wta, wtt, target_date)
    sanitize_active_tables(remote_engine)
    export_clean_offline_assets(remote_engine)

    sqlite_db_file = os.path.join(project_root, "backend", "tennis.db")
    if os.path.exists(sqlite_db_file):
        print("\n================== UPDATING LOCAL SQLITE DB ==================")
        local_engine = create_engine(LOCAL_SQLITE_URL)
        update_db(local_engine, atp, wta, wtt, target_date)
        sanitize_active_tables(local_engine)

    print("\n✅ ALL DATABASE UPDATES AND ASSET CLEANUPS COMPLETED SUCCESSFULLY!")
