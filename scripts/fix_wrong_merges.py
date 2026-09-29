#!/usr/bin/env python3
"""
Fix script for three data issues:
1. Lee Daeun (DOB 2005, ID=14373): Not in 2026-09-29 TT snapshot → insert at rank 131
2. Lee Daeun (DOB 2003, ID=3341): Wrongly scraped rank #985 on 2026-09-29 → correct to #233
3. Maria Garcia CUB & ARG: Wrongly merged in tennis DB → restore from WTA data

Run with --execute to commit changes.
"""
import sys, os, argparse

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))
from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking, TableTennisPlayer
from app.models.player import Player, TennisHistoricalPlayer, TennisHistoricalRanking
from sqlalchemy import text
import datetime

def fix_lee_daeun(db, dry_run=True):
    print("\n" + "="*60)
    print("FIX 1 & 2: Lee Daeun — Two different players wrongly scraped")
    print("="*60)

    # Lee Daeun 2005 (ID=14373, rank #131 on WTT today)
    # She was scraped last on 2026-9-24 at rank 163.
    # WTT shows her at #131 in the 2026-09-29 snapshot.
    # Insert a ranking entry for her in the 2026-09-29 snapshot at rank 131.
    ld_2005_id = 14373
    target_date = (2026, 9, 29)

    existing = db.query(TableTennisHistoricalRanking).filter_by(
        player_id=ld_2005_id,
        ranking_year=target_date[0],
        ranking_month=target_date[1],
        ranking_date=target_date[2]
    ).first()

    if existing:
        print(f"  Lee Daeun 2005 (ID={ld_2005_id}) already has a rank on 2026-9-29: #{existing.rank}")
    else:
        print(f"  Lee Daeun 2005 (ID={ld_2005_id}): inserting rank #131 for 2026-09-29")
        if not dry_run:
            new_rank = TableTennisHistoricalRanking(
                player_id=ld_2005_id,
                rank=131,
                ranking_year=target_date[0],
                ranking_month=target_date[1],
                ranking_date=target_date[2],
            )
            db.add(new_rank)

    # Also update legacy table_tennis_players rank for Lee Daeun (the one with rank 163)
    leg_2005 = db.query(TableTennisPlayer).filter_by(id=2943).first()
    if leg_2005:
        print(f"  Legacy TT player ID=2943 '{leg_2005.name}' current rank={leg_2005.ranking} → updating to 131")
        if not dry_run:
            leg_2005.ranking = 131

    # Lee Daeun 2003 (ID=3341) — the 2026-9-29 scrape put her at #985 
    # but she should be at ~#233 (consistent with her 2026-9-24 scrape at #233)
    # The #985 rank appears to be a scraper error — she jumped from 233 to 977 to 985
    # WTT shows two Lee Daeuns: rank 131 (born 2005) and rank 233 (born 2003)
    ld_2003_id = 3341
    ld_2003_today = db.query(TableTennisHistoricalRanking).filter_by(
        player_id=ld_2003_id,
        ranking_year=2026,
        ranking_month=9,
        ranking_date=29
    ).first()
    if ld_2003_today:
        print(f"\n  Lee Daeun 2003 (ID={ld_2003_id}): 2026-9-29 rank is #{ld_2003_today.rank}")
        print(f"  WTT shows her at #233. Correcting to 233.")
        if not dry_run:
            ld_2003_today.rank = 233

    print()


