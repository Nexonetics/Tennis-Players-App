#!/usr/bin/env python3
"""
Scrape Date of Birth (DOB) and Pictures for Historical Tennis and Table Tennis Players.
Utilizes the Wikidata public entities and Special:EntityData APIs to resolve players
missing birth dates and enriches the database records.
Now supports concurrent processing and multi-sport logic.
"""

import os
import sys
import argparse
import time
import urllib.parse
import requests
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import func, text
import concurrent.futures

# Set up paths
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

# Load environment variables
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from sqlalchemy import event
from app.db.session import SessionLocal, engine
from app.models.tt_player import TableTennisPlayer, TableTennisHistoricalPlayer, TableTennisHistoricalRanking
from app.models.player import Player, TennisHistoricalPlayer, TennisHistoricalRanking
from scraper.utils.logger import log

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # Only run PRAGMAs for SQLite connections
    conn_type = type(dbapi_connection).__name__.lower()
    if "sqlite" in conn_type:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA synchronous = OFF")
        cursor.execute("PRAGMA journal_mode = MEMORY")
        cursor.close()

HEADERS = {
    "User-Agent": "TableTennisPlayerDatabaseScraper/2.0 (contact: info@example.com; github.com/nexonetics/tennis_app)"
}

def clean_name(name_str):
    if not name_str:
        return ""
    import re
    return re.sub(r'\s+', ' ', name_str).strip()

def get_wikidata_player_details(first_name, last_name, sport, delay=1.0):
    """
    Search Wikidata for a player with the given names and sport.
    sport: 'tt' or 'tennis'
    """
    first_name = clean_name(first_name)
    last_name = clean_name(last_name)
    
    name1 = f"{first_name} {last_name}".strip()
    name2 = f"{last_name} {first_name}".strip()
    
    sport_term = "table tennis" if sport == "tt" else "tennis"
    valid_occupations = ["Q13382519", "Q11903303"] if sport == "tt" else ["Q10833314"]
    
    queries = []
    if name1:
        queries.append(f"{name1} {sport_term}")
    if name2 and name2 != name1:
        queries.append(f"{name2} {sport_term}")
    if name1:
        queries.append(name1)
    if name2 and name2 != name1:
        queries.append(name2)
        
    seen = set()
    queries = [q for q in queries if not (q in seen or seen.add(q))]
    
    for search_term in queries:
        url_search = "https://www.wikidata.org/w/api.php"
        params_search = {
            "action": "wbsearchentities",
            "search": search_term,
            "language": "en",
            "format": "json"
        }
        
        try:
            log.debug(f"Querying Wikidata search for: '{search_term}'")
            r = requests.get(url_search, params=params_search, headers=HEADERS, timeout=10)
            if r.status_code == 429:
                log.warning(f"Rate limited (429) on search '{search_term}'. Sleeping...")
                time.sleep(5)
                continue
            r.raise_for_status()
            
            search_results = r.json().get("search", [])
            if not search_results:
                time.sleep(delay)
                continue
                
            for result in search_results[:3]:
                entity_id = result["id"]
                description = result.get("description", "")
                
                url_data = f"https://www.wikidata.org/wiki/Special:EntityData/{entity_id}.json"
                r_data = requests.get(url_data, headers=HEADERS, timeout=10)
                if r_data.status_code == 429:
                    log.warning(f"Rate limited (429) on entity {entity_id}. Sleeping...")
                    time.sleep(5)
                    continue
                r_data.raise_for_status()
                
                entity_data = r_data.json().get("entities", {}).get(entity_id, {})
                claims = entity_data.get("claims", {})
                
                p31 = claims.get("P31", [])
                is_human = False
                for c in p31:
                    if c.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") == "Q5":
                        is_human = True
                        break
                        
                if not is_human:
                    continue
                    
                is_correct_sport = False
                p106 = claims.get("P106", [])
                for occ in p106:
                    occ_id = occ.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
                    if occ_id in valid_occupations:
                        is_correct_sport = True
                        break
                        
                desc_lower = description.lower()
                if not is_correct_sport:
                    if sport == "tt":
                        if "table tennis" in desc_lower or "ping pong" in desc_lower or "ittf" in desc_lower:
                            is_correct_sport = True
                    else:
                        if "tennis player" in desc_lower or "wta" in desc_lower or "atp" in desc_lower:
                            is_correct_sport = True
                            
                if is_correct_sport:
                    enrichment = {
                        "entity_id": entity_id,
                        "birth_year": None,
                        "birth_month": None,
                        "birth_date": None,
                        "picture": None,
                    }
                    
                    p569 = claims.get("P569", [])
                    if p569:
                        time_val = p569[0].get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("time")
                        if time_val:
                            time_str = time_val.lstrip("+")
                            date_part = time_str.split("T")[0]
                            parts = date_part.split("-")
                            if len(parts) >= 3:
                                try:
                                    year = int(parts[0])
                                    month = int(parts[1]) if parts[1] != "00" else None
                                    day = int(parts[2]) if parts[2] != "00" else None
                                    
                                    if 1800 < year <= datetime.now().year:
                                        enrichment["birth_year"] = year
                                        enrichment["birth_month"] = month
                                        enrichment["birth_date"] = day
                                except ValueError:
                                    pass
                                    
                    p18 = claims.get("P18", [])
                    if p18:
                        filename = p18[0].get("mainsnak", {}).get("datavalue", {}).get("value")
                        if filename:
                            encoded_filename = urllib.parse.quote(filename)
                            enrichment["picture"] = f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded_filename}"
                            
                    time.sleep(delay)
                    return enrichment
                    
                time.sleep(delay)
        except Exception as e:
            log.error(f"Error querying Wikidata for '{search_term}': {e}")
            time.sleep(delay)
            
    return None

