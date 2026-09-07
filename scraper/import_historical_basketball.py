import os
import sys
import re
import time
import requests
import json
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(script_dir)
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

load_dotenv(os.path.join(project_root, 'backend', '.env'))

from app.db.session import SessionLocal, engine, Base
from app.models.basketball_national_team import (
    BasketballNationalTeam,
    BasketballHistoricalTeam,
    BasketballHistoricalRanking
)
from scraper.utils.logger import log

# Ensure tables are created
Base.metadata.create_all(bind=engine)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.fiba.basketball/"
}

NAME_MAPPINGS = {
    "USA": "United States",
    "IR Iran": "Iran",
    "Korea Republic": "South Korea",
    "Korea DPR": "North Korea",
    "Côte d'Ivoire": "Ivory Coast",
    "Cabo Verde": "Cape Verde",
    "Czechia": "Czech Republic",
    "St. Kitts and Nevis": "Saint Kitts and Nevis",
    "St. Vincent and the Grenadines": "Saint Vincent and the Grenadines",
    "St. Lucia": "Saint Lucia",
}

def clean_team_name(name: str) -> str:
    if not name:
        return ""
    cleaned = name.strip()
    return NAME_MAPPINGS.get(cleaned, cleaned)


def fetch_fiba_ranking_dates(category: str):
    """
    Fetch all ranking release options for men or women from FIBA ranking page select.
    Returns list of dicts: [{'iso': ..., 'year': ..., 'month': ..., 'day': ...}]
    """
    url = f"https://www.fiba.basketball/en/ranking/{category}"
    log.info(f"Extracting historical ranking release dates from {url}...")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        select = soup.find('select', id=lambda x: x and 'rankingDates' in x)
        if not select:
            # Fallback regex for dates in text
            iso_dates = set(re.findall(r'(\d{4}-\d{2}-\d{2}T00:00:00\.000Z)', resp.text))
        else:
            iso_dates = set([opt.get('value') for opt in select.find_all('option') if opt.get('value')])
            
        schedules = []
        for iso_str in iso_dates:
            try:
                dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
                schedules.append({
                    'iso': iso_str,
                    'year': dt.year,
                    'month': dt.month,
                    'day': dt.day,
                    'dt': dt
                })
            except Exception:
                pass
                
        # Sort chronologically (oldest to newest)
        schedules.sort(key=lambda x: x['dt'])
        log.info(f"Found {len(schedules)} historical release dates for FIBA {category}.")
        return schedules
    except Exception as e:
        log.error(f"Error fetching FIBA dates for {category}: {e}")
        return []


def import_rankings_for_category(category: str):
    schedules = fetch_fiba_ranking_dates(category)
    
    db = SessionLocal()
    
    # Pre-cache historical teams into memory
    teams_cache = {}
    existing_teams = db.query(BasketballHistoricalTeam).filter(
        BasketballHistoricalTeam.category == category
    ).all()
    for t in existing_teams:
        teams_cache[t.name.lower()] = t.id

    total_rankings_added = 0
    
    # If no schedules found, fallback to scraping current live page as checkpoint
    if not schedules:
        now = datetime.now()
        schedules = [{
            'iso': now.isoformat(),
            'year': now.year,
            'month': now.month,
            'day': now.day,
            'dt': now
        }]
    
    for idx, sched in enumerate(schedules):
        year = sched['year']
        month = sched['month']
        day = sched['day']
        
        url = f"https://www.fiba.basketball/en/ranking/{category}"
        
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                continue
                
            soup = BeautifulSoup(r.text, 'html.parser')
            tables = soup.find_all('table')
            if not tables:
                continue
                
            rows = tables[0].find_all('tr')
            if len(rows) <= 1:
                continue
                
            rankings_to_insert = []
            
            for row in rows[1:]:
                cols = row.find_all(['th', 'td'])
                if len(cols) < 4:
                    continue
                
                raw_rank = cols[0].text.strip().replace('.', '')
                try:
                    rank = int(raw_rank)
                except ValueError:
                    continue
                    
                raw_name = cols[1].text.strip()
                if not raw_name:
                    continue
                    
                team_name = clean_team_name(raw_name)
                
                raw_pts = cols[3].text.strip().replace(',', '')
                try:
                    points = float(raw_pts)
                except ValueError:
                    points = 0.0
                
                # Check or create historical team
                team_key = team_name.lower()
                team_id = teams_cache.get(team_key)
                if not team_id:
                    new_team = BasketballHistoricalTeam(
                        name=team_name,
                        country=team_name,
                        confederation="FIBA Americas",
                        category=category
                    )
                    db.add(new_team)
                    db.flush()
                    team_id = new_team.id
                    teams_cache[team_key] = team_id
                    
                # Check if ranking already exists
                existing_r = db.query(BasketballHistoricalRanking.id).filter(
                    BasketballHistoricalRanking.team_id == team_id,
                    BasketballHistoricalRanking.ranking_year == year,
                    BasketballHistoricalRanking.ranking_month == month,
                    BasketballHistoricalRanking.ranking_date == day
                ).first()
                
                if not existing_r:
                    rankings_to_insert.append(BasketballHistoricalRanking(
                        team_id=team_id,
                        points=points,
                        rank=rank,
                        ranking_date=day,
                        ranking_month=month,
                        ranking_year=year
                    ))
                    
            if rankings_to_insert:
                db.bulk_save_objects(rankings_to_insert)
                db.commit()
                total_rankings_added += len(rankings_to_insert)
                
            if (idx + 1) % 5 == 0 or idx == len(schedules) - 1:
                log.info(f"[{category.upper()}] Processed schedule date {idx + 1}/{len(schedules)}: {sched['year']}-{sched['month']:02d}-{sched['day']:02d} - Added {total_rankings_added} checkpoints so far.")
                
            time.sleep(0.1)
            
        except Exception as e:
            log.error(f"Error processing basketball date {sched}: {e}")
            db.rollback()
            
    db.close()
    log.info(f"[{category.upper()}] Basketball Import complete! Total ranking checkpoints stored: {total_rankings_added}")


def main():
    log.info("Starting Historical Basketball National Teams Ranking Import...")
    log.info("--- Importing Men's Basketball Rankings History ---")
    import_rankings_for_category("men")
    
    log.info("--- Importing Women's Basketball Rankings History ---")
    import_rankings_for_category("women")
    
    log.info("Historical Basketball Ranking Import completed successfully.")

if __name__ == "__main__":
    main()
