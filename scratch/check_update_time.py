
import os
import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    query = text("SELECT name, last_updated FROM football_national_teams WHERE name IN ('Brazil', 'Argentina') AND category = 'men'")
    result = conn.execute(query)
    
    for row in result:
        print(f"Team: {row[0]} | Last Updated: {row[1]}")
