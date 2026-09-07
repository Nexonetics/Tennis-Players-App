import os
import sys
import json
from sqlalchemy import create_engine, text

project_root = "/home/nexonetics/nexonetics/tennis_app"
out_dir = os.path.join(project_root, "frontend", "assets", "data")
os.makedirs(out_dir, exist_ok=True)

engine = create_engine(f"sqlite:///{os.path.join(project_root, 'tennis.db')}")

with engine.connect() as conn:
    print("Exporting Tennis players.json...")
    res = conn.execute(text("SELECT * FROM players ORDER BY ranking ASC NULLS LAST"))
    t_players = [dict(r._mapping) for r in res]
    with open(os.path.join(out_dir, "players.json"), "w", encoding="utf-8") as f:
        json.dump(t_players, f, ensure_ascii=False, indent=2)

    print("Exporting Table Tennis tt_players.json...")
    res = conn.execute(text("SELECT * FROM table_tennis_players ORDER BY ranking ASC NULLS LAST"))
    tt_players = [dict(r._mapping) for r in res]
    with open(os.path.join(out_dir, "tt_players.json"), "w", encoding="utf-8") as f:
        json.dump(tt_players, f, ensure_ascii=False, indent=2)

    print("Exporting Football football_national_teams.json...")
    res = conn.execute(text("SELECT * FROM football_national_teams ORDER BY category ASC, ranking ASC NULLS LAST"))
    fb_teams = [dict(r._mapping) for r in res]
    with open(os.path.join(out_dir, "football_national_teams.json"), "w", encoding="utf-8") as f:
        json.dump(fb_teams, f, ensure_ascii=False, indent=2)

    print("Exporting Basketball basketball_national_teams.json...")
    res = conn.execute(text("SELECT * FROM basketball_national_teams ORDER BY category ASC, ranking ASC NULLS LAST"))
    bb_teams = [dict(r._mapping) for r in res]
    with open(os.path.join(out_dir, "basketball_national_teams.json"), "w", encoding="utf-8") as f:
        json.dump(bb_teams, f, ensure_ascii=False, indent=2)

    print("Exporting Basketball team histories...")
    hist_res = conn.execute(text("SELECT team_id, rank as ranking, ranking_date, ranking_month, ranking_year FROM basketball_rankings_historical ORDER BY team_id ASC, ranking_year ASC, ranking_month ASC, ranking_date ASC"))
    bb_histories = {}
    for r in hist_res:
        tid = str(r[0])
        if tid not in bb_histories: bb_histories[tid] = []
        bb_histories[tid].append({
            "ranking": r[1],
            "ranking_date": r[2],
            "ranking_month": r[3],
            "ranking_year": r[4]
        })
    with open(os.path.join(out_dir, "basketball_team_histories.json"), "w", encoding="utf-8") as f:
        json.dump(bb_histories, f, ensure_ascii=False, indent=2)

    print("Exporting Football team histories...")
    hist_res = conn.execute(text("SELECT team_id, rank as ranking, ranking_date, ranking_month, ranking_year FROM football_rankings_historical ORDER BY team_id ASC, ranking_year ASC, ranking_month ASC, ranking_date ASC"))
    fb_histories = {}
    for r in hist_res:
        tid = str(r[0])
        if tid not in fb_histories: fb_histories[tid] = []
        fb_histories[tid].append({
            "ranking": r[1],
            "ranking_date": r[2],
            "ranking_month": r[3],
            "ranking_year": r[4]
        })
    with open(os.path.join(out_dir, "football_team_histories.json"), "w", encoding="utf-8") as f:
        json.dump(fb_histories, f, ensure_ascii=False, indent=2)

print("✅ ALL ASSET JSON FILES EXPORTED DIRECTLY AND INSTANTLY!")
