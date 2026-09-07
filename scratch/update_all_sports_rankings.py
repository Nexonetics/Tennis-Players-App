import os
import sys
import re
import json
import urllib.parse
import requests
from datetime import datetime, date
from sqlalchemy import create_engine, text
from bs4 import BeautifulSoup

# Setup paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

LOCAL_SQLITE_URL = f"sqlite:///{os.path.join(project_root, 'tennis.db')}"
BACKEND_SQLITE_URL = f"sqlite:///{os.path.join(project_root, 'backend', 'tennis.db')}"
REMOTE_DB_URL = "postgresql://neondb_owner:npg_48uqktSjVLpR@ep-damp-resonance-anwqigab.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&hostaddr=35.173.20.131"

def clean_name(name_str):
    if not name_str: return ""
    name = " ".join(name_str.split()).strip()
    name = re.sub(r'\s+[A-Z]{3}$', '', name)
    return name

def clean_and_split_name(full_name: str):
    name = clean_name(full_name)
    parts = name.split()
    if len(parts) == 0: return "", ""
    if len(parts) == 1: return parts[0], ""
    return parts[0], " ".join(parts[1:])

# -------------------------------------------------------------
# 1. TENNIS SCRAPERS
# -------------------------------------------------------------
def fetch_tennis_atp(target_date_str="2026-08-31"):
    print(f"🎾 Fetching ATP Men's Rankings for {target_date_str}...")
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
                    name = clean_name(raw_name)

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
        print(f"⚠️ ATP Fetch notice: {e}")

    print(f"   Scraped {len(atp_rows)} ATP players.")
    return atp_rows

def fetch_tennis_wta(target_date_str="2026-08-31"):
    print(f"🎾 Fetching WTA Women's Rankings for {target_date_str}...")
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
                name = clean_name(f"{fn} {ln}")
                rank = item.get("ranking", 0)
                pts = item.get("points", 0)
                country = p_info.get("countryCode", "Unknown")
                dob = p_info.get("dateOfBirth")
                if name and rank:
                    wta_rows.append({"name": name, "rank": rank, "points": pts, "country": country, "wta_dob": dob})
    except Exception as e:
        print(f"⚠️ WTA Fetch notice: {e}")

    print(f"   Scraped {len(wta_rows)} WTA players.")
    return wta_rows

# -------------------------------------------------------------
# 2. TABLE TENNIS SCRAPER
# -------------------------------------------------------------
def fetch_tt_wtt():
    print(f"🏓 Fetching WTT Table Tennis Rankings via Playwright...")
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
                        name = clean_name(name_cell.text)
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
        print(f"⚠️ WTT Fetch notice: {e}")

    print(f"   Scraped {len(tt_rows)} TT players.")
    return tt_rows

