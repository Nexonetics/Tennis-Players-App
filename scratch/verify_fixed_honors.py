
import os
import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    query = text("SELECT name, world_cup_titles, honors_json FROM football_national_teams WHERE name IN ('Brazil', 'Argentina', 'Germany', 'Spain', 'France', 'Italy') AND category = 'men'")
    result = conn.execute(query)
    
    print(f"{'Team':20} | {'WC':2} | {'Honors'}")
    print("-" * 60)
    for row in result:
        print(f"{row[0]:20} | {row[1]:2} | {row[2]}")
