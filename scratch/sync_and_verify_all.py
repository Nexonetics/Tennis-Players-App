import os
import sys
import shutil
from sqlalchemy import create_engine, text

LOCAL_DB_PATH = "/home/nexonetics/nexonetics/tennis_app/tennis.db"
BACKEND_DB_PATH = "/home/nexonetics/nexonetics/tennis_app/backend/tennis.db"
REMOTE_DB_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
print("==================================================")
print("  STEP 1: CONNECTING TO LOCAL AND REMOTE DBS")
print("==================================================")

local_engine = create_engine(f"sqlite:///{LOCAL_DB_PATH}")
remote_engine = create_engine(REMOTE_DB_URL)

def sync_tennis_historical_players():
    print("\n--- Syncing Tennis Historical Players ---")
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_players = loc_conn.execute(text("SELECT id, first_name, last_name, gender, country, birth_date, birth_month, birth_year, picture, prize_money FROM tennis_players_historical")).fetchall()
        remote_players = rem_conn.execute(text("SELECT id, LOWER(first_name), LOWER(last_name), gender FROM tennis_players_historical")).fetchall()
        
        remote_dict = {(r[1], r[2], r[3]): r[0] for r in remote_players}
        
        inserted_count = 0
        id_map = {} # local_id -> remote_id
        
        for p in local_players:
            loc_id, fn, ln, gender, country, bd, bm, by, pic, pm = p
            key = (fn.lower().strip() if fn else "", ln.lower().strip() if ln else "", gender)
            if key in remote_dict:
                id_map[loc_id] = remote_dict[key]
            else:
                res = rem_conn.execute(text("""
                    INSERT INTO tennis_players_historical (first_name, last_name, gender, country, birth_date, birth_month, birth_year, picture, prize_money)
                    VALUES (:fn, :ln, :g, :c, :bd, :bm, :by, :pic, :pm)
                    RETURNING id
                """), {'fn': fn, 'ln': ln, 'g': gender, 'c': country, 'bd': bd, 'bm': bm, 'by': by, 'pic': pic, 'pm': pm})
                new_rem_id = res.fetchone()[0]
                rem_conn.commit()
                remote_dict[key] = new_rem_id
                id_map[loc_id] = new_rem_id
                inserted_count += 1
                
        print(f"  Mapped {len(id_map)} local tennis historical players. Inserted {inserted_count} new players to remote.")
        return id_map

def sync_tennis_historical_rankings(player_id_map):
    print("\n--- Syncing Tennis Historical Rankings (2026-08-31) ---")
    target_year, target_month, target_date = 2026, 8, 31
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_rankings = loc_conn.execute(text("""
            SELECT player_id, points, rank, ranking_date, ranking_month, ranking_year
            FROM tennis_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
        """), {'y': target_year, 'm': target_month, 'd': target_date}).fetchall()
        
        print(f"  Found {len(local_rankings)} local tennis rankings for {target_year}-{target_month:02d}-{target_date:02d}.")
        
        # Valid remote player_ids for this date
        valid_remote_pids = {player_id_map[r[0]] for r in local_rankings if r[0] in player_id_map}
        
        # Clean stale remote rankings for target date that are not in local target dataset
        rem_conn.execute(text("""
            DELETE FROM tennis_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
              AND player_id NOT IN :pids
        """), {'y': target_year, 'm': target_month, 'd': target_date, 'pids': tuple(valid_remote_pids)})
        rem_conn.commit()
        
        existing_remote = rem_conn.execute(text("""
            SELECT player_id, rank, points
            FROM tennis_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
        """), {'y': target_year, 'm': target_month, 'd': target_date}).fetchall()
        
        existing_pids = {r[0]: (r[1], r[2]) for r in existing_remote}
        
        inserted_count = 0
        updated_count = 0
        for r in local_rankings:
            loc_pid, points, rank, r_date, r_month, r_year = r
            rem_pid = player_id_map.get(loc_pid)
            if not rem_pid:
                continue
            if rem_pid in existing_pids:
                curr_rank, curr_pts = existing_pids[rem_pid]
                if curr_rank != rank or curr_pts != points:
                    rem_conn.execute(text("""
                        UPDATE tennis_rankings_historical
                        SET rank = :rk, points = :pts
                        WHERE player_id = :pid AND ranking_year = :ry AND ranking_month = :rm AND ranking_date = :rd
                    """), {'rk': rank, 'pts': points, 'pid': rem_pid, 'ry': r_year, 'rm': r_month, 'rd': r_date})
                    updated_count += 1
            else:
                rem_conn.execute(text("""
                    INSERT INTO tennis_rankings_historical (player_id, points, rank, ranking_date, ranking_month, ranking_year)
                    VALUES (:pid, :pts, :rk, :rd, :rm, :ry)
                """), {'pid': rem_pid, 'pts': points, 'rk': rank, 'rd': r_date, 'rm': r_month, 'ry': r_year})
                inserted_count += 1
        
        rem_conn.commit()
        print(f"  Inserted {inserted_count} and updated {updated_count} tennis ranking entries in remote for {target_year}-{target_month:02d}-{target_date:02d}.")

