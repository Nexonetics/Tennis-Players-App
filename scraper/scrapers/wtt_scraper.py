"""
WTT (World Table Tennis) Scraper
Scrapes men's and women's rankings from worldtabletennis.com with Wikipedia fallback.
"""
import sys
import os
import random
import urllib.parse
import re
import requests
from datetime import datetime, timedelta

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from scraper.base_scraper import BaseScraper
from scraper.utils.logger import log
from scraper.tt_persistence import save_tt_player
from scraper.historical_persistence import save_tt_player_with_rank
from app.db.session import SessionLocal
from app.models.tt_player import TableTennisPlayer, TableTennisHistoricalPlayer

# Wikipedia REST API for player thumbnail images
WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"

# WTT Official API for player details
WTT_PLAYER_API_URL = "https://wtt-website-api-prod-3-frontdoor-bddnb2haduafdze9.a01.azurefd.net/api/cms/GetPlayersDataByID/"

# Known top men's TT players (fallback dataset with birth dates)
KNOWN_MEN = [
    ("Wang Chuqin", "China", 1, "2000-05-11"),
    ("Fan Zhendong", "China", 2, "1997-01-22"),
    ("Ma Long", "China", 3, "1988-10-20"),
    ("Hugo Calderano", "Brazil", 4, "1996-06-22"),
    ("Felix Lebrun", "France", 5, "2006-09-12"),
    ("Lin Shidong", "China", 6, "2005-04-18"),
    ("Tomokazu Harimoto", "Japan", 7, "2003-06-27"),
    ("Truls Moregard", "Sweden", 10, "2002-02-16"),
]

# Known top women's TT players
KNOWN_WOMEN = [
    ("Sun Yingsha", "China", 1, "2000-11-04"),
    ("Wang Manyu", "China", 2, "1999-02-09"),
    ("Chen Meng", "China", 3, "1994-01-15"),
    ("Wang Yidi", "China", 4, "1997-02-14"),
    ("Hina Hayata", "Japan", 5, "2000-07-07"),
    ("Mima Ito", "Japan", 10, "2000-10-21"),
]


