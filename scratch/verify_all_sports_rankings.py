import os
import sys
from sqlalchemy import create_engine, text

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)

LOCAL_SQLITE_URL = f"sqlite:///{os.path.join(project_root, 'tennis.db')}"
BACKEND_SQLITE_URL = f"sqlite:///{os.path.join(project_root, 'backend', 'tennis.db')}"
REMOTE_DB_URL = "postgresql://neondb_owner:npg_48uqktSjVLpR@ep-damp-resonance-anwqigab.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&hostaddr=35.173.20.131"

def audit_database(db_url, db_label):
    print(f"\n==================================================")
    print(f"📊 VERIFYING RANKINGS IN: {db_label}")
    print(f"==================================================")

    engine = create_engine(db_url)
    all_ok = True

    with engine.connect() as conn:
        # 1. TENNIS ATP (M)
        latest_atp_date = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 0
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        if latest_atp_date:
            y, m, d = latest_atp_date[0], latest_atp_date[1], latest_atp_date[2]
            atp_ranks = [r[0] for r in conn.execute(text("""
                SELECT r.rank FROM tennis_rankings_historical r
                JOIN tennis_players_historical p ON r.player_id = p.id
                WHERE p.gender = 0 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d AND r.rank > 0
                ORDER BY r.rank ASC
            """), {"y": y, "m": m, "d": d}).fetchall()]

            dup_atp = [r for r in set(atp_ranks) if atp_ranks.count(r) > 1]
            miss_atp = set(range(1, max(atp_ranks) + 1 if atp_ranks else 1)) - set(atp_ranks)

            print(f"\n🎾 TENNIS ATP (Men's) [{y}-{m:02d}-{d:02d}]: {len(atp_ranks)} ranked players")
            if dup_atp:
                print(f"   ❌ DUPLICATE RANKS: {dup_atp}")
                all_ok = False
            else:
                print("   ✅ Zero duplicate ranks!")

            if miss_atp:
                print(f"   ❌ MISSING RANKS: {sorted(list(miss_atp))[:10]}")
                all_ok = False
            else:
                print(f"   ✅ Zero missing ranks! Continuous sequence 1..{len(atp_ranks)}")

        # 2. TENNIS WTA (F)
        latest_wta_date = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date FROM tennis_rankings_historical r
            JOIN tennis_players_historical p ON r.player_id = p.id WHERE p.gender = 1
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
        """)).fetchone()

        if latest_wta_date:
            y, m, d = latest_wta_date[0], latest_wta_date[1], latest_wta_date[2]
            wta_ranks = [r[0] for r in conn.execute(text("""
                SELECT r.rank FROM tennis_rankings_historical r
                JOIN tennis_players_historical p ON r.player_id = p.id
                WHERE p.gender = 1 AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d AND r.rank > 0
                ORDER BY r.rank ASC
            """), {"y": y, "m": m, "d": d}).fetchall()]

            dup_wta = [r for r in set(wta_ranks) if wta_ranks.count(r) > 1]
            miss_wta = set(range(1, max(wta_ranks) + 1 if wta_ranks else 1)) - set(wta_ranks)

            print(f"\n🎾 TENNIS WTA (Women's) [{y}-{m:02d}-{d:02d}]: {len(wta_ranks)} ranked players")
            if dup_wta:
                print(f"   ❌ DUPLICATE RANKS: {dup_wta}")
                all_ok = False
            else:
                print("   ✅ Zero duplicate ranks!")

            if miss_wta:
                print(f"   ❌ MISSING RANKS: {sorted(list(miss_wta))[:10]}")
                all_ok = False
            else:
                print(f"   ✅ Zero missing ranks! Continuous sequence 1..{len(wta_ranks)}")

        # 3. TABLE TENNIS WTT (M & F)
        for g_code, g_label in [(0, "Men's"), (1, "Women's")]:
            latest_tt_date = conn.execute(text("""
                SELECT ranking_year, ranking_month, ranking_date FROM tt_rankings_historical r
                JOIN tt_players_historical p ON r.player_id = p.id WHERE p.gender = :g
                ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC LIMIT 1
            """), {"g": g_code}).fetchone()

            if latest_tt_date:
                y, m, d = latest_tt_date[0], latest_tt_date[1], latest_tt_date[2]
                tt_ranks = [r[0] for r in conn.execute(text("""
                    SELECT r.rank FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE p.gender = :g AND r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d AND r.rank > 0
                    ORDER BY r.rank ASC
                """), {"g": g_code, "y": y, "m": m, "d": d}).fetchall()]

                dup_tt = [r for r in set(tt_ranks) if tt_ranks.count(r) > 1]
                miss_tt = set(range(1, max(tt_ranks) + 1 if tt_ranks else 1)) - set(tt_ranks)

                print(f"\n🏓 WTT TABLE TENNIS ({g_label}) [{y}-{m:02d}-{d:02d}]: {len(tt_ranks)} ranked players")
                if dup_tt:
                    print(f"   ❌ DUPLICATE RANKS: {dup_tt}")
                    all_ok = False
                else:
                    print("   ✅ Zero duplicate ranks!")

                if miss_tt:
                    print(f"   ❌ MISSING RANKS: {sorted(list(miss_tt))[:10]}")
                    all_ok = False
                else:
                    print(f"   ✅ Zero missing ranks! Continuous sequence 1..{len(tt_ranks)}")

        # 4. FOOTBALL FIFA (M & F)
        for cat, c_label in [("men", "Men's"), ("women", "Women's")]:
            fb_ranks = [r[0] for r in conn.execute(text("""
                SELECT ranking FROM football_national_teams
                WHERE category = :cat AND ranking IS NOT NULL AND ranking > 0
                ORDER BY ranking ASC
            """), {"cat": cat}).fetchall()]

            dup_fb = [r for r in set(fb_ranks) if fb_ranks.count(r) > 1]
            miss_fb = set(range(1, max(fb_ranks) + 1 if fb_ranks else 1)) - set(fb_ranks)

            print(f"\n⚽ FOOTBALL FIFA ({c_label}): {len(fb_ranks)} ranked teams")
            if dup_fb:
                print(f"   ❌ DUPLICATE RANKS: {dup_fb}")
                all_ok = False
            else:
                print("   ✅ Zero duplicate ranks!")

            if miss_fb:
                print(f"   ❌ MISSING RANKS: {sorted(list(miss_fb))[:10]}")
                all_ok = False
            else:
                print(f"   ✅ Zero missing ranks! Continuous sequence 1..{len(fb_ranks)}")

        # 5. BASKETBALL FIBA (M & F)
        for cat, c_label in [("men", "Men's"), ("women", "Women's")]:
            bb_ranks = [r[0] for r in conn.execute(text("""
                SELECT ranking FROM basketball_national_teams
                WHERE category = :cat AND ranking IS NOT NULL AND ranking > 0
                ORDER BY ranking ASC
            """), {"cat": cat}).fetchall()]

            dup_bb = [r for r in set(bb_ranks) if bb_ranks.count(r) > 1]
            miss_bb = set(range(1, max(bb_ranks) + 1 if bb_ranks else 1)) - set(bb_ranks)

            print(f"\n🏀 BASKETBALL FIBA ({c_label}): {len(bb_ranks)} ranked teams")
            if dup_bb:
                print(f"   ❌ DUPLICATE RANKS: {dup_bb}")
                all_ok = False
            else:
                print("   ✅ Zero duplicate ranks!")

            if miss_bb:
                print(f"   ❌ MISSING RANKS: {sorted(list(miss_bb))[:10]}")
                all_ok = False
            else:
                print(f"   ✅ Zero missing ranks! Continuous sequence 1..{len(bb_ranks)}")

    return all_ok

def main():
    print("🔍 AUDITING ALL SPORTS RANKINGS ACROSS LOCAL & REMOTE DATABASES")
    sqlite_ok = audit_database(LOCAL_SQLITE_URL, "LOCAL SQLITE (tennis.db)")
    remote_ok = audit_database(REMOTE_DB_URL, "REMOTE NEON POSTGRESQL (neondb)")

    if sqlite_ok and remote_ok:
        print("\n==================================================")
        print("🎉 AUDIT PASSED 100%! ZERO DUPLICATES, ZERO SEQUENCE GAPS DETECTED IN ALL 4 SPORTS.")
        print("==================================================")
    else:
        print("\n==================================================")
        print("⚠️ AUDIT DETECTED ISSUES. PLEASE REVIEW LOGS ABOVE.")
        print("==================================================")

if __name__ == "__main__":
    main()