def fix_maria_garcia(db, dry_run=True):
    print("="*60)
    print("FIX 3: Maria Garcia CUB & ARG — restore from WTA")
    print("="*60)

    # WTA shows 3 Maria Garcia players:
    # 1. Maria Garcia Cid (ESP) — already in DB ✅  
    # 2. Maria Garcia (POR) — already in DB ✅
    # 3. Maria Garcia (CUB) — MISSING → needs to be added
    # 4. Maria Garcia (ARG) — MISSING → needs to be added
    # 
    # These were merged by deduplicate_players.py into the POR entry.
    # We need to check if they exist in tennis_players_historical and re-add if needed.

    existing_cub = db.query(TennisHistoricalPlayer).filter(
        TennisHistoricalPlayer.last_name == 'Garcia',
        TennisHistoricalPlayer.first_name == 'Maria',
        TennisHistoricalPlayer.country == 'CUB'
    ).first()

    existing_arg = db.query(TennisHistoricalPlayer).filter(
        TennisHistoricalPlayer.last_name == 'Garcia',
        TennisHistoricalPlayer.first_name == 'Maria',
        TennisHistoricalPlayer.country == 'ARG'
    ).first()

    print(f"  Maria Garcia CUB in historical DB: {'EXISTS' if existing_cub else 'MISSING'}")
    print(f"  Maria Garcia ARG in historical DB: {'EXISTS' if existing_arg else 'MISSING'}")

    # Also check legacy players table
    leg_cub = db.query(Player).filter(
        Player.name == 'Maria Garcia',
        Player.country == 'CUB'
    ).first()
    leg_arg = db.query(Player).filter(
        Player.name == 'Maria Garcia',
        Player.country == 'ARG'
    ).first()

    print(f"  Maria Garcia CUB in legacy players: {'EXISTS' if leg_cub else 'MISSING'}")
    print(f"  Maria Garcia ARG in legacy players: {'EXISTS' if leg_arg else 'MISSING'}")

    if not existing_cub:
        print("  → Adding Maria Garcia CUB to tennis_players_historical")
        if not dry_run:
            new_cub = TennisHistoricalPlayer(
                first_name='Maria',
                last_name='Garcia',
                country='CUB',
                gender=1,  # female
                last_updated=datetime.datetime.now()
            )
            db.add(new_cub)
            db.flush()
            # She's ranked but we don't have her WTA rank number — add as unranked for now
            # (will be updated when scraper runs next time)
            print(f"    Created with ID={new_cub.id}")

    if not existing_arg:
        print("  → Adding Maria Garcia ARG to tennis_players_historical")
        if not dry_run:
            new_arg = TennisHistoricalPlayer(
                first_name='Maria',
                last_name='Garcia',
                country='ARG',
                gender=1,
                last_updated=datetime.datetime.now()
            )
            db.add(new_arg)
            db.flush()
            print(f"    Created with ID={new_arg.id}")

    if not leg_cub:
        print("  → Adding Maria Garcia CUB to legacy players table")
        if not dry_run:
            new_leg_cub = Player(
                name='Maria Garcia',
                country='CUB',
                gender='F',
                ranking=9999
            )
            db.add(new_leg_cub)

    if not leg_arg:
        print("  → Adding Maria Garcia ARG to legacy players table")
        if not dry_run:
            new_leg_arg = Player(
                name='Maria Garcia',
                country='ARG',
                gender='F',
                ranking=9999
            )
            db.add(new_leg_arg)

    print()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true', help='Commit changes to DB')
    args = parser.parse_args()
    dry_run = not args.execute

    db = SessionLocal()
    try:
        if dry_run:
            print("DRY-RUN MODE (pass --execute to commit)")
        else:
            print("EXECUTE MODE — changes will be committed")

        fix_lee_daeun(db, dry_run)
        fix_maria_garcia(db, dry_run)

        if not dry_run:
            db.commit()
            print("\n✅ DB changes committed.")
            print("Now re-exporting JSON caches...")
            sys.path.insert(0, os.path.join(project_root, 'scripts'))
            from export_all_frontend_cache import export_all
            export_all()
            print("✅ JSON caches updated.")
            print("\nNow re-running JSON deduplication with country-aware fix...")
            sys.path.insert(0, project_root)
            import deduplicate_players
            deduplicate_players.main()
        else:
            print("\nDRY-RUN DONE. No changes made.")
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    main()
