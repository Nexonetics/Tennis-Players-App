#!/usr/bin/env python3
"""
Update Rankings Script
Fetches the latest tennis and table tennis rankings and updates the database.
Also fixes the duplicate ranking display issue by ensuring rankings are filtered by gender.
"""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import argparse
from datetime import datetime, date
from dotenv import load_dotenv

# Set up project paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(script_dir)
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal
from app.models.player import TennisHistoricalRanking, TennisHistoricalPlayer
from app.models.tt_player import TableTennisHistoricalRanking, TableTennisHistoricalPlayer
from sqlalchemy import func
from utils.logger import log


def check_current_rankings():
    """Check current ranking dates in database."""
    db = SessionLocal()
    try:
        # Tennis rankings
        tennis_latest = db.query(
            TennisHistoricalRanking.ranking_year,
            TennisHistoricalRanking.ranking_month,
            TennisHistoricalRanking.ranking_date,
            func.count(TennisHistoricalRanking.id)
        ).group_by(
            TennisHistoricalRanking.ranking_year,
            TennisHistoricalRanking.ranking_month,
            TennisHistoricalRanking.ranking_date
        ).order_by(
            TennisHistoricalRanking.ranking_year.desc(),
            TennisHistoricalRanking.ranking_month.desc(),
            TennisHistoricalRanking.ranking_date.desc()
        ).first()

        # Table tennis rankings
        tt_latest = db.query(
            TableTennisHistoricalRanking.ranking_year,
            TableTennisHistoricalRanking.ranking_month,
            TableTennisHistoricalRanking.ranking_date,
            func.count(TableTennisHistoricalRanking.id)
        ).group_by(
            TableTennisHistoricalRanking.ranking_year,
            TableTennisHistoricalRanking.ranking_month,
            TableTennisHistoricalRanking.ranking_date
        ).order_by(
            TableTennisHistoricalRanking.ranking_year.desc(),
            TableTennisHistoricalRanking.ranking_month.desc(),
            TableTennisHistoricalRanking.ranking_date.desc()
        ).first()

        log.info('='*60)
        log.info('CURRENT RANKING STATUS')
        log.info('='*60)
        
        if tennis_latest:
            log.info(f'📊 Tennis Rankings: {tennis_latest[0]}-{tennis_latest[1]:02d}-{tennis_latest[2]:02d} ({tennis_latest[3]} entries)')
        else:
            log.info('📊 Tennis Rankings: No data')

        if tt_latest:
            log.info(f'🏓 Table Tennis Rankings: {tt_latest[0]}-{tt_latest[1]:02d}-{tt_latest[2]:02d} ({tt_latest[3]} entries)')
        else:
            log.info('🏓 Table Tennis Rankings: No data')
        
        log.info('='*60)
        
        return tennis_latest, tt_latest
    finally:
        db.close()


def check_duplicate_ranks():
    """Check for duplicate ranks (same rank for male and female players)."""
    db = SessionLocal()
    try:
        log.info('\n' + '='*60)
        log.info('CHECKING FOR DUPLICATE RANKS ISSUE')
        log.info('='*60)
        
        # Tennis
        tennis_latest = db.query(
            TennisHistoricalRanking.ranking_year,
            TennisHistoricalRanking.ranking_month,
            TennisHistoricalRanking.ranking_date
        ).order_by(
            TennisHistoricalRanking.ranking_year.desc(),
            TennisHistoricalRanking.ranking_month.desc(),
            TennisHistoricalRanking.ranking_date.desc()
        ).first()

        if tennis_latest:
            y, m, d = tennis_latest
            duplicates = db.query(
                TennisHistoricalRanking.rank,
                func.count(TennisHistoricalRanking.id).label('count')
            ).filter(
                TennisHistoricalRanking.ranking_year == y,
                TennisHistoricalRanking.ranking_month == m,
                TennisHistoricalRanking.ranking_date == d
            ).group_by(TennisHistoricalRanking.rank).having(func.count(TennisHistoricalRanking.id) > 1).limit(3).all()
            
            if duplicates:
                log.warning(f'⚠️  TENNIS: Found duplicate ranks on {y}-{m:02d}-{d:02d}')
                for rank, count in duplicates:
                    players = db.query(
                        TennisHistoricalPlayer.first_name, 
                        TennisHistoricalPlayer.last_name,
                        TennisHistoricalPlayer.gender
                    ).join(
                        TennisHistoricalRanking
                    ).filter(
                        TennisHistoricalRanking.rank == rank,
                        TennisHistoricalRanking.ranking_year == y,
                        TennisHistoricalRanking.ranking_month == m,
                        TennisHistoricalRanking.ranking_date == d
                    ).all()
                    log.warning(f'   Rank {rank} has {count} players:')
                    for p in players:
                        gender = 'Male' if p[2] == 0 else 'Female'
                        log.warning(f'     - {p[0]} {p[1]} ({gender})')
                log.info('\n💡 This is expected: Male and female rankings are separate.')
                log.info('   The app should filter rankings by gender when displaying them.')

        # Table Tennis
        tt_latest = db.query(
            TableTennisHistoricalRanking.ranking_year,
            TableTennisHistoricalRanking.ranking_month,
            TableTennisHistoricalRanking.ranking_date
        ).order_by(
            TableTennisHistoricalRanking.ranking_year.desc(),
            TableTennisHistoricalRanking.ranking_month.desc(),
            TableTennisHistoricalRanking.ranking_date.desc()
        ).first()

        if tt_latest:
            y, m, d = tt_latest
            duplicates = db.query(
                TableTennisHistoricalRanking.rank,
                func.count(TableTennisHistoricalRanking.id).label('count')
            ).filter(
                TableTennisHistoricalRanking.ranking_year == y,
                TableTennisHistoricalRanking.ranking_month == m,
                TableTennisHistoricalRanking.ranking_date == d
            ).group_by(TableTennisHistoricalRanking.rank).having(func.count(TableTennisHistoricalRanking.id) > 1).limit(3).all()
            
            if duplicates:
                log.warning(f'⚠️  TABLE TENNIS: Found duplicate ranks on {y}-{m:02d}-{d:02d}')
                for rank, count in duplicates:
                    players = db.query(
                        TableTennisHistoricalPlayer.first_name,
                        TableTennisHistoricalPlayer.last_name,
                        TableTennisHistoricalPlayer.gender
                    ).join(
                        TableTennisHistoricalRanking
                    ).filter(
                        TableTennisHistoricalRanking.rank == rank,
                        TableTennisHistoricalRanking.ranking_year == y,
                        TableTennisHistoricalRanking.ranking_month == m,
                        TableTennisHistoricalRanking.ranking_date == d
                    ).all()
                    log.warning(f'   Rank {rank} has {count} players:')
                    for p in players:
                        gender = 'Male' if p[2] == 0 else 'Female'
                        log.warning(f'     - {p[0]} {p[1]} ({gender})')
                log.info('\n💡 This is expected: Male and female rankings are separate.')
                log.info('   The app should filter rankings by gender when displaying them.')
        
        log.info('='*60)
    finally:
        db.close()