class WTTScraper(BaseScraper):
    """Scrapes WTT/ITTF table tennis world rankings."""

    def __init__(self):
        super().__init__("https://www.worldtabletennis.com/allplayersranking")
        self.api_session = requests.Session()
        self.api_session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        })

    def scrape_rankings(self, limit=1000):
        """Scrape both men's and women's TT rankings across Senior and Youth categories."""
        from concurrent.futures import ThreadPoolExecutor
        log.info(f"Starting WTT table tennis scraping (limit {limit} per gender)...")

        db = SessionLocal()
        existing_names = set()
        try:
            for row in db.query(TableTennisPlayer.name).all():
                if row[0]: existing_names.add(row[0].strip().lower())
            for p in db.query(TableTennisHistoricalPlayer.first_name, TableTennisHistoricalPlayer.last_name).all():
                existing_names.add(f"{p[0]} {p[1]}".strip().lower())
        except Exception as e:
            log.warning(f"Could not load existing TT players cache: {e}")
        finally:
            db.close()
        self.existing_names = existing_names
        log.info(f"Loaded {len(existing_names)} existing table tennis players from DB.")

        def run_scrape(tab_name, gender, category):
            return self._scrape_gender(tab_name, gender, limit, category)

        total_men = 0
        total_women = 0

        # Primary categories
        for category in ["SENIOR", "YOUTH"]:
            log.info(f"Scraping {category} rankings in parallel...")
            with ThreadPoolExecutor(max_workers=2) as executor:
                future_men = executor.submit(run_scrape, "MEN'S SINGLES", "M", category)
                future_women = executor.submit(run_scrape, "WOMEN'S SINGLES", "F", category)
                
                total_men += future_men.result()
                total_women += future_women.result()

        log.info(f"WTT scraping complete: {total_men} men, {total_women} women saved.")

    def _scrape_gender(self, tab_name: str, gender: str, limit: int, category: str) -> int:
        """Iterate through rank ranges for a specific gender and category."""
        import time
        total_scraped = 0
        rank_start = 1
        consecutive_empty = 0
        # Hard ceiling: don't request pages beyond this rank regardless of limit
        max_rank = 2000 if category == "SENIOR" else 1000

        while total_scraped < limit and consecutive_empty < 5 and rank_start <= max_rank:
            log.info(f"Scraping {category} {tab_name} range starting at {rank_start}...")

            encoded_tab = urllib.parse.quote(tab_name)
            url = f"{self.base_url}?selectedTab={encoded_tab}&Age={category}&Rank={rank_start}"

            try:
                soup = self.get_soup_playwright(url)
                if not soup:
                    log.warning(f"Could not load page for {category} {tab_name} at rank {rank_start}")
                    consecutive_empty += 1
                    rank_start += 100
                    time.sleep(random.uniform(2, 4))
                    continue

                scraped_in_page = self._parse_wtt_page(soup, gender, limit - total_scraped)

                if scraped_in_page == 0:
                    log.info(f"No players found for {category} {tab_name} at rank {rank_start}. Retrying once...")
                    time.sleep(random.uniform(2, 4))
                    # Single retry before counting as empty
                    soup2 = self.get_soup_playwright(url)
                    if soup2:
                        scraped_in_page = self._parse_wtt_page(soup2, gender, limit - total_scraped)

                if scraped_in_page == 0:
                    log.info(f"Still empty for {category} {tab_name} at rank {rank_start}. consecutive_empty={consecutive_empty + 1}")
                    consecutive_empty += 1
                else:
                    total_scraped += scraped_in_page
                    consecutive_empty = 0

                rank_start += 100
                time.sleep(random.uniform(1, 2))

            except Exception as e:
                log.error(f"Error scraping {category} {tab_name} at rank {rank_start}: {e}")
                consecutive_empty += 1
                rank_start += 100

        # Fallback only if we found almost nothing
        if total_scraped < 5 and category == "SENIOR":
            dataset = KNOWN_MEN if gender == "M" else KNOWN_WOMEN
            log.info(f"Falling back to known dataset for {gender} (only {total_scraped} scraped)")
            fallback_scraped = self._save_known_dataset(dataset, gender, limit - total_scraped)
            total_scraped += fallback_scraped

        return total_scraped

    def _parse_wtt_page(self, soup, gender: str, limit: int) -> int:
        """Parse WTT ranking HTML table and enrich each player with API data."""
        scraped = 0
        
        # Rows are usually in this class
        rows = soup.select("tr.cursor_move")
        if not rows:
            rows = soup.select("table tbody tr")

        log.debug(f"Found {len(rows)} potential rows to parse.")

        for row in rows:
            if scraped >= limit:
                break
            try:
                rank_cell = row.select_one(".player-rank")
                if not rank_cell:
                    continue
                
                # Clone or work on a copy to avoid modifying the original row if needed
                # but here we can just find and remove the diff element
                for diff in rank_cell.select("app-rank-diff, .rank-diff"):
                    diff.decompose()
                
                rank_text = rank_cell.get_text(strip=True)
                rank_match = re.search(r"(\d+)", rank_text)
                if not rank_match:
                    continue
                ranking = int(rank_match.group(1))

                name_cell = row.select_one(".player_name")
                # Handle nested span for name
                if name_cell and name_cell.select_one("span.link_on_hover"):
                    name_text = name_cell.select_one("span.link_on_hover").get_text(strip=True)
                elif name_cell:
                    name_text = name_cell.get_text(strip=True)
                else:
                    continue

                country_cell = row.select_one(".country_name")

                # Extract Player ID from link
                link_el = name_cell.select_one("a[href*='playerId=']")
                player_id = None
                if link_el:
                    href = link_el.get("href")
                    id_match = re.search(r"playerId=(\d+)", href)
                    if id_match:
                        player_id = id_match.group(1)

                name = name_text
                country = country_cell.get_text(strip=True) if country_cell else "Unknown"

                points = 0
                pts_cell = row.select_one(".player-points") or row.select_one(".points")
                if pts_cell:
                    try:
                        p_str = re.sub(r"\D", "", pts_cell.get_text(strip=True))
                        if p_str: points = int(p_str)
                    except Exception:
                        pass

                # Initial data
                player_data = {
                    "name": name,
                    "country": country,
                    "ranking": ranking,
                    "points": points,
                    "gender": gender,
                    "source": "WTT Official",
                }

                is_existing = name.lower() in getattr(self, "existing_names", set())

                # Enrich with API only if new player
                if player_id and not is_existing:
                    enriched_data = self._enrich_player_data(player_id)
                    if enriched_data:
                        player_data.update(enriched_data)
                    getattr(self, "existing_names", set()).add(name.lower())
                    import time
                    time.sleep(0.2)
                
                # If we still don't have stats, add fallback data as last resort
                if "win_percentage" not in player_data:
                    player_data.update(self._generate_fallback_stats(ranking))

                # Write to legacy flat table (for enrichment fields)
                save_tt_player(player_data)
                # Write to historical tables (so the backend API shows the rank)
                save_tt_player_with_rank(player_data)
                scraped += 1

            except Exception as e:
                log.debug(f"Error parsing WTT row: {e}")

        return scraped

    def _enrich_player_data(self, player_id: str) -> dict | None:
        """Fetch detailed player info from the WTT JSON API."""
        try:
            url = f"{WTT_PLAYER_API_URL}{player_id}"
            response = self.api_session.get(url, timeout=10)
            if response.status_code != 200:
                return None
            
            data = response.json()
            add_data = data.get("additional_data", {})
            player_info = add_data.get("PlayerData", [{}])[0] if add_data.get("PlayerData") else {}
            stats_info = add_data.get("StatsData", [{}]) if add_data.get("StatsData") else []

            # Extract birth date
            birth_date = None
            dob_str = player_info.get("DOB")
            if dob_str:
                try:
                    # Format: 09/12/2006 00:00:00 (usually MM/DD/YYYY in some contexts, but let's check)
                    # WTT often uses DD/MM/YYYY for international players. Felix is Sept 12.
                    birth_date = datetime.strptime(dob_str.split()[0], "%m/%d/%Y").date()
                except:
                    try:
                        birth_date = datetime.strptime(dob_str.split()[0], "%d/%m/%Y").date()
                    except:
                        pass

            # Playing style
            style_parts = []
            if player_info.get("Handedness"): style_parts.append(player_info["Handedness"])
            if player_info.get("Grip"): style_parts.append(player_info["Grip"])
            if player_info.get("Style"): style_parts.append(player_info["Style"])
            playing_style = " / ".join(style_parts) if style_parts else "N/A"

            # Win percentage (usually in MS category)
            win_percentage = None
            for stat in stats_info:
                if stat.get("SubeventCode") == "MS" or not win_percentage:
                    try:
                        win_percentage = float(stat.get("winning_percentage", 0) or 0)
                    except:
                        pass
            
            # Image
            image_url = player_info.get("HeadShot") or data.get("headShot")
            
            return {
                "birth_date": birth_date,
                "playing_style": playing_style,
                "win_percentage": win_percentage,
                "image_url": image_url,
            }
        except Exception as e:
            log.debug(f"Error enriching player {player_id}: {e}")
            return None

    def _generate_fallback_stats(self, ranking: int) -> dict:
        """Last resort generator for missing stats."""
        return {
            "win_percentage": 0.0,
            "playing_style": "Right-handed attacker",
        }

    def _save_known_dataset(self, dataset, gender: str, limit: int) -> int:
        """Save from hardcoded known players dataset."""
        saved = 0
        for item in dataset:
            if saved >= limit:
                break
            try:
                name, country, ranking = item[0], item[1], item[2]
                birth_date_str = item[3] if len(item) > 3 else None
                
                player_data = {
                    "name": name,
                    "country": country,
                    "ranking": ranking,
                    "gender": gender,
                    "source": "WTT Fallback",
                }
                
                if birth_date_str:
                    player_data["birth_date"] = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
                
                player_data.update(self._generate_fallback_stats(ranking))
                save_tt_player(player_data)
                saved += 1
            except Exception as e:
                log.error(f"Error saving known TT player {item[0]}: {e}")
        return saved
