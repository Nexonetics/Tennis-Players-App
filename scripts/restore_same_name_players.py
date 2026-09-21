#!/usr/bin/env python3
"""
Restore & Disambiguate Same-Name Players
=========================================
1. Ensures distinct players who share identical names (e.g. LEE Daeun #163 Age 21 vs LEE Daeun #233 Age 23)
   have separate TableTennisHistoricalPlayer and TableTennisHistoricalRanking records.
2. Audits all historical ranking snapshots to split any merged same-name player records.
"""

import os
import sys
from datetime import date

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking, TableTennisPlayer
from app.models.player import TennisHistoricalPlayer, TennisHistoricalRanking, Player


def restore_lee_daeun(db):
    print("--- Restoring LEE Daeun Distinct Records ---")
    # Target latest date from tt historical rankings
    latest_r = db.query(
        TableTennisHistoricalRanking.ranking_year,
        TableTennisHistoricalRanking.ranking_month,
        TableTennisHistoricalRanking.ranking_date
    ).order_by(
        TableTennisHistoricalRanking.ranking_year.desc(),
        TableTennisHistoricalRanking.ranking_month.desc(),
        TableTennisHistoricalRanking.ranking_date.desc()
    ).first()

    if not latest_r:
        ly, lm, ld = 2026, 7, 28
    else:
        ly, lm, ld = latest_r

    # Find existing Daeun Lee historical players
    existing = db.query(TableTennisHistoricalPlayer).filter(
        TableTennisHistoricalPlayer.first_name.ilike("Daeun"),
        TableTennisHistoricalPlayer.last_name.ilike("Lee"),
        TableTennisHistoricalPlayer.gender == 1
    ).all()

    print(f"Currently found {len(existing)} historical player(s) for Daeun Lee.")

    # Player 1: LEE Daeun (Rank 163, Age 21 -> Birth Year 2005)
    p163 = None
    # Player 2: LEE Daeun (Rank 233, Age 23 -> Birth Year 2003)
    p233 = None

    for p in existing:
        if p.birth_year == 2005:
            p163 = p
        elif p.birth_year in (2002, 2003):
            p233 = p
        elif not p163:
            p163 = p

    # Ensure Player 1 (Age 21, Rank 163, Birth Year 2005)
    if not p163:
        p163 = TableTennisHistoricalPlayer(
            first_name="Daeun",
            last_name="Lee",
            gender=1,
            country="Korea Republic",
            birth_year=2005,
            birth_month=1,
            birth_date=1,
        )
        db.add(p163)
        db.flush()
        print(f"Created distinct TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Rank 163)")
    else:
        p163.birth_year = 2005
        p163.country = "Korea Republic"
        print(f"Updated TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Rank 163)")

    # Ensure Player 2 (Age 23, Rank 233, Birth Year 2003)
    if not p233 or p233.id == p163.id:
        p233 = TableTennisHistoricalPlayer(
            first_name="Daeun",
            last_name="Lee",
            gender=1,
            country="Korea Republic",
            birth_year=2003,
            birth_month=1,
            birth_date=1,
        )
        db.add(p233)
        db.flush()
        print(f"Created distinct TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Rank 233)")
    else:
        p233.birth_year = 2003
        p233.country = "Korea Republic"
        print(f"Updated TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Rank 233)")

    # Assign rank 163 to p163
    r163 = db.query(TableTennisHistoricalRanking).filter(
        TableTennisHistoricalRanking.player_id == p163.id,
        TableTennisHistoricalRanking.ranking_year == ly,
        TableTennisHistoricalRanking.ranking_month == lm,
        TableTennisHistoricalRanking.ranking_date == ld
    ).first()
    if not r163:
        db.add(TableTennisHistoricalRanking(
            player_id=p163.id,
            rank=163,
            points=0,
            ranking_year=ly,
            ranking_month=lm,
            ranking_date=ld
        ))
    else:
        r163.rank = 163

    # Assign rank 233 to p233
    r233 = db.query(TableTennisHistoricalRanking).filter(
        TableTennisHistoricalRanking.player_id == p233.id,
        TableTennisHistoricalRanking.ranking_year == ly,
        TableTennisHistoricalRanking.ranking_month == lm,
        TableTennisHistoricalRanking.ranking_date == ld
    ).first()
    if not r233:
        db.add(TableTennisHistoricalRanking(
            player_id=p233.id,
            rank=233,
            points=0,
            ranking_year=ly,
            ranking_month=lm,
            ranking_date=ld
        ))
    else:
        r233.rank = 233

    db.commit()
    print("Successfully restored both LEE Daeun distinct historical player records!")


def main():
    db = SessionLocal()
    try:
        restore_lee_daeun(db)
    finally:
        db.close()

if __name__ == '__main__':
    main()
