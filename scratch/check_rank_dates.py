import os
import json
import sqlite3
from datetime import date
from sqlalchemy import create_engine, text

# Load remote DB URL
db_url = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
sqlite_path = "/home/nexonetics/nexonetics/tennis_app/tennis.db"

print("--- POSTGRESQL DB (REMOTE) ---")
try:
    pg_engine = create_engine(db_url)
    with pg_engine.connect() as conn:
        # Tennis
        res = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date 
            FROM tennis_rankings_historical 
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
            LIMIT 1
        """)).fetchone()
        if res:
            print(f"Tennis (Postgres): {res[0]}-{res[1]:02d}-{res[2]:02d}")
        else:
            print("Tennis (Postgres): No data")

        # Table Tennis
        res_tt = conn.execute(text("""
            SELECT ranking_year, ranking_month, ranking_date 
            FROM tt_rankings_historical 
            ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
            LIMIT 1
        """)).fetchone()
        if res_tt:
            print(f"Table Tennis (Postgres): {res_tt[0]}-{res_tt[1]:02d}-{res_tt[2]:02d}")
        else:
            print("Table Tennis (Postgres): No data")
except Exception as e:
    print(f"Error querying Postgres: {e}")

print("\n--- SQLITE DB (LOCAL) ---")
if os.path.exists(sqlite_path):
    try:
        sqlite_conn = sqlite3.connect(sqlite_path)
        cursor = sqlite_conn.cursor()
        
        # Tennis
        try:
            cursor.execute("""
                SELECT ranking_year, ranking_month, ranking_date 
                FROM tennis_rankings_historical 
                ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
                LIMIT 1
            """)
            res = cursor.fetchone()
            if res:
                print(f"Tennis (SQLite): {res[0]}-{res[1]:02d}-{res[2]:02d}")
            else:
                print("Tennis (SQLite): No rankings found in tennis_rankings_historical")
        except sqlite3.OperationalError as e:
            print(f"Tennis (SQLite) table check error: {e}")

        # Table Tennis
        try:
            cursor.execute("""
                SELECT ranking_year, ranking_month, ranking_date 
                FROM tt_rankings_historical 
                ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
                LIMIT 1
            """)
            res_tt = cursor.fetchone()
            if res_tt:
                print(f"Table Tennis (SQLite): {res_tt[0]}-{res_tt[1]:02d}-{res_tt[2]:02d}")
            else:
                print("Table Tennis (SQLite): No rankings found in tt_rankings_historical")
        except sqlite3.OperationalError as e:
            print(f"Table Tennis (SQLite) table check error: {e}")

        sqlite_conn.close()
    except Exception as e:
        print(f"Error querying SQLite: {e}")
else:
    print(f"SQLite file does not exist at: {sqlite_path}")

print("\n--- JSON CACHE FILES (LOCAL) ---")
# Let's inspect frontend/assets/data/players.json
players_json_path = "/home/nexonetics/nexonetics/tennis_app/frontend/assets/data/players.json"
if os.path.exists(players_json_path):
    try:
        with open(players_json_path, 'r') as f:
            players = json.load(f)
        # Find maximum career_high_date or any ranking date or highest_ranking_date or last_updated in players.json
        # Wait, the history is in player_histories.json
        print(f"players.json loaded ({len(players)} items)")
        # Let's print the first item fields
        if players:
            print(f"Sample keys: {list(players[0].keys())}")
            # Get unique values of highest_ranking_date/career_high_date/last_updated
            dates = [p.get('career_high_date') for p in players if p.get('career_high_date')]
            if dates:
                print(f"Latest career_high_date in players.json: {max(dates)}")
    except Exception as e:
        print(f"Error parsing players.json: {e}")

# Let's inspect frontend/assets/data/player_histories.json
player_histories_json_path = "/home/nexonetics/nexonetics/tennis_app/frontend/assets/data/player_histories.json"
if os.path.exists(player_histories_json_path):
    try:
        with open(player_histories_json_path, 'r') as f:
            histories = json.load(f)
        print(f"player_histories.json loaded ({len(histories)} items)")
        # Find latest date across all histories
        all_dates = []
        for pid, h_list in histories.items():
            for h in h_list:
                if 'date' in h:
                    all_dates.append(h['date'])
        if all_dates:
            print(f"Latest rank date in player_histories.json: {max(all_dates)}")
    except Exception as e:
        print(f"Error parsing player_histories.json: {e}")

# Let's inspect frontend/assets/data/tt_players.json
tt_players_json_path = "/home/nexonetics/nexonetics/tennis_app/frontend/assets/data/tt_players.json"
if os.path.exists(tt_players_json_path):
    try:
        with open(tt_players_json_path, 'r') as f:
            tt_players = json.load(f)
        print(f"tt_players.json loaded ({len(tt_players)} items)")
        if tt_players:
            print(f"Sample keys: {list(tt_players[0].keys())}")
            # Get latest career_high_date
            dates = [p.get('career_high_date') for p in tt_players if p.get('career_high_date')]
            if dates:
                print(f"Latest career_high_date in tt_players.json: {max(dates)}")
    except Exception as e:
        print(f"Error parsing tt_players.json: {e}")

# Let's inspect frontend/assets/data/tt_player_histories.json
tt_player_histories_json_path = "/home/nexonetics/nexonetics/tennis_app/frontend/assets/data/tt_player_histories.json"
if os.path.exists(tt_player_histories_json_path):
    try:
        with open(tt_player_histories_json_path, 'r') as f:
            tt_histories = json.load(f)
        print(f"tt_player_histories.json loaded ({len(tt_histories)} items)")
        all_dates = []
        for pid, h_list in tt_histories.items():
            for h in h_list:
                if 'date' in h:
                    all_dates.append(h['date'])
        if all_dates:
            print(f"Latest rank date in tt_player_histories.json: {max(all_dates)}")
    except Exception as e:
        print(f"Error parsing tt_player_histories.json: {e}")
