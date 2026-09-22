#!/usr/bin/env python3
"""
Restore & Disambiguate Same-Name Players
=========================================
1. Removes duplicate player records created for identical names.
2. Ensures distinct players who share identical names (e.g. LEE Daeun #163 Age 21 vs LEE Daeun #233 Age 23)
   have separate TableTennisHistoricalPlayer records with their CORRECT distinct profile pictures.
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


def restore_lee_daeun(db):
    print("--- Restoring LEE Daeun Distinct Records & Profile Pictures ---")

    # 1. Clean up known duplicate IDs created previously
    duplicate_ids = [14778, 14779]
    for dup_id in duplicate_ids:
        db.query(TableTennisHistoricalRanking).filter(TableTennisHistoricalRanking.player_id == dup_id).delete()
        db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == dup_id).delete()
    db.commit()

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

    ly, lm, ld = (2026, 9, 22) if not latest_r else latest_r

    # Find existing Lee Daeun historical players (either first/last order)
    existing = db.query(TableTennisHistoricalPlayer).filter(
        (TableTennisHistoricalPlayer.first_name.ilike("Lee") & TableTennisHistoricalPlayer.last_name.ilike("Daeun")) |
        (TableTennisHistoricalPlayer.first_name.ilike("Daeun") & TableTennisHistoricalPlayer.last_name.ilike("Lee"))
    ).all()

    print(f"Found {len(existing)} distinct historical player record(s) for Lee Daeun.")

    p163 = None  # Age 21, Rank 163 (Birth Year 2005) -> Blue jersey photo (WTT ID 135391)
    p233 = None  # Age 23, Rank 233 (Birth Year 2003) -> Red jersey photo (WTT ID 132702)

    for p in existing:
        if p.birth_year == 2005 or p.id == 14373:
            p163 = p
        elif p.birth_year == 2003 or p.id == 2896:
            p233 = p

    # Player 1: LEE Daeun (Age 21, Rank 163, Birth Year 2005) -> Blue jersey picture
    if not p163:
        p163 = TableTennisHistoricalPlayer(
            first_name="Lee",
            last_name="Daeun",
            gender=1,
            country="Korea Republic",
            birth_year=2005,
            birth_month=3,
            birth_date=20,
            picture="https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/135391_HEADSHOT_R_LEE_Daeun.png"
        )
        db.add(p163)
        db.flush()
        print(f"Created distinct TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Rank 163)")
    else:
        p163.first_name = "Lee"
        p163.last_name = "Daeun"
        p163.birth_year = 2005
        p163.country = "Korea Republic"
        p163.picture = "https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/135391_HEADSHOT_R_LEE_Daeun.png"
        print(f"Updated TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Rank 163) with Blue Jersey Headshot (135391)")

    # Player 2: LEE Daeun (Age 23, Rank 233, Birth Year 2003) -> Red jersey picture
    if not p233:
        p233 = TableTennisHistoricalPlayer(
            first_name="Lee",
            last_name="Daeun",
            gender=1,
            country="Korea Republic",
            birth_year=2003,
            birth_month=1,
            birth_date=1,
            picture="https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/132702_HEADSHOT_R_LEE_Daeun.png"
        )
        db.add(p233)
        db.flush()
        print(f"Created distinct TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Rank 233)")
    else:
        p233.first_name = "Lee"
        p233.last_name = "Daeun"
        p233.birth_year = 2003
        p233.country = "Korea Republic"
        p233.picture = "https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/132702_HEADSHOT_R_LEE_Daeun.png"
        print(f"Updated TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Rank 233) with Red Jersey Headshot (132702)")

    # Assign rank 163 to p163 for latest date
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

    # Assign rank 233 to p233 for latest date
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
    print("Successfully restored both LEE Daeun distinct historical player records with distinct profile pictures!")


def main():
    db = SessionLocal()
    try:
        restore_lee_daeun(db)
    finally:
        db.close()

if __name__ == '__main__':
    main()