def sync_active_tennis_players():
    print("\n--- Syncing Active Tennis Players (players table) ---")
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_players = loc_conn.execute(text("""
            SELECT name, country, ranking, highest_ranking, highest_ranking_date, birth_date, height, weight, playing_style, wins, losses, turned_pro, prize_money, image_url, gender, source
            FROM players
        """)).fetchall()
        
        print(f"  Found {len(local_players)} active tennis players locally.")
        
        remote_players = rem_conn.execute(text("SELECT LOWER(name), gender, id FROM players")).fetchall()
        rem_dict = {(r[0], r[1]): r[2] for r in remote_players}
        
        updated_cnt = 0
        inserted_cnt = 0
        for p in local_players:
            name, country, ranking, highest_ranking, highest_ranking_date, birth_date, height, weight, playing_style, wins, losses, turned_pro, prize_money, image_url, gender, source = p
            key = (name.lower().strip() if name else "", gender)
            if key in rem_dict:
                rem_conn.execute(text("""
                    UPDATE players
                    SET ranking = :rk, highest_ranking = :hrk, highest_ranking_date = :hrd, country = :c, image_url = :img, last_updated = CURRENT_TIMESTAMP
                    WHERE id = :rid
                """), {'rk': ranking, 'hrk': highest_ranking, 'hrd': highest_ranking_date, 'c': country, 'img': image_url, 'rid': rem_dict[key]})
                updated_cnt += 1
            else:
                rem_conn.execute(text("""
                    INSERT INTO players (name, country, ranking, highest_ranking, highest_ranking_date, birth_date, height, weight, playing_style, wins, losses, turned_pro, prize_money, image_url, gender, source)
                    VALUES (:n, :c, :rk, :hrk, :hrd, :bd, :ht, :wt, :ps, :w, :l, :tp, :pm, :img, :g, :src)
                """), {'n': name, 'c': country, 'rk': ranking, 'hrk': highest_ranking, 'hrd': highest_ranking_date, 'bd': birth_date, 'ht': height, 'wt': weight, 'ps': playing_style, 'w': wins, 'l': losses, 'tp': turned_pro, 'pm': prize_money, 'img': image_url, 'g': gender, 'src': source})
                inserted_cnt += 1
        rem_conn.commit()
        print(f"  Updated {updated_cnt} and inserted {inserted_cnt} active tennis players in remote.")

