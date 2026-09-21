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
from app.models.football_national_team import FootballNationalTeam, FootballHistoricalTeam, FootballHistoricalRanking
from app.models.basketball_national_team import BasketballNationalTeam, BasketballHistoricalTeam, BasketballHistoricalRanking
from app.models.basketball_club import BasketballClub

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

        # Dynamically detect the latest ranking date from DB
        target_year, target_month, target_date = 1970, 1, 1
        if all_tr:
            latest_tr = all_tr[-1]
            target_year, target_month, target_date = latest_tr.ranking_year, latest_tr.ranking_month, latest_tr.ranking_date
            print(f"   Tennis latest date detected: {target_year}-{target_month:02d}-{target_date:02d}")

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
                ch_rank = ch.get("rank")
                old_highest = old_p.highest_ranking if (old_p and old_p.highest_ranking and old_p.highest_ranking > 0) else None

                if ch_rank and old_highest:
                    if old_highest < ch_rank:
                        career_high_rank = old_highest
                        career_high_date = old_p.highest_ranking_date.isoformat() if (old_p and old_p.highest_ranking_date) else ch.get("date")
                    else:
                        career_high_rank = ch_rank
                        career_high_date = ch.get("date")
                elif ch_rank:
                    career_high_rank = ch_rank
                    career_high_date = ch.get("date")
                elif old_highest:
                    career_high_rank = old_highest
                    career_high_date = old_p.highest_ranking_date.isoformat() if (old_p and old_p.highest_ranking_date) else None
                else:
                    career_high_rank = cur_rank
                    career_high_date = None

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
                career_high_date = ch.get("date")

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

        # -------------------------------------------------------------
        # 4. FOOTBALL NATIONAL TEAMS & HISTORIES
        # -------------------------------------------------------------
        print("\n4. Exporting Football National Teams & Histories...")
        fb_histories = {}
        fb_career_high_map = {}
        all_fb_hist = db.query(FootballHistoricalRanking).order_by(
            FootballHistoricalRanking.ranking_year.asc(),
            FootballHistoricalRanking.ranking_month.asc(),
            FootballHistoricalRanking.ranking_date.asc()
        ).all()
        for r in all_fb_hist:
            tid = str(r.team_id)
            dt_str = f"{r.ranking_year:04d}-{r.ranking_month:02d}-{r.ranking_date:02d}"
            fb_histories.setdefault(tid, []).append({"rank": r.rank, "points": r.points, "date": dt_str})
            if r.rank > 0:
                if r.team_id not in fb_career_high_map or r.rank < fb_career_high_map[r.team_id]["rank"]:
                    fb_career_high_map[r.team_id] = {"rank": r.rank, "date": dt_str}

        fb_teams = db.query(FootballNationalTeam).order_by(FootballNationalTeam.category.asc(), FootballNationalTeam.ranking.asc()).all()
        fb_export = []
        for t in fb_teams:
            ch = fb_career_high_map.get(t.id, {})
            ch_rank = ch.get("rank") or t.ranking
            ch_date = ch.get("date")
            fb_export.append({
                "id": t.id,
                "name": t.name,
                "country": t.country or t.name,
                "confederation": t.confederation,
                "founded_year": t.founded_year or 1900,
                "stadium": t.stadium,
                "manager": t.manager or "TBD",
                "nickname": t.nickname,
                "image_url": t.image_url,
                "website": t.website,
                "description": t.description,
                "ranking": t.ranking,
                "highest_ranking": ch_rank,
                "highest_ranking_date": ch_date,
                "career_high_rank": ch_rank,
                "career_high_date": ch_date,
                "category": t.category,
                "total_trophies": t.total_trophies or 0,
                "world_cup_titles": t.world_cup_titles or 0,
                "captain": t.captain or "TBD",
                "main_rivals": t.main_rivals or "Neighboring Countries",
                "honors_json": t.honors_json or {},
                "last_updated": t.last_updated.isoformat() if t.last_updated else None,
                "ranking_history": None
            })
        with open(os.path.join(OUT_DIR, 'football_national_teams.json'), 'w', encoding='utf-8') as f:
            json.dump(fb_export, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'football_national_teams.json')} ({len(fb_export)} Football teams)")

        with open(os.path.join(OUT_DIR, 'football_team_histories.json'), 'w', encoding='utf-8') as f:
            json.dump(fb_histories, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'football_team_histories.json')} ({len(fb_histories)} Football team histories)")

        # -------------------------------------------------------------
        # 5. BASKETBALL NATIONAL TEAMS & HISTORIES
        # -------------------------------------------------------------
        print("\n5. Exporting Basketball National Teams & Histories...")
        bb_histories = {}
        bb_career_high_map = {}
        all_bb_hist = db.query(BasketballHistoricalRanking).order_by(
            BasketballHistoricalRanking.ranking_year.asc(),
            BasketballHistoricalRanking.ranking_month.asc(),
            BasketballHistoricalRanking.ranking_date.asc()
        ).all()
        for r in all_bb_hist:
            tid = str(r.team_id)
            dt_str = f"{r.ranking_year:04d}-{r.ranking_month:02d}-{r.ranking_date:02d}"
            bb_histories.setdefault(tid, []).append({"rank": r.rank, "points": r.points, "date": dt_str})
            if r.rank > 0:
                if r.team_id not in bb_career_high_map or r.rank < bb_career_high_map[r.team_id]["rank"]:
                    bb_career_high_map[r.team_id] = {"rank": r.rank, "date": dt_str}

        bb_teams = db.query(BasketballNationalTeam).order_by(BasketballNationalTeam.category.asc(), BasketballNationalTeam.ranking.asc()).all()
        bb_export = []
        for t in bb_teams:
            ch = bb_career_high_map.get(t.id, {})
            ch_rank = ch.get("rank") or t.ranking
            ch_date = ch.get("date")
            bb_export.append({
                "id": t.id,
                "name": t.name,
                "country": t.country or t.name,
                "confederation": t.confederation,
                "founded_year": t.founded_year or 1900,
                "stadium": t.stadium,
                "manager": t.manager or "TBD",
                "nickname": t.nickname,
                "image_url": t.image_url,
                "website": t.website,
                "description": t.description,
                "ranking": t.ranking,
                "highest_ranking": ch_rank,
                "highest_ranking_date": ch_date,
                "career_high_rank": ch_rank,
                "career_high_date": ch_date,
                "category": t.category,
                "total_trophies": t.total_trophies or 0,
                "world_cup_titles": t.world_cup_titles or 0,
                "captain": t.captain or "TBD",
                "main_rivals": t.main_rivals or "Neighboring Countries",
                "honors_json": t.honors_json or {},
                "last_updated": t.last_updated.isoformat() if t.last_updated else None,
                "ranking_history": None
            })
        with open(os.path.join(OUT_DIR, 'basketball_national_teams.json'), 'w', encoding='utf-8') as f:
            json.dump(bb_export, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'basketball_national_teams.json')} ({len(bb_export)} Basketball teams)")

        with open(os.path.join(OUT_DIR, 'basketball_team_histories.json'), 'w', encoding='utf-8') as f:
            json.dump(bb_histories, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'basketball_team_histories.json')} ({len(bb_histories)} Basketball team histories)")

        # -------------------------------------------------------------
        # 6. BASKETBALL CLUBS
        # -------------------------------------------------------------
        print("\n6. Exporting Basketball Clubs...")
        bb_clubs = db.query(BasketballClub).all()
        bc_export = []
        for c in bb_clubs:
            ch_rank = getattr(c, 'highest_ranking', None) or getattr(c, 'career_high_rank', None) or c.ranking
            ch_date = getattr(c, 'highest_ranking_date', None) or getattr(c, 'career_high_date', None)
            if hasattr(ch_date, 'isoformat'):
                ch_date = ch_date.isoformat()
            bc_export.append({
                "id": c.id,
                "name": c.name,
                "city": c.city,
                "country": c.country,
                "league": c.league,
                "conference": c.conference,
                "founded_year": c.founded_year,
                "arena": c.arena,
                "capacity": c.capacity,
                "head_coach": c.head_coach,
                "nickname": c.nickname,
                "image_url": c.image_url,
                "website": c.website,
                "description": c.description,
                "ranking": c.ranking,
                "highest_ranking": ch_rank,
                "highest_ranking_date": ch_date,
                "career_high_rank": ch_rank,
                "career_high_date": ch_date,
                "category": c.category,
                "titles": c.titles or 0,
                "playoff_appearances": c.playoff_appearances or 0,
                "market_value": c.market_value,
                "current_season_record": c.current_season_record,
                "star_player": c.star_player,
                "owner": c.owner,
                "general_manager": c.general_manager,
                "honors_json": c.honors_json or {},
                "last_updated": c.last_updated.isoformat() if c.last_updated else None
            })
        with open(os.path.join(OUT_DIR, 'basketball_clubs.json'), 'w', encoding='utf-8') as f:
            json.dump(bc_export, f, ensure_ascii=False, indent=2)
        print(f"   Saved {os.path.join(OUT_DIR, 'basketball_clubs.json')} ({len(bc_export)} Basketball clubs)")

        print("\n" + "=" * 60)
        print(f"ALL LOCAL ASSETS EXPORTED IN {time.time()-t0:.2f} SECONDS!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == '__main__':
    export_all()
