#!/usr/bin/env python3
"""
High-Speed Vectorized Exporter: Remote Database -> Local Frontend Cache (assets/data/*.json)
Uses batch dictionary lookups in memory to export in < 10 seconds.
"""
import os
import sys
import json
import time
from datetime import date, datetime

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal
from app.models.player import Player, TennisHistoricalPlayer, TennisHistoricalRanking
from app.models.tt_player import TableTennisPlayer, TableTennisHistoricalPlayer, TableTennisHistoricalRanking

OUT_DIR = os.path.join(project_root, 'frontend', 'assets', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def export_all():
    t0 = time.time()
    db = SessionLocal()
    try:
        print("=" * 60)
        print("HIGH-SPEED BATCH EXPORT: DATABASE -> FRONTEND LOCAL CACHE")
        print("=" * 60)

        # -------------------------------------------------------------
        # 1. PRELOAD LEGACY TABLES (FOR RICH STATS: STYLE, HEIGHT, W/L)
        # -------------------------------------------------------------
        print("\n1. Preloading legacy player profiles...")
        legacy_tennis_map = {}
        for p in db.query(Player).all():
            if p.name:
                legacy_tennis_map[p.name.strip().lower()] = p

        legacy_tt_map = {}
        for p in db.query(TableTennisPlayer).all():
            if p.name:
                legacy_tt_map[p.name.strip().lower()] = p
        print(f"   Loaded {len(legacy_tennis_map)} legacy tennis and {len(legacy_tt_map)} legacy TT profiles.")

        # -------------------------------------------------------------
        # 2. TENNIS PLAYERS & HISTORIES
        # -------------------------------------------------------------
        print("\n2. Exporting Tennis Players & Histories...")
        # Preload all historical tennis players
        hp_list = db.query(TennisHistoricalPlayer).all()
        hp_map = {p.id: p for p in hp_list}

        # Preload all tennis rankings
        all_tr = db.query(TennisHistoricalRanking).order_by(
            TennisHistoricalRanking.ranking_year.asc(),
            TennisHistoricalRanking.ranking_month.asc(),
            TennisHistoricalRanking.ranking_date.asc()
        ).all()

        # Build histories and career high records per player
        tennis_histories = {}
        career_high_map = {}
        latest_ranks_m = {}
        latest_ranks_f = {}

        # Latest date snapshot is 2026-09-09
        target_year, target_month, target_date = 2026, 9, 9

        for r in all_tr:
            spid = str(r.player_id)
            if spid not in tennis_histories:
                tennis_histories[spid] = []
            dt_str = f"{r.ranking_year:04d}-{r.ranking_month:02d}-{r.ranking_date:02d}"
            tennis_histories[spid].append({"ranking": r.rank, "date": dt_str})

            # Career high
            if r.rank > 0:
                if r.player_id not in career_high_map or r.rank < career_high_map[r.player_id]["rank"]:
                    career_high_map[r.player_id] = {
                        "rank": r.rank,
                        "date": dt_str
                    }

            # Latest snapshot
            if (r.ranking_year, r.ranking_month, r.ranking_date) == (target_year, target_month, target_date):
                hp = hp_map.get(r.player_id)
                if hp:
                    if hp.gender == 0:
                        if r.rank not in latest_ranks_m:
                            latest_ranks_m[r.rank] = (hp, r.rank)
                    else:
                        if r.rank not in latest_ranks_f:
                            latest_ranks_f[r.rank] = (hp, r.rank)

        # Build tennis player export list
        tennis_players_export = []
        for gender_name, ranks_dict in [("M", latest_ranks_m), ("F", latest_ranks_f)]:
            for rank_num in sorted(ranks_dict.keys()):
                hp, cur_rank = ranks_dict[rank_num]
                full_name = f"{hp.first_name} {hp.last_name}".strip()
                old_p = legacy_tennis_map.get(full_name.lower())

                # Birth date
                b_date = None
                if hp.birth_year and hp.birth_month and hp.birth_date:
                    try:
                        b_date = f"{hp.birth_year:04d}-{hp.birth_month:02d}-{hp.birth_date:02d}"
                    except Exception:
                        pass

                ch = career_high_map.get(hp.id, {})
                career_high_rank = ch.get("rank") or (old_p.highest_ranking if old_p else cur_rank)
                career_high_date = ch.get("date") or (old_p.highest_ranking_date.isoformat() if old_p and old_p.highest_ranking_date else None)

                item = {
                    "id": hp.id,
                    "name": full_name,
                    "country": hp.country,
                    "ranking": cur_rank,
                    "highest_ranking": career_high_rank,
                    "highest_ranking_date": career_high_date,
                    "career_high_rank": career_high_rank,
                    "career_high_date": career_high_date,
                    "birth_date": b_date,
                    "height": old_p.height if old_p else None,
                    "weight": old_p.weight if old_p else None,
                    "playing_style": old_p.playing_style if old_p else "Unknown",
                    "wins": old_p.wins if old_p else 0,
                    "losses": old_p.losses if old_p else 0,
                    "image_url": hp.picture or (old_p.image_url if old_p else None),
                    "gender": gender_name,
                    "source": "ATP Tour" if gender_name == "M" else "WTA Tour Official",
                    "last_updated": hp.last_updated.isoformat() if hp.last_updated else None,
                    "titles": getattr(old_p, 'titles', 0) if old_p else 0,
                    "turned_pro": old_p.turned_pro if old_p else None,
                    "prize_money": hp.prize_money or (old_p.prize_money if old_p else "Unknown"),
                    "external_id": None,
                    "slug": None
                }
                tennis_players_export.append(item)

        with open(os.path.join(OUT_DIR, 'players.json'), 'w', encoding='utf-8') as f:
            json.dump(tennis_players_export, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'players.json')} ({len(tennis_players_export)} players: {len(latest_ranks_m)} Men, {len(latest_ranks_f)} Women)")

        with open(os.path.join(OUT_DIR, 'player_histories.json'), 'w', encoding='utf-8') as f:
            json.dump(tennis_histories, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'player_histories.json')} ({len(tennis_histories)} players)")

        # -------------------------------------------------------------
        # 3. TABLE TENNIS PLAYERS & HISTORIES
        # -------------------------------------------------------------
        print("\n3. Exporting Table Tennis Players & Histories...")
        hp_tt_list = db.query(TableTennisHistoricalPlayer).all()
        hp_tt_map = {p.id: p for p in hp_tt_list}

        all_ttr = db.query(TableTennisHistoricalRanking).order_by(
            TableTennisHistoricalRanking.ranking_year.asc(),
            TableTennisHistoricalRanking.ranking_month.asc(),
            TableTennisHistoricalRanking.ranking_date.asc()
        ).all()

        tt_histories = {}
        career_high_tt_map = {}
        latest_ranks_tt_m = {}
        latest_ranks_tt_f = {}

        if all_ttr:
            latest = all_ttr[-1]
            target_year, target_month, target_date = latest.ranking_year, latest.ranking_month, latest.ranking_date

        for r in all_ttr:
            spid = str(r.player_id)
            if spid not in tt_histories:
                tt_histories[spid] = []
            dt_str = f"{r.ranking_year:04d}-{r.ranking_month:02d}-{r.ranking_date:02d}"
            tt_histories[spid].append({"ranking": r.rank, "date": dt_str})

            if r.rank > 0:
                if r.player_id not in career_high_tt_map or r.rank < career_high_tt_map[r.player_id]["rank"]:
                    career_high_tt_map[r.player_id] = {
                        "rank": r.rank,
                        "date": dt_str
                    }

            if (r.ranking_year, r.ranking_month, r.ranking_date) == (target_year, target_month, target_date):
                hp = hp_tt_map.get(r.player_id)
                if hp:
                    if hp.gender == 0:
                        if r.rank not in latest_ranks_tt_m:
                            latest_ranks_tt_m[r.rank] = (hp, r.rank)
                    else:
                        if r.rank not in latest_ranks_tt_f:
                            latest_ranks_tt_f[r.rank] = (hp, r.rank)

        tt_players_export = []
        for gender_name, ranks_dict in [("M", latest_ranks_tt_m), ("F", latest_ranks_tt_f)]:
            for rank_num in sorted(ranks_dict.keys()):
                hp, cur_rank = ranks_dict[rank_num]
                full_name = f"{hp.first_name} {hp.last_name}".strip()
                old_p = legacy_tt_map.get(full_name.lower())

                b_date = None
                if hp.birth_year and hp.birth_month and hp.birth_date:
                    try:
                        b_date = f"{hp.birth_year:04d}-{hp.birth_month:02d}-{hp.birth_date:02d}"
                    except Exception:
                        pass

                ch = career_high_tt_map.get(hp.id, {})
                career_high_rank = ch.get("rank") or cur_rank

                item = {
                    "id": hp.id,
                    "name": full_name,
                    "country": hp.country,
                    "ranking": cur_rank,
                    "career_high_rank": career_high_rank,
                    "birth_date": b_date,
                    "weight": old_p.weight if old_p else None,
                    "playing_style": old_p.playing_style if old_p else "Unknown",
                    "win_percentage": old_p.win_percentage if old_p else None,
                    "image_url": hp.picture or (old_p.image_url if old_p else None),
                    "source": "WTT Official",
                    "gender": gender_name,
                    "last_updated": hp.last_updated.isoformat() if hp.last_updated else None
                }
                tt_players_export.append(item)

        with open(os.path.join(OUT_DIR, 'tt_players.json'), 'w', encoding='utf-8') as f:
            json.dump(tt_players_export, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'tt_players.json')} ({len(tt_players_export)} TT players: {len(latest_ranks_tt_m)} Men, {len(latest_ranks_tt_f)} Women)")

        with open(os.path.join(OUT_DIR, 'tt_player_histories.json'), 'w', encoding='utf-8') as f:
            json.dump(tt_histories, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'tt_player_histories.json')} ({len(tt_histories)} TT players)")

        print("\n" + "=" * 60)
        print(f"ALL LOCAL ASSETS EXPORTED IN {time.time()-t0:.2f} SECONDS!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == '__main__':
    export_all()