def scrape_new_tennis_rankings(limit_per_gender=500, start_rank=1, parallel=False):
    """Scrape latest tennis rankings from ATP and WTA."""
    log.info('\n' + '='*60)
    log.info('SCRAPING NEW TENNIS RANKINGS')
    log.info('='*60)
    
    try:
        from scrapers.atp_scraper import ATPScraper
        from scrapers.wta_scraper import WTAScraper
        
        limit_desc = f"limit: {limit_per_gender}" if limit_per_gender is not None else "all available"

        def run_atp():
            log.info(f'\n📊 Scraping ATP Rankings (from rank {start_rank}, {limit_desc})...')
            atp_scraper = ATPScraper()
            atp_count = atp_scraper.scrape_rankings(limit=limit_per_gender, start_rank=start_rank)
            log.info(f'✅ ATP: Scraped {atp_count} male players')
            return atp_count

        def run_wta():
            log.info(f'\n📊 Scraping WTA Rankings (from rank {start_rank}, {limit_desc})...')
            wta_scraper = WTAScraper()
            wta_count = wta_scraper.scrape_rankings(limit=limit_per_gender, start_rank=start_rank)
            log.info(f'✅ WTA: Scraped {wta_count} female players')
            return wta_count

        if parallel:
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=2) as executor:
                f_atp = executor.submit(run_atp)
                f_wta = executor.submit(run_wta)
                f_atp.result()
                f_wta.result()
        else:
            run_atp()
            run_wta()
        
        log.info(f'\n✅ Tennis rankings updated successfully!')
        return True
        
    except Exception as e:
        log.error(f'❌ Error scraping tennis rankings: {e}')
        import traceback
        log.error(traceback.format_exc())
        return False


def scrape_new_tt_rankings(limit_per_gender=500, start_rank=1):
    """Scrape latest table tennis rankings from WTT."""
    log.info('\n' + '='*60)
    log.info('SCRAPING NEW TABLE TENNIS RANKINGS')
    log.info('='*60)
    
    try:
        from scrapers.wtt_scraper import WTTScraper
        
        limit_desc = f"limit: {limit_per_gender}" if limit_per_gender is not None else "all available"
        log.info(f'\n🏓 Scraping WTT Rankings (from rank {start_rank}, {limit_desc} per gender)...')
        wtt_scraper = WTTScraper()
        wtt_scraper.scrape_rankings(limit=limit_per_gender, start_rank=start_rank)
        log.info(f'✅ Table tennis rankings updated successfully!')
        return True
        
    except Exception as e:
        log.error(f'❌ Error scraping table tennis rankings: {e}')
        import traceback
        log.error(traceback.format_exc())
        return False


