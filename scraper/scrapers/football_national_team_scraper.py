import sys
import os
import random
import urllib.parse
import re
import requests
from datetime import datetime

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from scraper.base_scraper import BaseScraper
from scraper.utils.logger import log
from scraper.football_persistence import save_football_national_team

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
FIFA_API_BASE = "https://api.fifa.com/api/v3/fifarankings/rankings/rankingsbyschedule"

class FootballNationalTeamScraper(BaseScraper):
    def __init__(self):
        super().__init__("https://inside.fifa.com/fifa-world-ranking/men")
        self.processed_teams = set()

    def scrape_all(self):
        log.info("Starting Comprehensive Football National Team scraping...")
        scraped = 0
        
        # 1. Scrape Men's Rankings
        scraped += self.scrape_fifa_rankings("men")
        
        # 2. Scrape Women's Rankings
        scraped += self.scrape_fifa_rankings("women")
        
        log.info(f"Football National Team scraping complete: {scraped} teams processed.")

    def get_latest_schedule_id(self, category):
        url = f"https://inside.fifa.com/fifa-world-ranking/{category}"
        log.info(f"Detecting latest schedule ID from {url}...")
        
        # Using requests directly for faster regex search in page source
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                pattern = r"FRS_Male_Football_[0-9]+" if category == "men" else r"FRS_Female_Football_[0-9]+"
                matches = re.findall(pattern, response.text)
                if matches:
                    latest = sorted(list(set(matches)), reverse=True)[0]
                    log.info(f"Found latest schedule ID: {latest}")
                    return latest
        except Exception as e:
            log.error(f"Error detecting schedule ID: {e}")
            
        # Fallbacks (current as of 2026)
        return "FRS_Male_Football_20260611" if category == "men" else "FRS_Female_Football_20260419"

    def scrape_fifa_rankings(self, category):
        schedule_id = self.get_latest_schedule_id(category)
        api_url = f"{FIFA_API_BASE}?rankingScheduleId={schedule_id}&language=en"
        
        log.info(f"Fetching {category} rankings from FIFA API: {api_url}")
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Origin": "https://www.fifa.com",
            "Referer": "https://www.fifa.com/"
        }
        
        try:
            self.rate_limiter.wait()
            response = requests.get(api_url, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            log.error(f"Error fetching FIFA API for {category}: {e}")
            return 0
        
        results = data.get('Results', [])
        if not results:
            log.error(f"No results found in FIFA API response for {category}")
            return 0

        saved = 0
        for entry in results:
            try:
                team_name_list = entry.get('TeamName', [])
                if not team_name_list: continue
                
                name = team_name_list[0].get('Description')
                ranking = entry.get('Rank')
                confederation = entry.get('ConfederationName', 'Unknown')
                points = entry.get('TotalPoints', 0.0)
                
                if ranking is None:
                    ranking = 999
                
                log.info(f"Processing {category} team: {name} (Rank {ranking}, Points {points})")
                
                team_data = self._build_team_data(name, category, ranking, confederation, points)
                save_football_national_team(team_data)
                saved += 1
                
                if saved % 20 == 0:
                    import time
                    time.sleep(0.5)
                    
            except Exception as e:
                log.error(f"Error processing team entry: {e}")
                
        return saved

    def _build_team_data(self, name, category, ranking, confederation, points=0.0):
        wiki_name = f"{name} national football team"
        if category == "women":
            wiki_name = f"{name} women's national football team"
            
        summary_data = self._fetch_wiki_summary(wiki_name)
        if not summary_data:
            summary_data = self._fetch_wiki_summary(name)
            
        description = summary_data.get('extract', f"The {name} national {category}'s football team.")
        image_url = summary_data.get('thumbnail', {}).get('source')
        
        wc_titles, cc_titles, cc_name = self._scrape_honors(name, category, confederation)
        
        return {
            "name": name,
            "country": name,
            "confederation": confederation,
            "category": category,
            "founded_year": 1900,
            "stadium": f"National Stadium of {name}",
            "nickname": f"The {name} Team",
            "image_url": image_url,
            "website": f"https://en.wikipedia.org/wiki/{wiki_name.replace(' ', '_')}",
            "description": description,
            "ranking": ranking,
            "points": points,
            "total_trophies": wc_titles + cc_titles,
            "world_cup_titles": wc_titles,
            "manager": "TBD",
            "captain": "TBD",
            "main_rivals": "Neighboring Countries",
            "honors_json": {"World Cup": wc_titles, cc_name: cc_titles}
        }

    def _scrape_honors(self, team_name, category, confederation):
        # Handle common name differences between FIFA and Wikipedia
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
        common_name = NAME_MAPPINGS.get(team_name, team_name)
        
        wiki_names = [
            f"{common_name} national football team",
            f"{common_name} national soccer team",
        ]
        if category == "women":
            wiki_names = [
                f"{common_name} women's national football team",
                f"{common_name} women's national soccer team",
            ]
        
        world_cup_titles = 0
        continental_titles = 0
        
        # Map confederation to its primary tournament
        CC_MAPPING = {
            "UEFA": "European Championship",
            "CONMEBOL": "Copa América",
            "CAF": "Africa Cup of Nations",
            "AFC": "AFC Asian Cup",
            "CONCACAF": "CONCACAF Gold Cup",
            "OFC": "OFC Nations Cup"
        }
        # Map confederation to its primary tournament regex
        CC_HEADERS = {
            "UEFA": r"European Championship",
            "CONMEBOL": r"Copa América",
            "CAF": r"Africa Cup of Nations",
            "AFC": r"Asian Cup",
            "CONCACAF": r"CONCACAF (Championship|Gold Cup)",
            "OFC": r"Nations Cup"
        }
        cc_pattern = CC_HEADERS.get(confederation, "Continental Cup")
        cc_name = CC_MAPPING.get(confederation, "Continental Cup")

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
                    if "World Cup" in header_text:
                        current_comp = "WC"
                    elif re.search(cc_pattern, header_text, re.IGNORECASE):
                        current_comp = "CC"
                    else:
                        current_comp = None
                    continue
                
                if current_comp:
                    label = row.select_one(".infobox-label")
                    data = row.select_one(".infobox-data")
                    if label and "Best result" in label.text and data:
                        text = data.get_text(separator=" ").strip()
                        if "Winners" in text or "Champions" in text:
                            # Try to find "X times" pattern first
                            times_match = re.search(r"(\d+)\s+times", text.lower())
                            if times_match:
                                count = int(times_match.group(1))
                            else:
                                years = re.findall(r"\d{4}", text)
                                count = len(years) if years else (1 if "once" in text.lower() else 1)
                            
                            if current_comp == "WC":
                                world_cup_titles = count
                            else:
                                continental_titles = count
                        current_comp = None 
            
            # If we found an infobox, we're likely on the right page
            if infobox:
                break
                
        return world_cup_titles, continental_titles, cc_name

    def _fetch_wiki_summary(self, name):
        try:
            encoded = urllib.parse.quote(name.replace(" ", "_"))
            url = f"{WIKI_SUMMARY_API}{encoded}"
            # Use requests directly for faster API calls
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                return resp.json()
            return {}
        except Exception:
            return {}

if __name__ == "__main__":
    scraper = FootballNationalTeamScraper()
    scraper.scrape_all()