# -------------------------------------------------------------
# 3. FOOTBALL SCRAPER
# -------------------------------------------------------------
def fetch_football_fifa():
    print(f"⚽ Fetching FIFA Football Rankings...")
    fb_rows = []
    FIFA_API_BASE = "https://api.fifa.com/api/v3/fifarankings/rankings/rankingsbyschedule"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://www.fifa.com",
        "Referer": "https://www.fifa.com/"
    }

    schedules = [
        ("men", "FRS_Male_Football_20260119"),
        ("women", "FRS_Female_Football_20251207")
    ]

    for category, default_sched in schedules:
        try:
            sched_id = default_sched
            try:
                web_r = requests.get(f"https://inside.fifa.com/fifa-world-ranking/{category}", timeout=8)
                if web_r.status_code == 200:
                    pat = r"FRS_Male_Football_[0-9]+" if category == "men" else r"FRS_Female_Football_[0-9]+"
                    m = re.search(pat, web_r.text)
                    if m: sched_id = m.group(0)
            except Exception:
                pass

            api_url = f"{FIFA_API_BASE}?rankingScheduleId={sched_id}&language=en"
            resp = requests.get(api_url, headers=headers, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get('Results', [])
                for entry in results:
                    t_names = entry.get('TeamName', [])
                    if not t_names: continue
                    name = t_names[0].get('Description')
                    rank = entry.get('Rank')
                    confed = entry.get('ConfederationName', 'Unknown')
                    pts = entry.get('Points', 0.0)
                    if name and rank:
                        fb_rows.append({
                            "name": name, "rank": rank, "points": pts,
                            "category": category, "confederation": confed
                        })
        except Exception as e:
            print(f"⚠️ FIFA {category} fetch notice: {e}")

    print(f"   Scraped {len(fb_rows)} Football teams.")
    return fb_rows

# -------------------------------------------------------------
# 4. BASKETBALL SCRAPER
# -------------------------------------------------------------
def fetch_basketball_fiba():
    print(f"🏀 Fetching FIBA Basketball Rankings...")
    bb_rows = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Referer": "https://www.fiba.basketball/"}
    schedules = [("men", "https://www.fiba.basketball/en/ranking/men"), ("women", "https://www.fiba.basketball/en/ranking/women")]
    for category, url in schedules:
        try:
            r = requests.get(url, headers=headers, timeout=12)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                tables = soup.find_all('table')
                if tables:
                    rows = tables[0].find_all('tr')
                    for row in rows[1:]:
                        cols = row.find_all(['th', 'td'])
                        if len(cols) < 4: continue
                        raw_rank = cols[0].text.strip().replace('.', '')
                        raw_name = cols[1].text.strip()
                        raw_pts = cols[3].text.strip().replace(',', '')
                        if raw_rank.isdigit() and raw_name:
                            bb_rows.append({
                                "name": raw_name,
                                "rank": int(raw_rank),
                                "points": float(raw_pts) if raw_pts.replace('.','',1).isdigit() else 0.0,
                                "category": category
                            })
        except Exception as e:
            print(f"⚠️ FIBA {category} fetch notice: {e}")

    print(f"   Scraped {len(bb_rows)} Basketball teams.")
    return bb_rows

# -------------------------------------------------------------
# 5. DATABASE SANITIZATION & SEQUENCE DEDUPLICATION
# -------------------------------------------------------------
def sanitize_and_deduplicate_all(engine):
    print(f"\n==================================================")
    print(f"  SANITIZING & DEDUPLICATING DB: {engine.url.drivername}")
    print(f"==================================================")

    with engine.connect() as conn:
        # --- A. TENNIS (ATP / WTA) ---
        print("🎾 Sanitizing Tennis active table (players)...")
        lat_atp = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        lat_wta = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        conn.execute(text("UPDATE players SET ranking = NULL"))
        conn.commit()

        if lat_atp:
            conn.execute(text("""
                WITH ranked_seq AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name,
                           ROW_NUMBER() OVER (ORDER BY r.rank ASC, r.points DESC, p.id ASC) AS seq_rank
                    FROM tennis_rankings_historical r
                    JOIN tennis_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 0 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE players
                SET ranking = seq_rank
                FROM ranked_seq
                WHERE players.gender = 'M' AND LOWER(players.name) = LOWER(ranked_seq.full_name)
            """), {"y": lat_atp[0], "m": lat_atp[1], "d": lat_atp[2]})
            conn.commit()

        if lat_wta:
            conn.execute(text("""
                WITH ranked_seq AS (
                    SELECT p.first_name || ' ' || p.last_name AS full_name,
                           ROW_NUMBER() OVER (ORDER BY r.rank ASC, r.points DESC, p.id ASC) AS seq_rank
                    FROM tennis_rankings_historical r
                    JOIN tennis_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 1 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE players
                SET ranking = seq_rank
                FROM ranked_seq
                WHERE players.gender = 'F' AND LOWER(players.name) = LOWER(ranked_seq.full_name)
            """), {"y": lat_wta[0], "m": lat_wta[1], "d": lat_wta[2]})
            conn.commit()

        # --- B. TABLE TENNIS ---
        print("🏓 Sanitizing Table Tennis active table (table_tennis_players)...")
        lat_tt_m = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        lat_tt_f = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tt_rankings_historical r
            JOIN tt_players_historical p ON r.player_id = p.id WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        conn.execute(text("UPDATE table_tennis_players SET ranking = NULL"))
        conn.commit()

        if lat_tt_m:
            conn.execute(text("""
                WITH ranked_seq AS (
                    SELECT p.first_name || ' ' || p.last_name AS fl, p.last_name || ' ' || p.first_name AS lf,
                           ROW_NUMBER() OVER (ORDER BY r.rank ASC, r.points DESC, p.id ASC) AS seq_rank
                    FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 0 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE table_tennis_players
                SET ranking = seq_rank
                FROM ranked_seq
                WHERE table_tennis_players.gender = 'M' 
                  AND (LOWER(table_tennis_players.name) = LOWER(ranked_seq.fl) OR LOWER(table_tennis_players.name) = LOWER(ranked_seq.lf))
            """), {"y": lat_tt_m[0], "m": lat_tt_m[1], "d": lat_tt_m[2]})
            conn.commit()

        if lat_tt_f:
            conn.execute(text("""
                WITH ranked_seq AS (
                    SELECT p.first_name || ' ' || p.last_name AS fl, p.last_name || ' ' || p.first_name AS lf,
                           ROW_NUMBER() OVER (ORDER BY r.rank ASC, r.points DESC, p.id ASC) AS seq_rank
                    FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE p.gender = 1 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d
                )
                UPDATE table_tennis_players
                SET ranking = seq_rank
                FROM ranked_seq
                WHERE table_tennis_players.gender = 'F' 
                  AND (LOWER(table_tennis_players.name) = LOWER(ranked_seq.fl) OR LOWER(table_tennis_players.name) = LOWER(ranked_seq.lf))
            """), {"y": lat_tt_f[0], "m": lat_tt_f[1], "d": lat_tt_f[2]})
            conn.commit()

        # --- C. FOOTBALL ---
        print("⚽ Sanitizing Football active table (football_national_teams)...")
        for cat in ['men', 'women']:
            teams = conn.execute(text("""
                SELECT id, ranking FROM football_national_teams
                WHERE category = :cat AND ranking IS NOT NULL AND ranking > 0
                ORDER BY ranking ASC, id ASC
            """), {"cat": cat}).fetchall()

            for seq, t in enumerate(teams, start=1):
                tid, old_rk = t[0], t[1]
                if old_rk != seq:
                    conn.execute(text("UPDATE football_national_teams SET ranking = :rk WHERE id = :id"), {"rk": seq, "id": tid})
        conn.commit()

        # --- D. BASKETBALL ---
        print("🏀 Sanitizing Basketball active table (basketball_national_teams)...")
        for cat in ['men', 'women']:
            teams = conn.execute(text("""
                SELECT id, ranking FROM basketball_national_teams
                WHERE category = :cat AND ranking IS NOT NULL AND ranking > 0
                ORDER BY ranking ASC, id ASC
            """), {"cat": cat}).fetchall()

            for seq, t in enumerate(teams, start=1):
                tid, old_rk = t[0], t[1]
                if old_rk != seq:
                    conn.execute(text("UPDATE basketball_national_teams SET ranking = :rk WHERE id = :id"), {"rk": seq, "id": tid})
        conn.commit()

        print("✅ Sanitization and sequence re-indexing complete for all 4 sports!")

# -------------------------------------------------------------
# MAIN WORKFLOW
# -------------------------------------------------------------
def main():
    print("🚀 STARTING MULTI-SPORT RANKINGS UPDATE & SANITIZATION WORKFLOW")

    # 1. Fetch online rankings
    atp = fetch_tennis_atp("2026-08-31")
    wta = fetch_tennis_wta("2026-08-31")
    wtt = fetch_tt_wtt()
    fifa = fetch_football_fifa()
    fiba = fetch_basketball_fiba()

    # 2. Update Local SQLite DB
    print("\n================== UPDATING LOCAL SQLITE DB ==================")
    local_engine = create_engine(LOCAL_SQLITE_URL)
    sanitize_and_deduplicate_all(local_engine)

    # Copy local tennis.db -> backend/tennis.db
    import shutil
    shutil.copyfile(os.path.join(project_root, 'tennis.db'), os.path.join(project_root, 'backend', 'tennis.db'))
    print(f"Synced tennis.db -> backend/tennis.db")

    # 3. Update Remote Neon PostgreSQL DB
    print("\n================== UPDATING REMOTE NEON POSTGRESQL DB ==================")
    remote_engine = create_engine(REMOTE_DB_URL)
    sanitize_and_deduplicate_all(remote_engine)

    print("\n🎉 ALL UPDATES AND DEDUPLICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
