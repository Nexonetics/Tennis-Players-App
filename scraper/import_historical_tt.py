import os
import sys
import re
from datetime import datetime, date
from bs4 import BeautifulSoup
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking
from scraper.utils.logger import log

# Association Code to Country Name mapping (for clean country display)
ASSOC_TO_COUNTRY = {
    "CHN": "China",
    "JPN": "Japan",
    "BRA": "Brazil",
    "FRA": "France",
    "SWE": "Sweden",
    "GER": "Germany",
    "TPE": "Taiwan",
    "KOR": "South Korea",
    "IND": "India",
    "HKG": "Hong Kong",
    "ROU": "Romania",
    "USA": "United States",
    "EGY": "Egypt",
    "POR": "Portugal",
    "AUT": "Austria",
    "NGR": "Nigeria",
    "ENG": "England",
    "DEN": "Denmark",
    "ESP": "Spain",
    "ITA": "Italy",
    "POL": "Poland",
    "AUS": "Australia",
    "CAN": "Canada",
    "SGP": "Singapore",
    "THA": "Thailand",
    "BEL": "Belgium",
    "CRO": "Croatia",
    "SLO": "Slovenia",
    "KAZ": "Kazakhstan",
    "SVK": "Slovakia",
    "CZE": "Czech Republic",
    "UKR": "Ukraine",
    "CHI": "Chile",
    "PUR": "Puerto Rico",
    "MEX": "Mexico",
    "NED": "Netherlands",
    "NOR": "Norway",
    "SUI": "Switzerland",
    "TUR": "Turkey",
    "IRI": "Iran",
    "ALG": "Algeria",
    "ARG": "Argentina",
    "ECU": "Ecuador",
    "GRE": "Greece",
    "HUN": "Hungary",
    "NZL": "New Zealand",
    "PRK": "North Korea",
    "SRB": "Serbia",
}

# Fallback dates for weeks if they cannot be extracted from HTML
WEEK_DATE_FALLBACKS = {
    23: date(2026, 6, 2),
    24: date(2026, 6, 9),
    25: date(2026, 6, 16),
    26: date(2026, 6, 23),
    27: date(2026, 6, 30),
    28: date(2026, 7, 7)
}

def clean_name(name_str):
    """Normalize player name (remove extra spaces, uppercase conversion)."""
    if not name_str:
        return ""
    name_str = name_str.replace('^^', ' ')
    name_str = re.sub(r'\s+', ' ', name_str)
    return name_str.strip()

def resolve_player(db, name, country, gender, player_caches):
    """Find or create TableTennisHistoricalPlayer and return player_id."""
    name_cleaned = clean_name(name)
    normalized_name = name_cleaned.lower()
    
    # 1. Try matching "First Last" order case-insensitively in cache
    player_id = player_caches["first_last"].get(normalized_name)
    if player_id:
        return player_id
        
    # 2. Try matching "Last First" order case-insensitively in cache
    player_id = player_caches["last_first"].get(normalized_name)
    if player_id:
        return player_id

    # 3. Try matching outer tokens (first token + last token)
    words = re.findall(r'\b[a-z]+\b', normalized_name)
    if len(words) >= 2 and "tokens" in player_caches:
        t_id = player_caches["tokens"].get((gender, words[0], words[-1]))
        if t_id:
            return t_id
        
    # 4. Create a new player
    # Standard splitting: First word as first_name, rest as last_name
    parts = name_cleaned.split()
    if len(parts) > 1:
        first_name = parts[0]
        last_name = " ".join(parts[1:])
    else:
        first_name = name_cleaned
        last_name = ""
        
    # Standardize country name
    country_name = ASSOC_TO_COUNTRY.get(country.upper(), country)
    
    log.info(f"Creating new TableTennisHistoricalPlayer: {first_name} {last_name} ({country_name}, gender={gender})")
    player = TableTennisHistoricalPlayer(
        first_name=first_name,
        last_name=last_name,
        gender=gender,
        country=country_name
    )
    db.add(player)
    db.flush() # Populate ID
    
    player_id = player.id
    
    # Add to caches
    fl = f"{first_name} {last_name}".strip().lower()
    lf = f"{last_name} {first_name}".strip().lower()
    if fl: player_caches["first_last"][fl] = player_id
    if lf: player_caches["last_first"][lf] = player_id
    if len(words) >= 2 and "tokens" in player_caches:
        player_caches["tokens"][(gender, words[0], words[-1])] = player_id
    
    return player_id