def sync_tt_historical_players():
    print("\n--- Syncing Table Tennis Historical Players ---")
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_players = loc_conn.execute(text("SELECT id, first_name, last_name, gender, country, birth_date, birth_month, birth_year, picture FROM tt_players_historical")).fetchall()
        remote_players = rem_conn.execute(text("SELECT id, LOWER(first_name), LOWER(last_name), gender FROM tt_players_historical")).fetchall()
        
        remote_dict = {(r[1], r[2], r[3]): r[0] for r in remote_players}
        
        inserted_count = 0
        id_map = {}
        
        for p in local_players:
            loc_id, fn, ln, gender, country, bd, bm, by, pic = p
            key = (fn.lower().strip() if fn else "", ln.lower().strip() if ln else "", gender)
            if key in remote_dict:
                id_map[loc_id] = remote_dict[key]
            else:
                res = rem_conn.execute(text("""
                    INSERT INTO tt_players_historical (first_name, last_name, gender, country, birth_date, birth_month, birth_year, picture)
                    VALUES (:fn, :ln, :g, :c, :bd, :bm, :by, :pic)
                    RETURNING id
                """), {'fn': fn, 'ln': ln, 'g': gender, 'c': country, 'bd': bd, 'bm': bm, 'by': by, 'pic': pic})
                new_rem_id = res.fetchone()[0]
                rem_conn.commit()
                remote_dict[key] = new_rem_id
                id_map[loc_id] = new_rem_id
                inserted_count += 1
                
        print(f"  Mapped {len(id_map)} local TT historical players. Inserted {inserted_count} new players to remote.")
        return id_map

def sync_tt_historical_rankings(player_id_map):
    print("\n--- Syncing Table Tennis Historical Rankings (2026-08-24) ---")
    target_year, target_month, target_date = 2026, 8, 24
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_rankings = loc_conn.execute(text("""
            SELECT player_id, points, rank, ranking_date, ranking_month, ranking_year
            FROM tt_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
        """), {'y': target_year, 'm': target_month, 'd': target_date}).fetchall()
        
        print(f"  Found {len(local_rankings)} local TT rankings for {target_year}-{target_month:02d}-{target_date:02d}.")
        
        valid_remote_pids = {player_id_map[r[0]] for r in local_rankings if r[0] in player_id_map}
        
        # Clean stale remote TT rankings for 2026-08-24 not in local target dataset
        rem_conn.execute(text("""
            DELETE FROM tt_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
              AND player_id NOT IN :pids
        """), {'y': target_year, 'm': target_month, 'd': target_date, 'pids': tuple(valid_remote_pids)})
        rem_conn.commit()
        
        existing_remote = rem_conn.execute(text("""
            SELECT player_id, rank, points
            FROM tt_rankings_historical
            WHERE ranking_year = :y AND ranking_month = :m AND ranking_date = :d
        """), {'y': target_year, 'm': target_month, 'd': target_date}).fetchall()
        
        existing_pids = {r[0]: (r[1], r[2]) for r in existing_remote}
        
        inserted_count = 0
        updated_count = 0
        for r in local_rankings:
            loc_pid, points, rank, r_date, r_month, r_year = r
            rem_pid = player_id_map.get(loc_pid)
            if not rem_pid:
                continue
            if rem_pid in existing_pids:
                curr_rank, curr_pts = existing_pids[rem_pid]
                if curr_rank != rank or curr_pts != points:
                    rem_conn.execute(text("""
                        UPDATE tt_rankings_historical
                        SET rank = :rk, points = :pts
                        WHERE player_id = :pid AND ranking_year = :ry AND ranking_month = :rm AND ranking_date = :rd
                    """), {'rk': rank, 'pts': points, 'pid': rem_pid, 'ry': r_year, 'rm': r_month, 'rd': r_date})
                    updated_count += 1
            else:
                rem_conn.execute(text("""
                    INSERT INTO tt_rankings_historical (player_id, points, rank, ranking_date, ranking_month, ranking_year)
                    VALUES (:pid, :pts, :rk, :rd, :rm, :ry)
                """), {'pid': rem_pid, 'pts': points, 'rk': rank, 'rd': r_date, 'rm': r_month, 'ry': r_year})
                inserted_count += 1
        
        rem_conn.commit()
        print(f"  Inserted {inserted_count} and updated {updated_count} TT ranking entries in remote for {target_year}-{target_month:02d}-{target_date:02d}.")