def sync_local(db, dialect_name, sport):
    """Sync DOBs locally from active players table to historical table."""
    row_count = 0
    if sport == "tt":
        log.info("Phase 1: Syncing Table Tennis DOBs locally...")
        if dialect_name == "postgresql":
            sql = """
            UPDATE tt_players_historical hp
            SET 
              birth_year = CAST(EXTRACT(YEAR FROM ap.birth_date) AS INTEGER),
              birth_month = CAST(EXTRACT(MONTH FROM ap.birth_date) AS INTEGER),
              birth_date = CAST(EXTRACT(DAY FROM ap.birth_date) AS INTEGER),
              picture = COALESCE(hp.picture, ap.image_url)
            FROM table_tennis_players ap
            WHERE 
              hp.birth_year IS NULL
              AND ap.birth_date IS NOT NULL
              AND (
                LOWER(hp.first_name || ' ' || hp.last_name) = LOWER(ap.name)
                OR LOWER(hp.last_name || ' ' || hp.first_name) = LOWER(ap.name)
              );
            """
            result = db.execute(text(sql))
            row_count = result.rowcount
        elif dialect_name == "sqlite":
            sql = """
            UPDATE tt_players_historical
            SET
              birth_year = CAST(strftime('%Y', (
                SELECT birth_date FROM table_tennis_players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              birth_month = CAST(strftime('%m', (
                SELECT birth_date FROM table_tennis_players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              birth_date = CAST(strftime('%d', (
                SELECT birth_date FROM table_tennis_players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              picture = COALESCE(picture, (
                SELECT image_url FROM table_tennis_players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              ))
            WHERE birth_year IS NULL AND EXISTS (
              SELECT 1 FROM table_tennis_players 
              WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                 OR LOWER(name) = LOWER(last_name || ' ' || first_name)
            );
            """
            result = db.execute(text(sql))
            row_count = result.rowcount
    elif sport == "tennis":
        log.info("Phase 1: Syncing Tennis DOBs locally...")
        if dialect_name == "postgresql":
            sql = """
            UPDATE tennis_players_historical hp
            SET 
              birth_year = CAST(EXTRACT(YEAR FROM ap.birth_date) AS INTEGER),
              birth_month = CAST(EXTRACT(MONTH FROM ap.birth_date) AS INTEGER),
              birth_date = CAST(EXTRACT(DAY FROM ap.birth_date) AS INTEGER),
              picture = COALESCE(hp.picture, ap.image_url)
            FROM players ap
            WHERE 
              hp.birth_year IS NULL
              AND ap.birth_date IS NOT NULL
              AND (
                LOWER(hp.first_name || ' ' || hp.last_name) = LOWER(ap.name)
                OR LOWER(hp.last_name || ' ' || hp.first_name) = LOWER(ap.name)
              );
            """
            result = db.execute(text(sql))
            row_count = result.rowcount
        elif dialect_name == "sqlite":
            sql = """
            UPDATE tennis_players_historical
            SET
              birth_year = CAST(strftime('%Y', (
                SELECT birth_date FROM players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              birth_month = CAST(strftime('%m', (
                SELECT birth_date FROM players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              birth_date = CAST(strftime('%d', (
                SELECT birth_date FROM players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              )) AS INTEGER),
              picture = COALESCE(picture, (
                SELECT image_url FROM players 
                WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                   OR LOWER(name) = LOWER(last_name || ' ' || first_name) 
                LIMIT 1
              ))
            WHERE birth_year IS NULL AND EXISTS (
              SELECT 1 FROM players 
              WHERE LOWER(name) = LOWER(first_name || ' ' || last_name) 
                 OR LOWER(name) = LOWER(last_name || ' ' || first_name)
            );
            """
            result = db.execute(text(sql))
            row_count = result.rowcount
            
    db.commit()
    log.info(f"Local sync complete for {sport}. Enriched {row_count} players locally.")

