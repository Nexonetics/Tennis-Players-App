#!/usr/bin/env python3
"""
Career High Ranking Enriched & Synchronizer
============================================
1. Scans Tennis and Table Tennis historical players.
2. Checks if official/legacy profile career highs exist.
3. Ensures corresponding peak records exist in historical ranking tables
   (tennis_rankings_historical & tt_rankings_historical).
4. Synchronizes legacy Player table and TennisHistoricalRanking table.
"""

import os
import sys
from datetime import date, datetime

# Setup path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal
from app.models.player import Player, TennisHistoricalPlayer, TennisHistoricalRanking
from app.models.tt_player import TableTennisPlayer, TableTennisHistoricalPlayer, TableTennisHistoricalRanking


def enrich_tennis(db):
    print("--- Enriching Tennis Career High Ranks ---")
    legacy_map = {}
    for p in db.query(Player).all():
        if p.name:
            legacy_map[p.name.strip().lower()] = p

    hp_list = db.query(TennisHistoricalPlayer).all()
    updated_count = 0
    checkpoint_created = 0

    for hp in hp_list:
        full_name = f"{hp.first_name} {hp.last_name}".strip().lower()
        old_p = legacy_map.get(full_name)

        if not old_p or not old_p.highest_ranking or old_p.highest_ranking <= 0:
            continue

        # Check existing best rank in historical table
        best_hist = db.query(TennisHistoricalRanking).filter(
            TennisHistoricalRanking.player_id == hp.id,
            TennisHistoricalRanking.rank > 0
        ).order_by(TennisHistoricalRanking.rank.asc()).first()

        target_rank = old_p.highest_ranking
        target_date = old_p.highest_ranking_date or date(2020, 1, 1)

        # If historical best is worse (higher number) or missing, insert/update historical checkpoint
        if not best_hist or best_hist.rank > target_rank:
            # Check if checkpoint already exists for this date
            existing_cp = db.query(TennisHistoricalRanking).filter(
                TennisHistoricalRanking.player_id == hp.id,
                TennisHistoricalRanking.ranking_year == target_date.year,
                TennisHistoricalRanking.ranking_month == target_date.month,
                TennisHistoricalRanking.ranking_date == target_date.day
            ).first()

            if existing_cp:
                existing_cp.rank = min(existing_cp.rank, target_rank)
            else:
                new_cp = TennisHistoricalRanking(
                    player_id=hp.id,
                    points=0,
                    rank=target_rank,
                    ranking_year=target_date.year,
                    ranking_month=target_date.month,
                    ranking_date=target_date.day
                )
                db.add(new_cp)
                checkpoint_created += 1

            updated_count += 1

    db.commit()
    print(f"Tennis: Updated {updated_count} players, inserted {checkpoint_created} peak checkpoints.")


def enrich_table_tennis(db):
    print("--- Enriching Table Tennis Career High Ranks ---")
    legacy_map = {}
    for p in db.query(TableTennisPlayer).all():
        if p.name:
            legacy_map[p.name.strip().lower()] = p

    hp_list = db.query(TableTennisHistoricalPlayer).all()
    updated_count = 0
    checkpoint_created = 0

    for hp in hp_list:
        full_name = f"{hp.first_name} {hp.last_name}".strip().lower()
        old_p = legacy_map.get(full_name)

        if not old_p or not getattr(old_p, 'highest_ranking', None) or old_p.highest_ranking <= 0:
            continue

        best_hist = db.query(TableTennisHistoricalRanking).filter(
            TableTennisHistoricalRanking.player_id == hp.id,
            TableTennisHistoricalRanking.rank > 0
        ).order_by(TableTennisHistoricalRanking.rank.asc()).first()

        target_rank = old_p.highest_ranking
        target_date = getattr(old_p, 'highest_ranking_date', None) or date(2020, 1, 1)

        if not best_hist or best_hist.rank > target_rank:
            existing_cp = db.query(TableTennisHistoricalRanking).filter(
                TableTennisHistoricalRanking.player_id == hp.id,
                TableTennisHistoricalRanking.ranking_year == target_date.year,
                TableTennisHistoricalRanking.ranking_month == target_date.month,
                TableTennisHistoricalRanking.ranking_date == target_date.day
            ).first()

            if existing_cp:
                existing_cp.rank = min(existing_cp.rank, target_rank)
            else:
                new_cp = TableTennisHistoricalRanking(
                    player_id=hp.id,
                    points=0,
                    rank=target_rank,
                    ranking_year=target_date.year,
                    ranking_month=target_date.month,
                    ranking_date=target_date.day
                )
                db.add(new_cp)
                checkpoint_created += 1

            updated_count += 1

    db.commit()
    print(f"Table Tennis: Updated {updated_count} players, inserted {checkpoint_created} peak checkpoints.")


def main():
    db = SessionLocal()
    try:
        enrich_tennis(db)
        enrich_table_tennis(db)
    finally:
        db.close()


if __name__ == '__main__':
    main()
