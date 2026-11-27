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
from sqlalchemy import create_engine
from app.db.session import Base
from app.models.football_national_team import (
    FootballNationalTeam,
    FootballHistoricalTeam,
    FootballHistoricalRanking
)

print("Creating tables in Neon PostgreSQL...")
engine = create_engine(REMOTE_DB_URL)
Base.metadata.create_all(bind=engine)
engine.dispose()
print("Tables created successfully on Neon!")

sqlite_db = os.path.join(project_root, 'tennis.db')
conn_sqlite = sqlite3.connect(sqlite_db)
cur_sqlite = conn_sqlite.cursor()

conn_pg = psycopg2.connect(REMOTE_DB_URL)
cur_pg = conn_pg.cursor()

print("Truncating target tables on Neon...")
cur_pg.execute("TRUNCATE TABLE football_rankings_historical, football_teams_historical RESTART IDENTITY CASCADE;")
conn_pg.commit()

teams = cur_sqlite.execute("SELECT id, name, country, confederation, category, picture FROM football_teams_historical").fetchall()
print(f"Uploading {len(teams)} historical teams...")

team_rows = [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in teams]
execute_values(
    cur_pg,
    """
    INSERT INTO football_teams_historical (id, name, country, confederation, category, picture)
    VALUES %s;
    """,
    team_rows,
    page_size=1000
)
conn_pg.commit()
print("Teams uploaded successfully!")

rankings = cur_sqlite.execute("SELECT id, team_id, points, rank, ranking_date, ranking_month, ranking_year FROM football_rankings_historical").fetchall()
print(f"Uploading {len(rankings)} historical ranking checkpoints...")

ranking_rows = [(r[0], r[1], r[2], r[3], r[4], r[5], r[6]) for r in rankings]
execute_values(
    cur_pg,
    """
    INSERT INTO football_rankings_historical (id, team_id, points, rank, ranking_date, ranking_month, ranking_year)
    VALUES %s
    ON CONFLICT (team_id, ranking_year, ranking_month, ranking_date) DO UPDATE
    SET points = EXCLUDED.points, rank = EXCLUDED.rank;
    """,
    ranking_rows,
    page_size=5000
)
conn_pg.commit()
print("Rankings uploaded successfully!")

cur_pg.execute("SELECT COUNT(*) FROM football_teams_historical;")
t_cnt = cur_pg.fetchone()[0]
cur_pg.execute("SELECT COUNT(*) FROM football_rankings_historical;")
r_cnt = cur_pg.fetchone()[0]

print(f"\n--- Neon Database Verification ---")
print(f"  football_teams_historical count: {t_cnt}")
print(f"  football_rankings_historical count: {r_cnt}")

cur_pg.close()
conn_pg.close()
conn_sqlite.close()