def process_player(player_data):
    """Worker function to process a single player."""
    pid, first_name, last_name, sport, delay = player_data
    enrichment = get_wikidata_player_details(first_name, last_name, sport, delay)
    return pid, enrichment, sport, first_name, last_name

def main():
    parser = argparse.ArgumentParser(description="Scrape and Enrich Player DOBs from Wikidata.")
    parser.add_argument("--sport", type=str, choices=['tt', 'tennis', 'all'], default='all', help="Sport to scrape (tt, tennis, all)")
    parser.add_argument("--limit", type=int, default=100, help="Number of players to enrich via Wikidata per sport (default: 100)")
    parser.add_argument("--delay", type=float, default=1.0, help="Base delay between requests (default: 1.0)")
    parser.add_argument("--workers", type=int, default=5, help="Number of concurrent workers (default: 5)")
    parser.add_argument("--all", action="store_true", help="Scrape all missing players")
    parser.add_argument("--skip-wikidata", action="store_true", help="Skip Wikidata querying, only sync local cache")
    args = parser.parse_args()
    
    db = SessionLocal()
    dialect_name = engine.dialect.name
    
    sports_to_process = ['tt', 'tennis'] if args.sport == 'all' else [args.sport]
    
    try:
        # Phase 1: Local Sync
        for sport in sports_to_process:
            sync_local(db, dialect_name, sport)
            
        if args.skip_wikidata:
            return
            
        # Phase 2: Wikidata Scraping Preparation
        log.info(f"\nPhase 2: Scraping remaining players from Wikidata using {args.workers} workers...")
        
        tasks = []
        
        if 'tt' in sports_to_process:
            query = db.query(TableTennisHistoricalPlayer).\
                outerjoin(TableTennisHistoricalRanking).\
                filter(TableTennisHistoricalPlayer.birth_year == None).\
                group_by(TableTennisHistoricalPlayer.id).\
                order_by(func.min(TableTennisHistoricalRanking.rank).asc())
            if not args.all: query = query.limit(args.limit)
            tt_players = query.all()
            for p in tt_players:
                tasks.append((p.id, p.first_name, p.last_name, 'tt', args.delay))
                
        if 'tennis' in sports_to_process:
            query = db.query(TennisHistoricalPlayer).\
                outerjoin(TennisHistoricalRanking).\
                filter(TennisHistoricalPlayer.birth_year == None).\
                group_by(TennisHistoricalPlayer.id).\
                order_by(func.min(TennisHistoricalRanking.rank).asc())
            if not args.all: query = query.limit(args.limit)
            tennis_players = query.all()
            for p in tennis_players:
                tasks.append((p.id, p.first_name, p.last_name, 'tennis', args.delay))
                
        total_tasks = len(tasks)
        if total_tasks == 0:
            log.info("No players found missing date of birth.")
            return
            
        log.info(f"Starting Wikidata enrichment for {total_tasks} players in parallel...")
        
        success_count = 0
        image_count = 0
        processed = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            future_to_player = {executor.submit(process_player, task): task for task in tasks}
            
            for future in concurrent.futures.as_completed(future_to_player):
                processed += 1
                try:
                    pid, enrichment, sport, fname, lname = future.result()
                    log.info(f"[{processed}/{total_tasks}] Processed: {fname} {lname} ({sport})")
                    
                    if enrichment:
                        Model = TableTennisHistoricalPlayer if sport == 'tt' else TennisHistoricalPlayer
                        player = db.query(Model).filter(Model.id == pid).first()
                        
                        if player:
                            updated = False
                            if enrichment["birth_year"]:
                                player.birth_year = enrichment["birth_year"]
                                player.birth_month = enrichment["birth_month"]
                                player.birth_date = enrichment["birth_date"]
                                success_count += 1
                                updated = True
                                dob_str = f"{enrichment['birth_year']}-{enrichment['birth_month'] or 'XX'}-{enrichment['birth_date'] or 'XX'}"
                                log.info(f"  -> Found DOB: {dob_str}")
                                
                            if enrichment["picture"] and not player.picture:
                                player.picture = enrichment["picture"]
                                image_count += 1
                                updated = True
                                log.info(f"  -> Found Profile Image: {enrichment['picture']}")
                                
                            if updated:
                                db.commit()
                    else:
                        log.info(f"  -> No matching player found on Wikidata for {fname} {lname}.")
                except Exception as exc:
                    log.error(f"Player processing generated an exception: {exc}")
                    
        log.info("\nEnrichment Process Completed!")
        log.info(f"Successfully enriched birth dates for {success_count}/{total_tasks} players.")
        log.info(f"Added profile images for {image_count} players.")
        
    except Exception as e:
        log.error(f"Error during enrichment main loop: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