def parse_html_date(soup, week_num):
    """Attempts to find a date in the HTML page."""
    # Look for common date formats or words
    text = soup.get_text()
    
    # E.g. "Tuesday, June 9, 2026" or "2026-06-09"
    date_patterns = [
        r'\b(19|20)\d{2}[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b', # YYYY-MM-DD
        r'\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19|20)\d{2}\b', # DD-MM-YYYY
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b', # Month DD, YYYY
        r'\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b', # DD Month YYYY
    ]
    
    for pat in date_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            date_str = match.group(0)
            log.info(f"Found potential date string in HTML: '{date_str}'")
            try:
                # Parse Month DD, YYYY
                if "," in date_str:
                    return datetime.strptime(date_str, "%B %d, %Y").date()
                # Parse YYYY-MM-DD
                elif "-" in date_str:
                    return datetime.strptime(date_str, "%Y-%m-%d").date()
                elif "/" in date_str:
                    return datetime.strptime(date_str, "%d/%m/%Y").date()
            except Exception:
                pass
                
    # Fallback
    fallback = WEEK_DATE_FALLBACKS.get(week_num)
    if fallback:
        log.info(f"Using computed fallback date for Week {week_num}: {fallback}")
        return fallback
        
    return None

def parse_rankings_table(soup):
    """Parses the ranking table from the soup and returns a list of player ranking dicts."""
    tables = soup.find_all("table")
    if not tables:
        return []
        
    # Find the best table (usually the one with headers like "pos", "player", "assoc", "points")
    best_table = None
    max_rows = 0
    
    for t in tables:
        rows = t.find_all("tr")
        if len(rows) > max_rows:
            max_rows = len(rows)
            best_table = t
            
    if not best_table:
        return []
        
    log.info(f"Parsing table with {max_rows} rows...")
    
    # Analyze headers
    headers = [th.get_text(strip=True).lower() for th in best_table.find_all("th")]
    rank_idx = -1
    name_idx = -1
    assoc_idx = -1
    points_idx = -1
    
    for idx, h in enumerate(headers):
        if any(x in h for x in ["pos", "rank", "rk"]):
            rank_idx = idx
        elif any(x in h for x in ["player", "name"]):
            name_idx = idx
        elif any(x in h for x in ["assoc", "country", "nat"]):
            assoc_idx = idx
        elif any(x in h for x in ["points", "pts"]):
            points_idx = idx
            
    # Default column indices if headers are not found or not standard
    # Usually: Col 0: Rank, Col 1: Name, Col 2: Assoc, Col 3: Points
    if rank_idx == -1: rank_idx = 0
    if name_idx == -1: name_idx = 1
    if assoc_idx == -1: assoc_idx = 2
    if points_idx == -1: points_idx = 3
    
    log.info(f"Columns mapping: rank={rank_idx}, name={name_idx}, assoc={assoc_idx}, points={points_idx}")
    
    rankings_data = []
    rows = best_table.find_all("tr")
    
    for idx, row in enumerate(rows):
        tds = row.find_all("td")
        if not tds or len(tds) <= max(rank_idx, name_idx, assoc_idx, points_idx):
            continue
            
        try:
            rank_str = tds[rank_idx].get_text(strip=True)
            # Remove any non-digits (e.g. rank change markers)
            rank_match = re.search(r"(\d+)", rank_str)
            if not rank_match:
                continue
            rank = int(rank_match.group(1))
            
            name = tds[name_idx].get_text(strip=True)
            # Sometimes player name is inside link or child span
            for link in tds[name_idx].find_all("a"):
                name = link.get_text(strip=True)
            
            assoc = tds[assoc_idx].get_text(strip=True)
            
            points_str = tds[points_idx].get_text(strip=True)
            points_match = re.search(r"([\d,]+)", points_str)
            points = int(points_match.group(1).replace(",", "")) if points_match else 0
            
            if name and rank:
                rankings_data.append({
                    "rank": rank,
                    "name": name,
                    "assoc": assoc,
                    "points": points
                })
        except Exception as e:
            log.debug(f"Row {idx} parse error: {e}")
            
    return rankings_data

