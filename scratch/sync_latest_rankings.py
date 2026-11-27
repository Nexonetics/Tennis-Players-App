import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

load_dotenv(os.path.join(project_root, 'backend', '.env'))

REMOTE_DB_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
def sync_sqlite():
    print("=== SYNCHRONIZING LOCAL SQLITE (tennis.db) ===")
    conn = sqlite3.connect(os.path.join(project_root, 'tennis.db'))
    cur = conn.cursor()
    
    for category in ['men', 'women']:
        cur.execute("""
            SELECT r.ranking_year, r.ranking_month, r.ranking_date
            FROM football_rankings_historical r
            JOIN football_teams_historical t ON r.team_id = t.id
            WHERE t.category = ?
            ORDER BY r.ranking_year DESC, r.ranking_month DESC, r.ranking_date DESC
            LIMIT 1;
        """, (category,))
        row = cur.fetchone()
        if not row: continue
        y, m, d = row
        
        cur.execute("""
            SELECT LOWER(t.name), r.rank
            FROM football_rankings_historical r
            JOIN football_teams_historical t ON r.team_id = t.id
            WHERE t.category = ? AND r.ranking_year = ? AND r.ranking_month = ? AND r.ranking_date = ?;
        """, (category, y, m, d))
        latest_ranks = cur.fetchall()
        
        for name_lower, rank in latest_ranks:
            cur.execute("""
                UPDATE football_national_teams
                SET ranking = ?
                WHERE LOWER(name) = ? AND category = ?;
            """, (rank, name_lower, category))
            
    conn.commit()
    
    top_men = cur.execute("SELECT ranking, name FROM football_national_teams WHERE category='men' ORDER BY ranking ASC LIMIT 10").fetchall()
    print("\nLocal SQLite Top 10 Men's National Teams:")
    for r in top_men:
        print(f"  #{r[0]} {r[1]}")
    conn.close()


def sync_postgres():
    print("\n=== SYNCHRONIZING NEON POSTGRESQL (Fast Bulk Update) ===")
    conn = psycopg2.connect(REMOTE_DB_URL)
    cur = conn.cursor()
    
    for category in ['men', 'women']:
        cur.execute("""
            SELECT r.ranking_year, r.ranking_month, r.ranking_date
            FROM football_rankings_historical r
            JOIN football_teams_historical t ON r.team_id = t.id
            WHERE t.category = %s
            ORDER BY r.ranking_year DESC, r.ranking_month DESC, r.ranking_date DESC
            LIMIT 1;
        """, (category,))
        row = cur.fetchone()
        if not row: continue
        y, m, d = row
        print(f"Latest release date for {category} on Neon: {y}-{m:02d}-{d:02d}")
        
        cur.execute("""
            UPDATE football_national_teams fnt
            SET ranking = r.rank
            FROM football_rankings_historical r
            JOIN football_teams_historical t ON r.team_id = t.id
            WHERE LOWER(fnt.name) = LOWER(t.name)
              AND fnt.category = %s
              AND t.category = %s
              AND r.ranking_year = %s
              AND r.ranking_month = %s
              AND r.ranking_date = %s;
        """, (category, category, y, m, d))
        print(f"Updated {cur.rowcount} {category} team rankings on Neon in 1 query!")
        
    conn.commit()
    
    cur.execute("SELECT ranking, name FROM football_national_teams WHERE category='men' ORDER BY ranking ASC LIMIT 10")
    top_men = cur.fetchall()
    print("\nNeon PostgreSQL Top 10 Men's National Teams:")
    for r in top_men:
        print(f"  #{r[0]} {r[1]}")
    conn.close()


def main():
    sync_sqlite()
    sync_postgres()
    print("\n=== RE-EXPORTING LOCAL JSON ASSETS ===")
    from scratch.export_football_local_assets import export_local
    export_local()
    print("\nSync completed successfully!")

if __name__ == "__main__":
    main()
