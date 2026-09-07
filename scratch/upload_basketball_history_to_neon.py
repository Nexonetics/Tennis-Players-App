import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import shutil

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

load_dotenv(os.path.join(project_root, 'backend', '.env'))

REMOTE_DB_URL = "postgresql://neondb_owner:npg_48uqktSjVLpR@ep-damp-resonance-anwqigab.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&hostaddr=35.173.20.131"

from sqlalchemy import create_engine
from app.db.session import Base
from app.models.basketball_national_team import (
    BasketballNationalTeam,
    BasketballHistoricalTeam,
    BasketballHistoricalRanking
)

print("1. Copying local SQLite DB to backend/tennis.db...")
sqlite_db = os.path.join(project_root, 'tennis.db')
backend_db = os.path.join(project_root, 'backend', 'tennis.db')
shutil.copyfile(sqlite_db, backend_db)
print(f"   Copied {sqlite_db} ({os.path.getsize(sqlite_db)} bytes) -> {backend_db}")

print("\n2. Creating Basketball tables in Remote Neon PostgreSQL...")
engine = create_engine(REMOTE_DB_URL)
Base.metadata.create_all(bind=engine)
engine.dispose()
print("   Basketball tables created successfully on Neon!")

conn_sqlite = sqlite3.connect(sqlite_db)
cur_sqlite = conn_sqlite.cursor()

conn_pg = psycopg2.connect(REMOTE_DB_URL)
cur_pg = conn_pg.cursor()

print("\n3. Uploading Basketball National Teams...")
teams_active = cur_sqlite.execute("""
    SELECT id, name, country, confederation, founded_year, stadium, nickname, image_url, website, description, ranking, category, total_trophies, world_cup_titles, manager, captain, main_rivals, honors_json
    FROM basketball_national_teams
""").fetchall()

print(f"   Found {len(teams_active)} active national teams in local SQLite.")

cur_pg.execute("TRUNCATE TABLE basketball_national_teams CASCADE;")
conn_pg.commit()

execute_values(
    cur_pg,
    """
    INSERT INTO basketball_national_teams (id, name, country, confederation, founded_year, stadium, nickname, image_url, website, description, ranking, category, total_trophies, world_cup_titles, manager, captain, main_rivals, honors_json)
    VALUES %s;
    """,
    teams_active,
    page_size=1000
)
conn_pg.commit()
print("   Active Basketball National Teams uploaded to Neon!")

print("\n4. Uploading Basketball Historical Teams & Rankings...")
cur_pg.execute("TRUNCATE TABLE basketball_rankings_historical, basketball_teams_historical RESTART IDENTITY CASCADE;")
conn_pg.commit()

teams_hist = cur_sqlite.execute("SELECT id, name, country, confederation, category, picture FROM basketball_teams_historical").fetchall()
print(f"   Uploading {len(teams_hist)} historical teams...")

execute_values(
    cur_pg,
    """
    INSERT INTO basketball_teams_historical (id, name, country, confederation, category, picture)
    VALUES %s;
    """,
    teams_hist,
    page_size=1000
)
conn_pg.commit()

rankings = cur_sqlite.execute("SELECT id, team_id, points, rank, ranking_date, ranking_month, ranking_year FROM basketball_rankings_historical").fetchall()
print(f"   Uploading {len(rankings)} historical ranking checkpoints...")

execute_values(
    cur_pg,
    """
    INSERT INTO basketball_rankings_historical (id, team_id, points, rank, ranking_date, ranking_month, ranking_year)
    VALUES %s
    ON CONFLICT (team_id, ranking_year, ranking_month, ranking_date) DO UPDATE
    SET points = EXCLUDED.points, rank = EXCLUDED.rank;
    """,
    rankings,
    page_size=5000
)
conn_pg.commit()
print("   Rankings uploaded successfully to Neon!")

cur_pg.execute("SELECT COUNT(*) FROM basketball_national_teams;")
cnt_active = cur_pg.fetchone()[0]
cur_pg.execute("SELECT COUNT(*) FROM basketball_teams_historical;")
cnt_hist_teams = cur_pg.fetchone()[0]
cur_pg.execute("SELECT COUNT(*) FROM basketball_rankings_historical;")
cnt_hist_rankings = cur_pg.fetchone()[0]

print(f"\n==================================================")
print(f"  NEON REMOTE DB VERIFICATION RESULTS")
print(f"==================================================")
print(f"  basketball_national_teams count: {cnt_active}")
print(f"  basketball_teams_historical count: {cnt_hist_teams}")
print(f"  basketball_rankings_historical count: {cnt_hist_rankings}")

cur_pg.close()
conn_pg.close()
conn_sqlite.close()
