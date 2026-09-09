import sys
import os
import argparse
from concurrent.futures import ThreadPoolExecutor

# Add current directory and project root to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(script_dir)
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

# Local imports from scrapers/ subdirectory
from scrapers.atp_scraper import ATPScraper
from scrapers.wta_scraper import WTAScraper
from scrapers.wtt_scraper import WTTScraper
from scrapers.football_national_team_scraper import FootballNationalTeamScraper
from scrapers.basketball_national_team_scraper import BasketballNationalTeamScraper
from utils.logger import log

def run_atp():
    try:
        atp = ATPScraper()
        atp.scrape_rankings(limit=500)
    except Exception as e:
        log.error(f"ATP Scraper failed: {e}")

def run_wta():
    try:
        wta = WTAScraper()
        wta.scrape_rankings(limit=500)
    except Exception as e:
        log.error(f"WTA Scraper failed: {e}")

def run_tennis_scraper(parallel=True):
    log.info(f"Starting Tennis Scraper (Parallel={parallel})...")
    if parallel:
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.submit(run_atp)
            executor.submit(run_wta)
    else:
        run_atp()
        run_wta()

def run_tt_scraper():
    log.info("Starting Table Tennis Scraper...")
    wtt = WTTScraper()
    wtt.scrape_rankings(limit=500)

def run_football_scraper():
    log.info("Starting Football National Team Scraper...")
    fb = FootballNationalTeamScraper()
    fb.scrape_all()

def run_basketball_scraper():
    log.info("Starting Basketball National Team Scraper...")
    bb = BasketballNationalTeamScraper()
    bb.scrape_all()

def main():
    parser = argparse.ArgumentParser(description="Multi-Sport Web Scraper")
    parser.add_argument("--tennis-only", action="store_true", help="Run only Tennis scraper")
    parser.add_argument("--tt-only", action="store_true", help="Run only Table Tennis scraper")
    parser.add_argument("--football-only", action="store_true", help="Run only Football Club scraper")
    parser.add_argument("--basketball-only", action="store_true", help="Run only Basketball Club scraper")
    parser.add_argument("--no-parallel", action="store_true", help="Disable parallel execution")
    
    args = parser.parse_args()
    parallel = not args.no_parallel

    # Check for pause flag
    if os.getenv("SCRAPER_PAUSE", "").lower() == "true":
        log.info("Scraper is currently PAUSED via environment variable.")
        return

    if args.tennis_only:
        run_tennis_scraper(parallel=parallel)
    elif args.tt_only:
        run_tt_scraper()
    elif args.football_only:
        run_football_scraper()
    elif args.basketball_only:
        run_basketball_scraper()
    else:
        # Run all scrapers in parallel
        log.info(f"Starting all scrapers in parallel (Parallel={parallel})...")
        if parallel:
            with ThreadPoolExecutor(max_workers=5) as executor:
                executor.submit(run_tennis_scraper, True)
                executor.submit(run_tt_scraper)
                executor.submit(run_football_scraper)
                executor.submit(run_basketball_scraper)
        else:
            run_tennis_scraper(parallel=False)
            run_tt_scraper()
            run_football_scraper()
            run_basketball_scraper()

if __name__ == "__main__":
    main()