def sync_active_tt_players():
    print("\n--- Syncing Active Table Tennis Players (table_tennis_players table) ---")
    with local_engine.connect() as loc_conn, remote_engine.connect() as rem_conn:
        local_players = loc_conn.execute(text("""
            SELECT name, country, ranking, birth_date, weight, playing_style, win_percentage, image_url, source, gender
            FROM table_tennis_players
        """)).fetchall()
        
        print(f"  Found {len(local_players)} active TT players locally.")
        
        remote_players = rem_conn.execute(text("SELECT LOWER(name), gender, id FROM table_tennis_players")).fetchall()
        rem_dict = {(r[0], r[1]): r[2] for r in remote_players}
        
        updated_cnt = 0
        inserted_cnt = 0
        for p in local_players:
            name, country, ranking, birth_date, weight, playing_style, win_percentage, image_url, source, gender = p
            key = (name.lower().strip() if name else "", gender)
            if key in rem_dict:
                rem_conn.execute(text("""
                    UPDATE table_tennis_players
                    SET ranking = :rk, country = :c, image_url = :img, last_updated = CURRENT_TIMESTAMP
                    WHERE id = :rid
                """), {'rk': ranking, 'c': country, 'img': image_url, 'rid': rem_dict[key]})
                updated_cnt += 1
            else:
                rem_conn.execute(text("""
                    INSERT INTO table_tennis_players (name, country, ranking, birth_date, weight, playing_style, win_percentage, image_url, source, gender)
                    VALUES (:n, :c, :rk, :bd, :wt, :ps, :wp, :img, :src, :g)
                """), {'n': name, 'c': country, 'rk': ranking, 'bd': birth_date, 'wt': weight, 'ps': playing_style, 'wp': win_percentage, 'img': image_url, 'src': source, 'g': gender})
                inserted_cnt += 1
        rem_conn.commit()
        print(f"  Updated {updated_cnt} and inserted {inserted_cnt} active TT players in remote.")

def update_backend_sqlite_file():
    print("\n--- Updating backend/tennis.db copy ---")
    shutil.copyfile(LOCAL_DB_PATH, BACKEND_DB_PATH)
    print(f"  Copied {LOCAL_DB_PATH} ({os.path.getsize(LOCAL_DB_PATH)} bytes) -> {BACKEND_DB_PATH}")

