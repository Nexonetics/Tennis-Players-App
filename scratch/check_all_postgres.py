import os
from sqlalchemy import create_engine, text

db_url = os.environ["DATABASE_URL"]  # from .env / environment; never hardcode credentials
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- TENNIS ---")
    
    # 1. Historical Rankings (tennis_rankings_historical)
    res = conn.execute(text("""
        SELECT ranking_year, ranking_month, ranking_date, COUNT(*) 
        FROM tennis_rankings_historical 
        GROUP BY ranking_year, ranking_month, ranking_date
        ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
        LIMIT 5
    """)).fetchall()
    print("tennis_rankings_historical (Latest 5 dates):")
    for r in res:
        print(f"  - Date: {r[0]}-{r[1]:02d}-{r[2]:02d} (Count: {r[3]})")

    # By Gender in tennis_rankings_historical
    res_gender = conn.execute(text("""
        SELECT p.gender, r.ranking_year, r.ranking_month, r.ranking_date, COUNT(*)
        FROM tennis_rankings_historical r
        JOIN tennis_players_historical p ON r.player_id = p.id
        GROUP BY p.gender, r.ranking_year, r.ranking_month, r.ranking_date
        ORDER BY r.ranking_year DESC, r.ranking_month DESC, r.ranking_date DESC
    """)).fetchall()
    print("tennis_rankings_historical by Gender (gender: 0=Male, 1=Female):")
    seen_genders = set()
    for rg in res_gender:
        gender_str = "Male (ATP)" if rg[0] == 0 else "Female (WTA)"
        if rg[0] not in seen_genders:
            print(f"  - {gender_str} Latest: {rg[1]}-{rg[2]:02d}-{rg[3]:02d} (Count: {rg[4]})")
            seen_genders.add(rg[0])

    # 2. Active Players (players table)
    res_players = conn.execute(text("""
        SELECT gender, MAX(highest_ranking_date), COUNT(*)
        FROM players
        GROUP BY gender
    """)).fetchall()
    print("players table (Active / highest_ranking_date):")
    for rp in res_players:
        print(f"  - Gender: {rp[0]} | Max highest_ranking_date: {rp[1]} (Count: {rp[2]})")

    res_players_last_updated = conn.execute(text("""
        SELECT MAX(last_updated) FROM players
    """)).fetchone()
    print(f"players table max last_updated: {res_players_last_updated[0]}")

    print("\n--- TABLE TENNIS ---")
    
    # 1. Historical Rankings (tt_rankings_historical)
    res_tt = conn.execute(text("""
        SELECT ranking_year, ranking_month, ranking_date, COUNT(*) 
        FROM tt_rankings_historical 
        GROUP BY ranking_year, ranking_month, ranking_date
        ORDER BY ranking_year DESC, ranking_month DESC, ranking_date DESC 
        LIMIT 5
    """)).fetchall()
    print("tt_rankings_historical (Latest 5 dates):")
    for r in res_tt:
        print(f"  - Date: {r[0]}-{r[1]:02d}-{r[2]:02d} (Count: {r[3]})")

    # By Gender in tt_rankings_historical
    res_tt_gender = conn.execute(text("""
        SELECT p.gender, r.ranking_year, r.ranking_month, r.ranking_date, COUNT(*)
        FROM tt_rankings_historical r
        JOIN tt_players_historical p ON r.player_id = p.id
        GROUP BY p.gender, r.ranking_year, r.ranking_month, r.ranking_date
        ORDER BY r.ranking_year DESC, r.ranking_month DESC, r.ranking_date DESC
    """)).fetchall()
    print("tt_rankings_historical by Gender (gender: 0=Male, 1=Female):")
    seen_tt_genders = set()
    for rg in res_tt_gender:
        gender_str = "Male" if rg[0] == 0 else "Female"
        if rg[0] not in seen_tt_genders:
            print(f"  - {gender_str} Latest: {rg[1]}-{rg[2]:02d}-{rg[3]:02d} (Count: {rg[4]})")
            seen_tt_genders.add(rg[0])

    # 2. Active Players (table_tennis_players table)
    res_tt_players = conn.execute(text("""
        SELECT gender, MAX(birth_date), COUNT(*)
        FROM table_tennis_players
        GROUP BY gender
    """)).fetchall()
    print("table_tennis_players table:")
    for rp in res_tt_players:
        print(f"  - Gender: {rp[0]} (Count: {rp[2]})")

    res_tt_players_last_updated = conn.execute(text("""
        SELECT MAX(last_updated) FROM table_tennis_players
    """)).fetchone()
    print(f"table_tennis_players table max last_updated: {res_tt_players_last_updated[0]}")
