#!/usr/bin/env python3
"""
Sync offline ranking histories and career-high stats for Tennis and Table Tennis JSON assets.
Maps player IDs in frontend JSON assets to their historical ranking records in tennis.db.
"""
import os
import json
import sqlite3
from datetime import date

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "tennis.db")
ASSETS_DIR = os.path.join(PROJECT_ROOT, "frontend", "assets", "data")

def sync_table_tennis(conn):
    print("--- Syncing Table Tennis histories & career high stats ---")
    tt_players_path = os.path.join(ASSETS_DIR, "tt_players.json")
    tt_histories_path = os.path.join(ASSETS_DIR, "tt_player_histories.json")

    with open(tt_players_path, "r", encoding="utf-8") as f:
        tt_players = json.load(f)

    cursor = conn.cursor()
    updated_histories = {}
    history_count = 0
    career_high_count = 0

    for p in tt_players:
        p_id = str(p["id"])
        name = p["name"].strip()
        gender_val = 0 if p.get("gender") == "M" else 1

        # Search by name and gender
        cursor.execute("""
            SELECT id FROM tt_players_historical 
            WHERE (LOWER(first_name || ' ' || last_name) = ? OR LOWER(last_name || ' ' || first_name) = ?)
            AND gender = ?
        """, (name.lower(), name.lower(), gender_val))
        row = cursor.fetchone()

        if not row:
            cursor.execute("""
                SELECT id FROM tt_players_historical 
                WHERE LOWER(first_name || ' ' || last_name) = ? OR LOWER(last_name || ' ' || first_name) = ?
            """, (name.lower(), name.lower()))
            row = cursor.fetchone()

        if row:
            db_pid = row[0]
            cursor.execute("""
                SELECT rank, ranking_year, ranking_month, ranking_date
                FROM tt_rankings_historical
                WHERE player_id = ? AND rank > 0
                ORDER BY ranking_year ASC, ranking_month ASC, ranking_date ASC
            """, (db_pid,))
            r_rows = cursor.fetchall()

            if r_rows:
                h_list = []
                min_rank = 999999
                min_rank_date = None

                for r in r_rows:
                    rank_val = r[0]
                    try:
                        d_str = date(r[1], r[2], r[3]).isoformat()
                    except ValueError:
                        continue
                    h_list.append({"ranking": rank_val, "date": d_str})
                    if rank_val < min_rank:
                        min_rank = rank_val
                        min_rank_date = d_str

                if h_list:
                    if len(h_list) <= 25:
                        sampled = h_list
                    else:
                        n = len(h_list)
                        sampled = [h_list[int(i * (n - 1) / 24)] for i in range(25)]

                    updated_histories[p_id] = sampled
                    history_count += 1

                    p["career_high_rank"] = min_rank
                    p["career_high_date"] = min_rank_date
                    p["highest_ranking"] = min_rank
                    p["highest_ranking_date"] = min_rank_date
                    career_high_count += 1

    with open(tt_players_path, "w", encoding="utf-8") as f:
        json.dump(tt_players, f, ensure_ascii=False, indent=2)
    print(f"Updated {tt_players_path} with career highs for {career_high_count} players.")

    with open(tt_histories_path, "w", encoding="utf-8") as f:
        json.dump(updated_histories, f, ensure_ascii=False, indent=2)
    print(f"Updated {tt_histories_path} with histories for {history_count} players.")


def sync_tennis(conn):
    print("--- Syncing Tennis histories & career high stats ---")
    players_path = os.path.join(ASSETS_DIR, "players.json")
    histories_path = os.path.join(ASSETS_DIR, "player_histories.json")

    with open(players_path, "r", encoding="utf-8") as f:
        players = json.load(f)

    cursor = conn.cursor()
    updated_histories = {}
    history_count = 0
    career_high_count = 0

    for p in players:
        p_id = str(p["id"])
        name = p["name"].strip()
        gender_val = 0 if p.get("gender") == "M" else 1

        cursor.execute("""
            SELECT id FROM tennis_players_historical 
            WHERE (LOWER(first_name || ' ' || last_name) = ? OR LOWER(last_name || ' ' || first_name) = ?)
            AND gender = ?
        """, (name.lower(), name.lower(), gender_val))
        row = cursor.fetchone()

        if not row:
            cursor.execute("""
                SELECT id FROM tennis_players_historical 
                WHERE LOWER(first_name || ' ' || last_name) = ? OR LOWER(last_name || ' ' || first_name) = ?
            """, (name.lower(), name.lower()))
            row = cursor.fetchone()

        if row:
            db_pid = row[0]
            cursor.execute("""
                SELECT rank, ranking_year, ranking_month, ranking_date
                FROM tennis_rankings_historical
                WHERE player_id = ? AND rank > 0
                ORDER BY ranking_year ASC, ranking_month ASC, ranking_date ASC
            """, (db_pid,))
            r_rows = cursor.fetchall()

            if r_rows:
                h_list = []
                min_rank = 999999
                min_rank_date = None

                for r in r_rows:
                    rank_val = r[0]
                    try:
                        d_str = date(r[1], r[2], r[3]).isoformat()
                    except ValueError:
                        continue
                    h_list.append({"ranking": rank_val, "date": d_str})
                    if rank_val < min_rank:
                        min_rank = rank_val
                        min_rank_date = d_str

                if h_list:
                    if len(h_list) <= 25:
                        sampled = h_list
                    else:
                        n = len(h_list)
                        sampled = [h_list[int(i * (n - 1) / 24)] for i in range(25)]

                    updated_histories[p_id] = sampled
                    history_count += 1

                    p["career_high_rank"] = min_rank
                    p["career_high_date"] = min_rank_date
                    p["highest_ranking"] = min_rank
                    p["highest_ranking_date"] = min_rank_date
                    career_high_count += 1

    with open(players_path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    print(f"Updated {players_path} with career highs for {career_high_count} players.")

    with open(histories_path, "w", encoding="utf-8") as f:
        json.dump(updated_histories, f, ensure_ascii=False, indent=2)
    print(f"Updated {histories_path} with histories for {history_count} players.")


def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    sync_table_tennis(conn)
    sync_tennis(conn)
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