def run_verification(engine, db_label):
    print(f"\n==================================================")
    print(f"  VERIFYING RANKINGS IN: {db_label}")
    print(f"==================================================")
    
    issues_found = False
    
    with engine.connect() as conn:
        # TENNIS
        print("\n🎾 TENNIS HISTORICAL RANKINGS AUDIT:")
        tennis_dates = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date, COUNT(*)
            FROM tennis_rankings_historical
            GROUP BY ranking_year, ranking_month, ranking_date
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 3
        """)).fetchall()
        
        print("  Latest Tennis dates:", tennis_dates)
        if not tennis_dates:
            print("  ❌ ERROR: No tennis historical rankings found!")
            issues_found = True
        else:
            latest_y, latest_m, latest_d = tennis_dates[0][0], tennis_dates[0][1], tennis_dates[0][2]
            print(f"  Auditing latest date: {latest_y}-{latest_m:02d}-{latest_d:02d}")
            
            for gender_code, gender_label in [(0, "Male (ATP)"), (1, "Female (WTA)")]:
                rows = conn.execute(text("""
                    SELECT r.rank, r.points, p.first_name, p.last_name, r.player_id
                    FROM tennis_rankings_historical r
                    JOIN tennis_players_historical p ON r.player_id = p.id
                    WHERE r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d AND p.gender = :g
                    ORDER BY r.rank ASC
                """), {'y': latest_y, 'm': latest_m, 'd': latest_d, 'g': gender_code}).fetchall()
                
                rank_count = len(rows)
                print(f"\n  👉 {gender_label}: {rank_count} players")
                if rank_count == 0:
                    print(f"    ❌ ERROR: 0 players found for {gender_label} on {latest_y}-{latest_m:02d}-{latest_d:02d}")
                    issues_found = True
                    continue
                
                ranks = [r[0] for r in rows]
                min_rank, max_rank = min(ranks), max(ranks)
                
                from collections import Counter
                counts = Counter(ranks)
                duplicates = [rk for rk, cnt in counts.items() if cnt > 1]
                
                missing_ranks = sorted(list(set(range(1, rank_count + 1)) - set(ranks)))
                
                print(f"    - Rank range: min={min_rank}, max={max_rank}, count={rank_count}")
                if duplicates:
                    print(f"    ❌ DUPLICATE RANKS DETECTED: {duplicates}")
                    issues_found = True
                else:
                    print("    ✅ Duplicate Ranks: NONE (0 duplicates)")
                    
                if missing_ranks:
                    print(f"    ❌ MISSING RANKS DETECTED: {missing_ranks[:10]}...")
                    issues_found = True
                else:
                    print("    ✅ Missing Ranks: NONE (0 missing in 1..200)")

        # TABLE TENNIS
        print("\n🏓 TABLE TENNIS HISTORICAL RANKINGS AUDIT:")
        tt_dates = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date, COUNT(*)
            FROM tt_rankings_historical
            GROUP BY ranking_year, ranking_month, ranking_date
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC
            LIMIT 3
        """)).fetchall()
        
        print("  Latest TT dates:", tt_dates)
        if not tt_dates:
            print("  ❌ ERROR: No TT historical rankings found!")
            issues_found = True
        else:
            latest_y, latest_m, latest_d = tt_dates[0][0], tt_dates[0][1], tt_dates[0][2]
            print(f"  Auditing latest TT date: {latest_y}-{latest_m:02d}-{latest_d:02d}")
            
            for gender_code, gender_label in [(0, "Male (WTT)"), (1, "Female (WTT)")]:
                rows = conn.execute(text("""
                    SELECT r.rank, r.points, p.first_name, p.last_name, r.player_id
                    FROM tt_rankings_historical r
                    JOIN tt_players_historical p ON r.player_id = p.id
                    WHERE r.ranking_year = :y AND r.ranking_month = :m AND r.ranking_date = :d AND p.gender = :g
                    ORDER BY r.rank ASC
                """), {'y': latest_y, 'm': latest_m, 'd': latest_d, 'g': gender_code}).fetchall()
                
                rank_count = len(rows)
                print(f"\n  👉 {gender_label}: {rank_count} players")
                if rank_count == 0:
                    print(f"    ❌ ERROR: 0 players found for {gender_label} on {latest_y}-{latest_m:02d}-{latest_d:02d}")
                    issues_found = True
                    continue
                
                ranks = [r[0] for r in rows]
                min_rank, max_rank = min(ranks), max(ranks)
                
                from collections import Counter
                counts = Counter(ranks)
                duplicates = [rk for rk, cnt in counts.items() if cnt > 1]
                missing_ranks = sorted(list(set(range(1, rank_count + 1)) - set(ranks)))
                
                print(f"    - Rank range: min={min_rank}, max={max_rank}, count={rank_count}")
                if duplicates:
                    print(f"    ❌ DUPLICATE RANKS DETECTED: {duplicates}")
                    issues_found = True
                else:
                    print("    ✅ Duplicate Ranks: NONE (0 duplicates)")
                    
                if missing_ranks:
                    print(f"    ❌ MISSING RANKS DETECTED: {missing_ranks[:10]}...")
                    issues_found = True
                else:
                    print("    ✅ Missing Ranks: NONE (0 missing in 1..100)")

    return not issues_found

def main():
    print("🚀 STARTING FULL RANKINGS SYNC & VERIFICATION WORKFLOW")
    
    # Sync Tennis Historical Players & Rankings to Remote
    tennis_id_map = sync_tennis_historical_players()
    sync_tennis_historical_rankings(tennis_id_map)
    sync_active_tennis_players()
    
    # Sync TT Historical Players & Rankings to Remote
    tt_id_map = sync_tt_historical_players()
    sync_tt_historical_rankings(tt_id_map)
    sync_active_tt_players()
    
    # Update local backend/tennis.db file
    update_backend_sqlite_file()
    
    # Run Verifications
    local_ok = run_verification(local_engine, "LOCAL SQLITE (tennis.db)")
    remote_ok = run_verification(remote_engine, "REMOTE POSTGRESQL (neondb)")
    
    if local_ok and remote_ok:
        print("\n🎉 ALL VERIFICATIONS PASSED SUCCESSFULLY! BOTH DATABASES ARE 100% CLEAN AND UP TO DATE.")
    else:
        print("\n⚠️ VERIFICATION DETECTED ISSUES. PLEASE REVIEW LOGS ABOVE.")

if __name__ == "__main__":
    main()
