
import os
import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    query = text("SELECT name, world_cup_titles, honors_json FROM football_national_teams WHERE name IN ('Brazil', 'Argentina', 'Germany', 'Spain')")
    result = conn.execute(query)
    
    for row in result:
        print(f"Team: {row[0]}")
        print(f"  WC: {row[1]}")
        print(f"  Honors (raw): {row[2]}")
        print(f"  Honors type: {type(row[2])}")
