import sys
import os
import random
import urllib.parse
import re
import requests
from datetime import datetime
from bs4 import BeautifulSoup

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from scraper.base_scraper import BaseScraper
from scraper.utils.logger import log
from scraper.basketball_persistence import save_basketball_national_team

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
FIBA_MEN_URL = "https://www.fiba.basketball/en/ranking/men"
FIBA_WOMEN_URL = "https://www.fiba.basketball/en/ranking/women"

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

class BasketballNationalTeamScraper(BaseScraper):
    def __init__(self):
        super().__init__("https://www.fiba.basketball/en/ranking/men")
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.fiba.basketball/"
        }

    def scrape_all(self):
        log.info("Starting Comprehensive Basketball National Team scraping...")
        scraped = 0
        
        # 1. Scrape Men's Rankings
        scraped += self.scrape_fiba_rankings("men")
        
        # 2. Scrape Women's Rankings
        scraped += self.scrape_fiba_rankings("women")
        
        log.info(f"Basketball National Team scraping complete: {scraped} teams processed.")

    def scrape_fiba_rankings(self, category):
        url = FIBA_MEN_URL if category == "men" else FIBA_WOMEN_URL
        log.info(f"Fetching FIBA {category} rankings from {url}...")
        
        try:
            self.rate_limiter.wait()
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            log.error(f"Error fetching FIBA page for {category}: {e}")
            return 0
        
        tables = soup.find_all('table')
        if not tables:
            log.error(f"No ranking tables found on FIBA page for {category}")
            return 0

        rows = tables[0].find_all('tr')
        if len(rows) <= 1:
            log.error(f"No data rows found in FIBA table for {category}")
            return 0

        saved = 0
        for row in rows[1:]:
            try:
                cols = row.find_all(['th', 'td'])
                if len(cols) < 4:
                    continue
                
                raw_rank = cols[0].text.strip().replace('.', '')
                try:
                    ranking = int(raw_rank)
                except ValueError:
                    ranking = 999
                
                raw_name = cols[1].text.strip()
                if not raw_name:
                    continue
                
                name = NAME_MAPPINGS.get(raw_name, raw_name)
                
                raw_pts = cols[3].text.strip().replace(',', '')
                try:
                    points = float(raw_pts)
                except ValueError:
                    points = 0.0

                log.info(f"Processing FIBA {category} team: {name} (Rank {ranking}, Points {points})")
                
                team_data = self._build_team_data(name, category, ranking, points)
                save_basketball_national_team(team_data)
                saved += 1
                
                if saved % 20 == 0:
                    import time
                    time.sleep(0.5)
                    
            except Exception as e:
                log.error(f"Error processing basketball team entry: {e}")
                
        return saved

    def _build_team_data(self, name, category, ranking, points):
        wiki_name = f"{name} men's national basketball team" if category == "men" else f"{name} women's national basketball team"
        
        summary_data = self._fetch_wiki_summary(wiki_name)
        if not summary_data or 'title' not in summary_data:
            fallback_name = f"{name} national basketball team"
            summary_data = self._fetch_wiki_summary(fallback_name)
            if not summary_data or 'title' not in summary_data:
                summary_data = self._fetch_wiki_summary(name)

        description = summary_data.get('extract', f"The {name} national {category}'s basketball team represents {name} in international basketball competitions.")
        image_url = summary_data.get('thumbnail', {}).get('source')
        
        # Scrape real honors from Wikipedia infobox if available
        wc_titles, cc_titles, cc_name = self._scrape_honors(name, category)
        
        confederation = "FIBA Americas"
        if name in ["Spain", "France", "Serbia", "Germany", "Greece", "Lithuania", "Italy", "Slovenia", "Latvia", "Croatia", "Turkey", "Georgia", "Poland", "Finland"]:
            confederation = "FIBA Europe"
        elif name in ["Australia", "New Zealand"]:
            confederation = "FIBA Oceania"
        elif name in ["Japan", "China", "China PR", "South Korea", "Philippines", "Lebanon", "Jordan", "Iran"]:
            confederation = "FIBA Asia"
        elif name in ["South Sudan", "Nigeria", "Angola", "Egypt", "Senegal", "Tunisia", "Cote d'Ivoire"]:
            confederation = "FIBA Africa"

        return {
            "name": name,
            "country": name,
            "confederation": confederation,
            "category": category,
            "founded_year": 1930,
            "stadium": f"National Basketball Arena of {name}",
            "nickname": f"The {name} National Team",
            "image_url": image_url,
            "website": f"https://en.wikipedia.org/wiki/{wiki_name.replace(' ', '_')}",
            "description": description,
            "ranking": ranking,
            "points": points,
            "total_trophies": wc_titles + cc_titles,
            "world_cup_titles": wc_titles,
            "manager": "Head Coach TBD",
            "captain": "Captain TBD",
            "main_rivals": "Regional Rivals",
            "honors_json": {"FIBA World Cup": wc_titles, cc_name: cc_titles}
        }

    def _scrape_honors(self, team_name, category):
        common_name = NAME_MAPPINGS.get(team_name, team_name)
        
        wiki_names = [
            f"{common_name} men's national basketball team" if category == "men" else f"{common_name} women's national basketball team",
            f"{common_name} national basketball team",
        ]
        
        world_cup_titles = 0
        continental_titles = 0
        cc_name = "Continental Championship"
        
        for wiki_name in wiki_names:
            encoded = urllib.parse.quote(wiki_name.replace(" ", "_"))
            url = f"https://en.wikipedia.org/wiki/{encoded}"
            
            soup = self.get_soup(url)
            if not soup: continue
            
            infobox = soup.select_one(".infobox")
            if not infobox: continue
            
            current_comp = None
            for row in infobox.select("tr"):
                header = row.select_one(".infobox-header")
                if header:
                    header_text = header.text.strip()
                    if "World Cup" in header_text or "World Championship" in header_text:
                        current_comp = "WC"
                    elif "EuroBasket" in header_text or "AmeriCup" in header_text or "Asia Cup" in header_text or "AfroBasket" in header_text or "Oceania" in header_text:
                        current_comp = "CC"
                        cc_name = header_text
                    else:
                        current_comp = None
                    continue
                
                if current_comp:
                    label = row.select_one(".infobox-label")
                    data = row.select_one(".infobox-data")
                    if label and ("Best result" in label.text or "Medals" in label.text) and data:
                        text = data.get_text(separator=" ").strip()
                        if "Gold" in text or "Champions" in text or "Winners" in text or "1st" in text:
                            times_match = re.search(r"(\d+)\s+time", text.lower())
                            if times_match:
                                count = int(times_match.group(1))
                            else:
                                years = re.findall(r"\d{4}", text)
                                count = len(years) if years else 1
                            
                            if current_comp == "WC":
                                world_cup_titles = count
                            else:
                                continental_titles = count
                        current_comp = None 
            
            if infobox:
                break
                
        return world_cup_titles, continental_titles, cc_name

    def _fetch_wiki_summary(self, name):
        try:
            encoded = urllib.parse.quote(name.replace(" ", "_"))
            url = f"{WIKI_SUMMARY_API}{encoded}"
            resp = requests.get(url, headers=self.headers, timeout=5)
            if resp.status_code == 200:
                return resp.json()
            return {}
        except Exception:
            return {}

if __name__ == "__main__":
    scraper = BasketballNationalTeamScraper()
    scraper.scrape_all()
