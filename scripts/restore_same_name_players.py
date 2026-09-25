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

    # 1. Target latest date from tt historical rankings
    latest_r = db.query(
        TableTennisHistoricalRanking.ranking_year,
        TableTennisHistoricalRanking.ranking_month,
        TableTennisHistoricalRanking.ranking_date
    ).order_by(
        TableTennisHistoricalRanking.ranking_year.desc(),
        TableTennisHistoricalRanking.ranking_month.desc(),
        TableTennisHistoricalRanking.ranking_date.desc()
    ).first()

    ly, lm, ld = (2026, 9, 24) if not latest_r else latest_r

    # 2. Merge duplicate ID 2896 into ID 3341 if ID 2896 exists
    p2896 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 2896).first()
    p3341 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 3341).first()

    if p2896 and p3341:
        print("Merging duplicate TableTennisHistoricalPlayer ID 2896 into ID 3341...")
        # Move rankings from 2896 to 3341 where 3341 doesn't have a ranking for that date
        r2896_list = db.query(TableTennisHistoricalRanking).filter(TableTennisHistoricalRanking.player_id == 2896).all()
        for r in r2896_list:
            existing_r = db.query(TableTennisHistoricalRanking).filter(
                TableTennisHistoricalRanking.player_id == 3341,
                TableTennisHistoricalRanking.ranking_year == r.ranking_year,
                TableTennisHistoricalRanking.ranking_month == r.ranking_month,
                TableTennisHistoricalRanking.ranking_date == r.ranking_date
            ).first()
            if not existing_r:
                r.player_id = 3341
            else:
                db.delete(r)
        db.delete(p2896)
        db.commit()
        print("Successfully merged ID 2896 into ID 3341.")

    # 3. Handle Player 1: Older Lee Daeun (ID 3341, Age 23, Birth Year 2003) -> Red jersey picture (132702)
    p233 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 3341).first()
    if not p233:
        p233 = TableTennisHistoricalPlayer(
            id=3341,
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
        print(f"Created distinct TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Red Jersey)")
    else:
        p233.first_name = "Lee"
        p233.last_name = "Daeun"
        p233.birth_year = 2003
        p233.country = "Korea Republic"
        p233.picture = "https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/132702_HEADSHOT_R_LEE_Daeun.png"
        print(f"Updated TableTennisHistoricalPlayer ID {p233.id}: LEE Daeun (Age 23, Red Jersey 132702)")

    # 4. Handle Player 2: Younger Lee Daeun (ID 14373, Age 21, Birth Year 2005) -> Blue jersey picture (135391)
    p163 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 14373).first()
    if not p163:
        p163 = TableTennisHistoricalPlayer(
            id=14373,
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
        print(f"Created distinct TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Blue Jersey)")
    else:
        p163.first_name = "Lee"
        p163.last_name = "Daeun"
        p163.birth_year = 2005
        p163.country = "Korea Republic"
        p163.picture = "https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/135391_HEADSHOT_R_LEE_Daeun.png"
        print(f"Updated TableTennisHistoricalPlayer ID {p163.id}: LEE Daeun (Age 21, Blue Jersey 135391)")

    # 5. Assign latest ranking (2026-09-24) to p233 (Rank #977)
    r977 = db.query(TableTennisHistoricalRanking).filter(
        TableTennisHistoricalRanking.player_id == p233.id,
        TableTennisHistoricalRanking.ranking_year == ly,
        TableTennisHistoricalRanking.ranking_month == lm,
        TableTennisHistoricalRanking.ranking_date == ld
    ).first()
    if not r977:
        db.add(TableTennisHistoricalRanking(
            player_id=p233.id,
            rank=977,
            points=0,
            ranking_year=ly,
            ranking_month=lm,
            ranking_date=ld
        ))
    else:
        r977.rank = 977

    # 6. Assign latest ranking (2026-09-24) to p163 (Rank #163)
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

    db.commit()

    # 7. Update TableTennisPlayer active table
    existing_tt_players = db.query(TableTennisPlayer).filter(
        TableTennisPlayer.name.ilike("%Lee Daeun%")
    ).all()
    for tp in existing_tt_players:
        db.delete(tp)
    db.commit()

    tp1 = TableTennisPlayer(
        name="Lee Daeun",
        country="Korea Republic",
        ranking=977,
        gender="F",
        birth_date=date(2003, 1, 1),
        image_url="https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/132702_HEADSHOT_R_LEE_Daeun.png"
    )
    tp2 = TableTennisPlayer(
        name="Lee Daeun",
        country="Korea Republic",
        ranking=163,
        gender="F",
        birth_date=date(2005, 3, 20),
    )
    db.add(tp1)
    db.add(tp2)
    db.commit()
    print("Successfully restored both LEE Daeun distinct records, pictures, rankings, and active table entries!")


def restore_benedikt_duda(db):
    print("--- Restoring Benedikt DUDA Distinct Records & Career High Rank #8 ---")
    p54 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 54).first()
    p14451 = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == 14451).first()

    if p14451 and p54:
        print("Merging duplicate TableTennisHistoricalPlayer ID 14451 into ID 54...")
        r_list = db.query(TableTennisHistoricalRanking).filter(TableTennisHistoricalRanking.player_id == 14451).all()
        for r in r_list:
            existing = db.query(TableTennisHistoricalRanking).filter(
                TableTennisHistoricalRanking.player_id == 54,
                TableTennisHistoricalRanking.ranking_year == r.ranking_year,
                TableTennisHistoricalRanking.ranking_month == r.ranking_month,
                TableTennisHistoricalRanking.ranking_date == r.ranking_date
            ).first()
            if not existing:
                r.player_id = 54
            else:
                db.delete(r)
        db.delete(p14451)
        db.commit()

    if p54:
        p54.first_name = "Benedikt"
        p54.last_name = "DUDA"
        p54.picture = "https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/116620_Headshot_R_Benedikt DUDA.png"
        p54.birth_year = 1994
        p54.birth_month = 4
        p54.birth_date = 4
        
        # Ensure latest ranking entries for 2026-09-22 and 2026-09-24 exist for ID 54
        for y, m, d in [(2026, 9, 22), (2026, 9, 24)]:
            r_entry = db.query(TableTennisHistoricalRanking).filter(
                TableTennisHistoricalRanking.player_id == 54,
                TableTennisHistoricalRanking.ranking_year == y,
                TableTennisHistoricalRanking.ranking_month == m,
                TableTennisHistoricalRanking.ranking_date == d
            ).first()
            if not r_entry:
                db.add(TableTennisHistoricalRanking(
                    player_id=54,
                    rank=37,
                    points=0,
                    ranking_year=y,
                    ranking_month=m,
                    ranking_date=d
                ))
            else:
                r_entry.rank = 37

        db.commit()

    # Update TableTennisPlayer active table entry
    existing_duda = db.query(TableTennisPlayer).filter(TableTennisPlayer.name.ilike("%Duda%")).all()
    for tp in existing_duda:
        db.delete(tp)
    db.commit()

    tp_duda = TableTennisPlayer(
        name="Benedikt DUDA",
        country="Germany",
        ranking=37,
        gender="M",
        birth_date=date(1994, 4, 4),
        image_url="https://wttsimfiles.blob.core.windows.net/wtt-media/photos/400px/116620_Headshot_R_Benedikt DUDA.png"
    )
    db.add(tp_duda)
    db.commit()
    print("Successfully restored Benedikt DUDA ID 54 with Career High Rank #8!")


def main():
    db = SessionLocal()
    try:
        restore_lee_daeun(db)
        restore_benedikt_duda(db)
    finally:
        db.close()

if __name__ == '__main__':
    main()