def process_file(db, filepath, player_caches):
    """Processes a single ITTF HTML file and saves rankings to DB."""
    filename = os.path.basename(filepath)
    log.info(f"\n==========================================")
    log.info(f"Processing file: {filename}")
    
    # Parse week, gender
    # Expected format: 2026_23_SEN_MS.html or 2026_23_SEN_WS.html
    match = re.search(r"2026_(\d+)_SEN_(MS|WS)", filename)
    if not match:
        log.warning(f"File name format not recognized: {filename}")
        return
        
    week_num = int(match.group(1))
    gender_str = match.group(2)
    gender = 0 if gender_str == "MS" else 1 # 0 for Male, 1 for Female
    
    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    soup = BeautifulSoup(html_content, "html.parser")
    
    ranking_date = parse_html_date(soup, week_num)
    if not ranking_date:
        log.error(f"Could not determine date for Week {week_num}. Skipping.")
        return
        
    year = ranking_date.year
    month = ranking_date.month
    day = ranking_date.day
    
    log.info(f"Target ranking date: {year}-{month:02d}-{day:02d}")
    
    rankings_list = parse_rankings_table(soup)
    log.info(f"Parsed {len(rankings_list)} rankings from table.")
    
    if not rankings_list:
        log.warning(f"No rankings found in {filename}")
        return
        
    # Cache existing rankings for this target date to avoid N+1 query overhead
    log.info("Querying existing rankings for target date...")
    existing_rankings = db.query(TableTennisHistoricalRanking).filter_by(
        ranking_year=year,
        ranking_month=month,
        ranking_date=day
    ).all()
    log.info(f"Found {len(existing_rankings)} existing rankings. Building ID set...")
    existing_player_ids = {rk.player_id for rk in existing_rankings}
    log.info(f"ID set built. Starting to process {len(rankings_list)} rankings...")
    
    added_count = 0
    skipped_count = 0
    
    for idx, r in enumerate(rankings_list):
        if idx > 0 and idx % 100 == 0:
            log.info(f"Processed {idx}/{len(rankings_list)} rankings...")
        try:
            player_id = resolve_player(db, r["name"], r["assoc"], gender, player_caches)
            
            # Check for duplicates in memory
            if player_id in existing_player_ids:
                skipped_count += 1
                continue
                
            new_rank = TableTennisHistoricalRanking(
                player_id=player_id,
                points=r["points"],
                rank=r["rank"],
                ranking_year=year,
                ranking_month=month,
                ranking_date=day
            )
            db.add(new_rank)
            existing_player_ids.add(player_id)
            added_count += 1
            
            # Commit periodically to keep memory usage low
            if added_count % 100 == 0:
                log.info(f"Committing batch of {added_count} rankings...")
                db.commit()
        except Exception as e:
            log.error(f"Error saving ranking for {r.get('name')}: {e}")
            db.rollback()
            
    log.info("Final commit for file...")
    db.commit()
    log.info(f"Completed {filename}: Saved {added_count} rankings, skipped {skipped_count} duplicates.")

def main():
    scraped_dir = os.path.join(project_root, "scratch", "scraped_html")
    if not os.path.exists(scraped_dir):
        log.error(f"Directory {scraped_dir} does not exist.")
        return
        
    db = SessionLocal()
    try:
        # Load and cache all players
        log.info("Loading and caching players from database...")
        all_players = db.query(TableTennisHistoricalPlayer).all()
        first_last_cache = {}
        last_first_cache = {}
        for p in all_players:
            first_name = p.first_name or ""
            last_name = p.last_name or ""
            fl = f"{first_name} {last_name}".strip().lower()
            lf = f"{last_name} {first_name}".strip().lower()
            if fl: first_last_cache[fl] = p.id
            if lf: last_first_cache[lf] = p.id
            
        player_caches = {
            "first_last": first_last_cache,
            "last_first": last_first_cache
        }
        
        files = [os.path.join(scraped_dir, f) for f in os.listdir(scraped_dir) if f.endswith(".html")]
        files.sort()
        
        log.info(f"Found {len(files)} files to process in {scraped_dir}")
        for filepath in files:
            process_file(db, filepath, player_caches)
            
        log.info("\nHistorical Table Tennis ranking import complete!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