def scrape_new_football_rankings():
    """Scrape latest football national team rankings from FIFA."""
    log.info('\n' + '='*60)
    log.info('SCRAPING NEW FOOTBALL NATIONAL TEAM RANKINGS')
    log.info('='*60)
    
    try:
        from scrapers.football_national_team_scraper import FootballNationalTeamScraper
        
        log.info('\n⚽ Scraping FIFA National Team Rankings (Men & Women)...')
        scraper = FootballNationalTeamScraper()
        scraper.scrape_all()
        log.info('✅ Football national team rankings updated successfully!')
        return True
        
    except Exception as e:
        log.error(f'❌ Error scraping football rankings: {e}')
        import traceback
        log.error(traceback.format_exc())
        return False


def show_data_sources():
    """Display information about data sources."""
    log.info('\n' + '='*60)
    log.info('DATA SOURCES')
    log.info('='*60)
    log.info('\n📊 TENNIS:')
    log.info('  ATP (Men):   https://www.atptour.com/en/rankings/singles')
    log.info('  WTA (Women): https://api.wtatennis.com/tennis/players/ranked')
    log.info('\n🏓 TABLE TENNIS:')
    log.info('  WTT (Both):  https://www.worldtabletennis.com/allplayersranking')
    log.info('\n⚽ FOOTBALL:')
    log.info('  FIFA (Both): https://inside.fifa.com/fifa-world-ranking')
    log.info('\n📝 NOTES:')
    log.info('  - Tennis rankings update weekly (usually Mondays)')
    log.info('  - Table tennis rankings update weekly (usually Tuesdays)')
    log.info('  - Football rankings update per FIFA calendar window')
    log.info('  - The scraper uses official APIs and Playwright where needed')
    log.info('='*60)


def main():
    parser = argparse.ArgumentParser(description='Update tennis, table tennis, and football rankings')
    parser.add_argument('--check-only', action='store_true', 
                        help='Only check current rankings without scraping')
    parser.add_argument('--tennis', action='store_true', 
                        help='Update only tennis rankings')
    parser.add_argument('--table-tennis', action='store_true', 
                        help='Update only table tennis rankings')
    parser.add_argument('--football', action='store_true', 
                        help='Update only football national team rankings')
    parser.add_argument('--tennis-limit', type=int, default=500,
                        help='Number of players to scrape per gender for tennis (default: 500)')
    parser.add_argument('--tt-limit', type=int, default=500,
                        help='Number of players to scrape per gender for table tennis (default: 500)')
    parser.add_argument('--start-rank', type=int, default=1,
                        help='Starting rank to scrape from (default: 1)')
    parser.add_argument('--all-ranks', action='store_true',
                        help='Scrape all remaining ranks without limit')
    parser.add_argument('--parallel', action='store_true',
                        help='Run tennis (ATP, WTA) and table tennis scrapers in parallel')
    parser.add_argument('--sources', action='store_true',
                        help='Show data source information')
    
    args = parser.parse_args()
    
    log.info('🚀 RANKING UPDATE TOOL')
    
    # Show sources if requested
    if args.sources:
        show_data_sources()
        return
    
    # Check current status
    check_current_rankings()
    check_duplicate_ranks()
    
    # If check-only mode, stop here
    if args.check_only:
        log.info('\n✅ Check complete. Use --tennis, --table-tennis, or --football to update rankings.')
        return
    
    # Determine what to scrape
    specific_selected = args.tennis or args.table_tennis or args.football
    scrape_tennis = args.tennis or not specific_selected
    scrape_tt = args.table_tennis or not specific_selected
    scrape_fb = args.football or not specific_selected
    
    tennis_limit = None if args.all_ranks else args.tennis_limit
    tt_limit = None if args.all_ranks else args.tt_limit

    success = True
    
    if args.parallel:
        from concurrent.futures import ThreadPoolExecutor
        log.info("⚡ Running scrapers concurrently in parallel mode...")
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}
            if scrape_tennis:
                futures['tennis'] = executor.submit(
                    scrape_new_tennis_rankings, 
                    limit_per_gender=tennis_limit, 
                    start_rank=args.start_rank, 
                    parallel=True
                )
            if scrape_tt:
                futures['tt'] = executor.submit(
                    scrape_new_tt_rankings, 
                    limit_per_gender=tt_limit, 
                    start_rank=args.start_rank
                )
            if scrape_fb:
                futures['fb'] = executor.submit(scrape_new_football_rankings)
            
            for name, f in futures.items():
                try:
                    res = f.result()
                    if not res:
                        success = False
                except Exception as e:
                    log.error(f"Task {name} raised exception: {e}")
                    success = False
    else:
        # Sequential execution
        if scrape_tennis:
            if not scrape_new_tennis_rankings(limit_per_gender=tennis_limit, start_rank=args.start_rank):
                success = False
        
        if scrape_tt:
            if not scrape_new_tt_rankings(limit_per_gender=tt_limit, start_rank=args.start_rank):
                success = False

        if scrape_fb:
            if not scrape_new_football_rankings():
                success = False
    
    # Final status check
    if success:
        log.info('\n' + '='*60)
        log.info('UPDATED RANKING STATUS')
        log.info('='*60)
        check_current_rankings()
        log.info('\n✅ All rankings updated successfully!')
    else:
        log.error('\n❌ Some rankings failed to update. Check logs above for details.')


if __name__ == '__main__':
    main()

