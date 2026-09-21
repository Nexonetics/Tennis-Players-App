#!/usr/bin/env python3
"""
Full Comprehensive Scraper & Asset Pipeline
===========================================
1. Scrapes ALL available rankings & profile details for ATP Men's Singles.
2. Scrapes ALL available rankings & profile details for WTA Women's Singles.
3. Scrapes ALL available rankings & profile details for WTT Table Tennis.
4. Auto-enriches new player profiles with Wikipedia / WTT APIs (birth date, height, style, picture).
5. Runs career high enrichment.
6. Regenerates all local frontend cache files (frontend/assets/data/*.json & web/src/data/json/*.json).
"""

import os
import sys
import time

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from scraper.scrapers.atp_scraper import ATPScraper
from scraper.scrapers.wta_scraper import WTAScraper
from scraper.scrapers.wtt_scraper import WTTScraper


def run_full_scrape():
    print("=" * 70)
    print("🚀 FULL UNLIMITED SCRAPE & ENRICHMENT PIPELINE")
    print("=" * 70)

    # 1. ATP Tennis Scrape (Unlimited)
    print("\n1. Running Full ATP Men's Singles Scraper (Unlimited Ranks)...")
    try:
        atp = ATPScraper()
        atp.scrape_rankings(limit=None)
    except Exception as e:
        print(f"❌ Error in ATP scrape: {e}")

    # 2. WTA Tennis Scrape (Unlimited)
    print("\n2. Running Full WTA Women's Singles Scraper (Unlimited Ranks)...")
    try:
        wta = WTAScraper()
        wta.scrape_rankings(limit=None)
    except Exception as e:
        print(f"❌ Error in WTA scrape: {e}")

    # 3. WTT Table Tennis Scrape (Unlimited)
    print("\n3. Running Full WTT Table Tennis Scraper (Unlimited Ranks)...")
    try:
        wtt = WTTScraper()
        wtt.scrape_rankings(limit=None)
    except Exception as e:
        print(f"❌ Error in WTT scrape: {e}")

    print("\n" + "=" * 70)
    print("🎉 FULL UNLIMITED SCRAPE COMPLETED!")
    print("=" * 70)

if __name__ == '__main__':
    run_full_scrape()
