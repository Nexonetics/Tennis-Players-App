import urllib.parse
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from scraper.base_scraper import BaseScraper
from scraper.utils.logger import log
from scraper.persistence import save_player
from scraper.historical_persistence import save_tennis_player_with_rank
from scraper.scrapers.wiki_scraper import WikiScraper
from app.db.session import SessionLocal
from app.models.player import Player, TennisHistoricalPlayer

WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"

class WTAScraper(BaseScraper):
    def __init__(self):
        super().__init__("https://api.wtatennis.com/tennis/players/ranked")
        self.wiki = WikiScraper()

    def scrape_rankings(self, limit=500):
        log.info(f"Scraping WTA rankings from API (limit {limit})...")
        
        db = SessionLocal()
        existing_names = set()
        try:
            for row in db.query(Player.name).all():
                if row[0]: existing_names.add(row[0].strip().lower())
            for p in db.query(TennisHistoricalPlayer.first_name, TennisHistoricalPlayer.last_name).all():
                existing_names.add(f"{p[0]} {p[1]}".strip().lower())
        except Exception as e:
            log.warning(f"Could not load existing WTA players cache: {e}")
        finally:
            db.close()
        log.info(f"Loaded {len(existing_names)} existing players from DB for WTA.")

        players_scraped = 0
        page = 0
        page_size = 100
        today = datetime.now().strftime("%Y-%m-%d")

        while players_scraped < limit:
            url = f"{self.base_url}?metric=SINGLES&type=rankSingles&sort=asc&at={today}&pageSize={page_size}&page={page}"
            data = self.get_json(url)
            
            if not data or not isinstance(data, list) or len(data) == 0:
                log.info(f"No more WTA players found at page {page}")
                break

            for item in data:
                if players_scraped >= limit:
                    break
                
                try:
                    player_info = item.get('player', {})
                    player_id = player_info.get('id')
                    ranking = item.get('ranking')
                    
                    first_name = player_info.get('firstName', '')
                    last_name = player_info.get('lastName', '')
                    name = f"{first_name} {last_name}".strip()
                    
                    if not name or not ranking:
                        continue

                    country = player_info.get('countryCode', 'Unknown')
                    birth_date_str = player_info.get('dateOfBirth')
                    birth_date = None
                    if birth_date_str:
                        try:
                            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
                        except:
                            pass

                    points = 0
                    if item.get('points'):
                        try:
                            points = int(re.sub(r"\D", "", str(item['points'])))
                        except Exception:
                            pass

                    player_data = {
                        "name": name,
                        "ranking": ranking,
                        "points": points,
                        "birth_date": birth_date,
                        "country": country,
                        "gender": "F",
                        "source": "WTA Tour Official"
                    }

                    is_existing = name.lower() in existing_names
                    if not is_existing:
                        log.info(f"New WTA player: {name} (Rank {ranking}). Enriching...")
                        # Fast Wikipedia enrichment (<0.2s)
                        wiki_data = self.wiki.enrich_player(name)
                        if wiki_data:
                            for key, val in wiki_data.items():
                                if not player_data.get(key):
                                    player_data[key] = val
                        # Only enrich from WTA browser if still missing birth date and top 100
                        if ranking <= 100 and player_id and not player_data.get("birth_date"):
                            slug = name.lower().replace(" ", "-")
                            profile_url = f"https://www.wtatennis.com/players/{player_id}/{slug}"
                            self.enrich_from_wta(profile_url, player_data)
                        existing_names.add(name.lower())
                    else:
                        log.debug(f"WTA player {name} already in DB. Skipping browser enrichment.")

                    # Final sanitization
                    if player_data.get("highest_ranking"):
                        if isinstance(player_data['highest_ranking'], str):
                            match = re.search(r"(\d+)", str(player_data['highest_ranking']))
                            player_data['highest_ranking'] = int(match.group(1)) if match else ranking
                    else:
                        player_data["highest_ranking"] = ranking

                    save_player(player_data)
                    # Dual-write: ensure this player+rank lands in historical tables
                    save_tennis_player_with_rank(player_data)
                    players_scraped += 1
                    if players_scraped % 50 == 0:
                        log.info(f"WTA Progress: {players_scraped}/{limit} players saved.")
                except Exception as e:
                    log.error(f"Error parsing WTA API item: {e}")

            page += 1
            if len(data) < page_size:
                break

        return players_scraped

    def enrich_from_wta(self, url, player_data):
        log.info(f"Enriching {player_data['name']} from WTA profile...")
        
        # We need to click "Career" to see career stats
        from playwright.sync_api import sync_playwright
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                # Dismiss cookie banner / overlay if present so it does not intercept clicks
                try:
                    page.evaluate("""() => {
                        const sdk = document.getElementById('onetrust-consent-sdk');
                        if (sdk) sdk.remove();
                        const filter = document.querySelector('.onetrust-pc-dark-filter');
                        if (filter) filter.remove();
                    }""")
                except Exception:
                    pass

                # Try to click Career toggle if it exists
                try:
                    career_button = page.locator('button.segmented-controls__item:has-text("Career")')
                    if career_button.count() > 0:
                        career_button.first.click(timeout=3000, force=True)
                        page.wait_for_timeout(500) # Wait for stats to update
                except Exception as e:
                    log.debug(f"Could not click career toggle: {e}")

                content = page.content()
                browser.close()
                soup = BeautifulSoup(content, "html.parser")
        except Exception as e:
            log.error(f"Error fetching WTA profile with playwright: {e}")
            return

        try:
            # Image
            img = soup.select_one(".player-headshot__photo img")
            if img and img.get("src"):
                wta_image_url = img.get("src")
                wiki_image = self._fetch_wiki_image(player_data['name'])
                if wiki_image:
                    player_data["image_url"] = wiki_image
                else:
                    player_data["image_url"] = wta_image_url

            # Stats (Highest Rank, Win/Loss)
            # Use specific selectors found for WTA profile
            
            # Highest Rank
            highest_rank_el = soup.select_one(".profile-header__stat-block--rank .stat-block__stat")
            if highest_rank_el:
                try:
                    rank_text = re.search(r"(\d+)", highest_rank_el.text.strip())
                    if rank_text:
                        player_data["highest_ranking"] = int(rank_text.group(1))
                except: pass
            
            highest_rank_date_el = soup.select_one(".profile-header__stat-block--rank .stat-block__rank-date")
            if highest_rank_date_el:
                # Format: "04 Apr 22"
                try:
                    player_data["highest_ranking_date"] = datetime.strptime(highest_rank_date_el.text.strip(), "%d %b %y").date()
                except: pass

            # Win/Loss
            win_loss_el = soup.select_one(".profile-header__stat-block--win-loss .stat-block__stat-row")
            if win_loss_el:
                # Format: "418 / 100"
                parts = win_loss_el.text.split("/")
                if len(parts) == 2:
                    try:
                        player_data["wins"] = int(re.sub(r"\D", "", parts[0]))
                        player_data["losses"] = int(re.sub(r"\D", "", parts[1]))
                    except: pass
            
            # Prize Money
            prize_money_el = soup.select_one(".profile-header__stat-block--prize-money .stat-block__stat")
            if prize_money_el:
                player_data["prize_money"] = prize_money_el.text.strip()
            else:
                # Fallback to checking all stat blocks
                stat_blocks = soup.select(".profile-header__stat-block")
                for block in stat_blocks:
                    label = block.select_one(".stat-block__label")
                    if label and "Prize Money" in label.text:
                        val = block.select_one(".stat-block__stat")
                        if val:
                            player_data["prize_money"] = val.text.strip()
                        break

            # Physical info (Height)
            height_el = None
            # Check Bio section (Profile Biography)
            bio_blocks = soup.select(".profile-bio__info-block")
            for block in bio_blocks:
                title = block.select_one(".profile-bio__info-title")
                if title and "Height" in title.text:
                    height_el = block.select_one(".profile-bio__info-content")
                    break
            
            # Check Meta section (Header)
            if not height_el:
                meta_items = soup.select(".profile-header__meta-item")
                for item in meta_items:
                    if "(" in item.text and "m)" in item.text:
                        height_el = item
                        break

            if height_el:
                # Extract the "1.82m" part from "5' 11\" (1.82m)"
                height_text = height_el.text.strip()
                match = re.search(r"\((\d+\.?\d*m)\)", height_text)
                if match:
                    player_data["height"] = match.group(1)
                elif "m" in height_text:
                    player_data["height"] = height_text

            # Note: We explicitly do NOT scrape weight and turned_pro for WTA as requested.
            player_data["weight"] = None
            player_data["turned_pro"] = None

        except Exception as e:
            log.error(f"Error parsing WTA profile: {e}")

    def _fetch_wiki_image(self, name):
        try:
            encoded = urllib.parse.quote(name.replace(" ", "_"))
            url = f"{WIKI_SUMMARY_API}{encoded}"
            data = self.get_json(url)
            if data and 'thumbnail' in data:
                return data['thumbnail'].get('source')
        except Exception:
            pass
        return None
