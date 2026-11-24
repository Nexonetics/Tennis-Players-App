#!/usr/bin/env python3
"""
College basketball betting data: NCAA men's + women's odds and team records.

  Odds    -> The Odds API (https://the-odds-api.com). Needs ODDS_API_KEY
             (read from the environment or scraper/.env).
  Records -> ESPN's public standings API. No key, no cost.

Writes web/src/data/json/college_basketball.json, which the Next.js site reads.

Caching: the JSON file is the cache. The site only ever reads that file, and
this script pulls odds at most once per --max-age-hours (default 20), so it is
safe to run as often as you like; extra runs exit without spending credits.
.github/workflows/college_basketball_odds.yml runs it once a day.

Credit cost (The Odds API free plan = 500 credits/month):
  each league with games costs  len(markets) x len(regions)  credits per pull.
  Default is 3 markets x 1 region = 3 credits per league, so at most 6 per day
  (~186/month). Checking which leagues are active is free, and inactive leagues
  are skipped.

Usage (from the repo root):
  python3 scraper/college_basketball_odds.py                 # pull if cache is older than 20h
  python3 scraper/college_basketball_odds.py --force         # pull now regardless (spends credits)
  python3 scraper/college_basketball_odds.py --records-only  # free: refresh records, keep cached odds
"""
from __future__ import annotations

import argparse
import difflib
import json
import logging
import os
import re
import shutil
import statistics
import sys
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DEFAULT_OUT = os.path.join(PROJECT_ROOT, "web", "src", "data", "json", "college_basketball.json")
# `npm run dev` serves web/public/data/json, copied from src only when the dev server
# starts (web/scripts/copy-data.js). Keep that copy in sync so a running dev server
# shows fresh data without a restart.
PUBLIC_COPY = os.path.join(PROJECT_ROOT, "web", "public", "data", "json", "college_basketball.json")

ODDS_API_BASE = "https://api.the-odds-api.com/v4"
ESPN_STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/{slug}/standings"
HTTP_TIMEOUT = 30

LEAGUES = {
    "men": {
        "title": "NCAA Men's Basketball",
        "odds_key": "basketball_ncaab",
        "espn_slug": "mens-college-basketball",
    },
    "women": {
        "title": "NCAA Women's Basketball",
        "odds_key": "basketball_wncaab",
        "espn_slug": "womens-college-basketball",
    },
}

# Odds API name -> ESPN team id, for names the automatic matcher can't resolve.
# Add entries here when a run reports "unmatched teams".
TEAM_ALIASES: dict[str, str] = {
    "Appalachian St Mountaineers": "2026",  # ESPN: App State Mountaineers
    "Army Knights": "349",                  # ESPN: Army Black Knights
    "Gardner-Webb Bulldogs": "2241",        # ESPN: Gardner-Webb Runnin' Bulldogs
    "Grand Canyon Antelopes": "2253",       # ESPN: Grand Canyon Lopes
    "IUPUI Jaguars": "85",                  # renamed IU Indianapolis
    "Long Beach St 49ers": "299",           # ESPN: Long Beach State Beach
    "UMKC Kangaroos": "140",                # renamed Kansas City Roos
}

log = logging.getLogger("college_basketball")


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
class FetchError(RuntimeError):
    pass


def _get(url: str, params: dict | None = None, secret: str | None = None) -> requests.Response:
    """GET that never lets the API key leak into exception text or CI logs."""
    try:
        # Keep requests' default User-Agent: ESPN's CDN returns 403 for custom ones.
        resp = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
    except requests.RequestException as exc:
        msg = str(exc)
        if secret:
            msg = msg.replace(secret, "***")
        raise FetchError(f"Request to {url} failed: {msg}") from None

    if resp.status_code != 200:
        body = resp.text[:300]
        if secret:
            body = body.replace(secret, "***")
        raise FetchError(f"{url} returned HTTP {resp.status_code}: {body}")
    return resp


# --------------------------------------------------------------------------- #
# ESPN team records
# --------------------------------------------------------------------------- #
def _stat_map(stats: list[dict]) -> dict[str, dict]:
    return {s.get("type") or s.get("name"): s for s in stats}


def _num(stats: dict, key: str, ndigits: int = 1) -> float | None:
    s = stats.get(key)
    if not s:
        return None
    val = s.get("value")
    if not isinstance(val, (int, float)):
        try:
            val = float(str(s.get("displayValue", "")).replace("+", ""))
        except ValueError:
            return None
    return round(val, ndigits)


def _summary(stats: dict, key: str) -> str | None:
    s = stats.get(key)
    if not s:
        return None
    return s.get("summary") or s.get("displayValue")


def fetch_espn_teams(slug: str) -> tuple[list[dict], str | None]:
    """Return (teams, season label) for every Division I team in ESPN standings."""
    data = _get(ESPN_STANDINGS_URL.format(slug=slug)).json()
    season = (data.get("season") or {}).get("displayName")
    teams: dict[str, dict] = {}

    def walk(node: dict) -> None:
        standings = node.get("standings")
        if standings:
            conference = node.get("shortName") or node.get("abbreviation") or node.get("name")
            for entry in standings.get("entries", []):
                t = entry["team"]
                st = _stat_map(entry.get("stats", []))
                wins = _num(st, "wins")
                losses = _num(st, "losses")
                logos = t.get("logos") or []
                teams[t["id"]] = {
                    "id": t["id"],
                    "name": t.get("displayName"),
                    "short_name": t.get("shortDisplayName") or t.get("location"),
                    "location": t.get("location"),
                    "mascot": t.get("name"),
                    "abbreviation": t.get("abbreviation"),
                    "conference": conference,
                    "logo": logos[0]["href"] if logos else None,
                    "wins": int(wins) if wins is not None else 0,
                    "losses": int(losses) if losses is not None else 0,
                    "win_pct": _num(st, "winpercent", 3),
                    "record": _summary(st, "total"),
                    "home_record": _summary(st, "home"),
                    "away_record": _summary(st, "road"),
                    "conference_record": _summary(st, "vsconf"),
                    "vs_ap_top25": _summary(st, "vsaprankedteams"),
                    "streak": (st.get("streak") or {}).get("displayValue"),
                    "ppg": _num(st, "avgpointsfor"),
                    "opp_ppg": _num(st, "avgpointsagainst"),
                    "point_diff": _num(st, "pointdifferential"),
                }
        for child in node.get("children", []):
            walk(child)

    walk(data)
    if not teams:
        raise FetchError(f"ESPN standings for {slug} contained no teams (response shape may have changed)")

    ordered = sorted(
        teams.values(),
        key=lambda t: (-(t["win_pct"] or 0), -(t["wins"] or 0), t["name"] or ""),
    )
    return ordered, season


# --------------------------------------------------------------------------- #
# Odds API team name -> ESPN team
# --------------------------------------------------------------------------- #
_ABBREVIATIONS = {"se": "southeast", "sw": "southwest", "ne": "northeast", "nw": "northwest"}
_WEAK_TOKENS = {"state", "university", "college", "of", "the", "and", "at"}


def _norm(name: str) -> str:
    s = name.lower().replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)          # "St. Thomas (MN)" -> "St. Thomas"
    s = re.sub(r"[^a-z0-9 ]", " ", s)       # drop dots, apostrophes, hyphens
    out = []
    for i, tok in enumerate(s.split()):
        if tok == "st":
            tok = "saint" if i == 0 else "state"   # "St. John's" vs "Murray St"
        out.append(_ABBREVIATIONS.get(tok, tok))
    return " ".join(out)


class TeamMatcher:
    def __init__(self, teams: list[dict]):
        self.by_id = {t["id"]: t for t in teams}
        self.by_display = {t["name"]: t for t in teams if t["name"]}
        self.by_norm = {_norm(t["name"]): t for t in teams if t["name"]}
        self.teams = teams
        self._cache: dict[str, dict | None] = {}

    def match(self, odds_name: str) -> dict | None:
        if odds_name not in self._cache:
            self._cache[odds_name] = self._match(odds_name)
        return self._cache[odds_name]

    def _match(self, odds_name: str) -> dict | None:
        if odds_name in TEAM_ALIASES:
            return self.by_id.get(TEAM_ALIASES[odds_name])
        if odds_name in self.by_display:
            return self.by_display[odds_name]
        n = _norm(odds_name)
        if n in self.by_norm:
            return self.by_norm[n]

        # Same mascot, closest school name. "Grambling St Tigers" -> "Grambling Tigers".
        best, best_score = None, 0.0
        for t in self.teams:
            mascots = {_norm(t["mascot"] or "")}
            mascots.add(re.sub(r"^lady ", "", next(iter(mascots))))
            for mascot in mascots:
                if not mascot or not (n == mascot or n.endswith(" " + mascot)):
                    continue
                loc = n[: -len(mascot)].strip()
                cand = _norm(t["location"] or "")
                a = set(loc.split()) - _WEAK_TOKENS
                b = set(cand.split()) - _WEAK_TOKENS
                if not a or not (a & b):
                    continue
                score = len(a & b) / len(a | b) + 0.5 * difflib.SequenceMatcher(None, loc, cand).ratio()
                if score > best_score:
                    best, best_score = t, score
        return best


# --------------------------------------------------------------------------- #
# The Odds API
# --------------------------------------------------------------------------- #
class OddsClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.quota: dict[str, int | None] = {"remaining": None, "used": None}

    def _call(self, path: str, **params) -> list | dict:
        resp = _get(f"{ODDS_API_BASE}{path}", {"apiKey": self.api_key, **params}, secret=self.api_key)
        for key in ("remaining", "used"):
            raw = resp.headers.get(f"x-requests-{key}")
            if raw is not None:
                self.quota[key] = int(float(raw))
        return resp.json()

    def active_sport_keys(self) -> set[str]:
        """Free call (0 credits)."""
        return {s["key"] for s in self._call("/sports/")}

    def odds(self, sport_key: str, regions: str, markets: str) -> list[dict]:
        return self._call(
            f"/sports/{sport_key}/odds/",
            regions=regions,
            markets=markets,
            oddsFormat="american",
            dateFormat="iso",
        )


def implied_prob(american: float) -> float:
    if american > 0:
        return 100.0 / (american + 100.0)
    return -american / (-american + 100.0)


def _side_snapshot(odds_name: str, team: dict | None, venue: str) -> dict:
    snap = {"name": odds_name, "team_id": None}
    if team:
        snap.update(
            team_id=team["id"],
            short_name=team["short_name"],
            logo=team["logo"],
            conference=team["conference"],
            record=team["record"],
            venue_record=team["home_record"] if venue == "home" else team["away_record"],
            conference_record=team["conference_record"],
            streak=team["streak"],
            ppg=team["ppg"],
            opp_ppg=team["opp_ppg"],
        )
    return snap


def summarize_event(ev: dict, matcher: TeamMatcher) -> dict:
    home, away = ev["home_team"], ev["away_team"]
    books = []
    ml = {"home": [], "away": []}
    spread_points, total_points, fair_home = [], [], []

    for b in ev.get("bookmakers", []):
        markets = {m["key"]: {o["name"]: o for o in m["outcomes"]} for m in b.get("markets", [])}
        row = {"key": b["key"], "title": b["title"], "last_update": b.get("last_update")}

        h2h = markets.get("h2h", {})
        if home in h2h and away in h2h:
            hp, ap = h2h[home]["price"], h2h[away]["price"]
            row["moneyline"] = {"home": hp, "away": ap}
            ml["home"].append((hp, b["title"]))
            ml["away"].append((ap, b["title"]))
            ih, ia = implied_prob(hp), implied_prob(ap)
            fair_home.append(ih / (ih + ia))

        sp = markets.get("spreads", {})
        if home in sp and away in sp:
            row["spread"] = {
                "home": {"point": sp[home].get("point"), "price": sp[home]["price"]},
                "away": {"point": sp[away].get("point"), "price": sp[away]["price"]},
            }
            if sp[home].get("point") is not None:
                spread_points.append(sp[home]["point"])

        tot = markets.get("totals", {})
        if "Over" in tot and "Under" in tot:
            row["total"] = {
                "over": {"point": tot["Over"].get("point"), "price": tot["Over"]["price"]},
                "under": {"point": tot["Under"].get("point"), "price": tot["Under"]["price"]},
            }
            if tot["Over"].get("point") is not None:
                total_points.append(tot["Over"]["point"])

        books.append(row)

    def best(prices: list[tuple[float, str]]) -> dict | None:
        # Higher American odds always pay more, for favourites and underdogs alike.
        if not prices:
            return None
        price, book = max(prices, key=lambda p: p[0])
        return {"price": price, "book": book}

    # median_low (not median) so the consensus is always a line a book actually posted,
    # never an average like 146.75.
    fair = statistics.mean(fair_home) if fair_home else None
    spread = statistics.median_low(spread_points) if spread_points else None
    return {
        "id": ev["id"],
        "commence_time": ev["commence_time"],
        "home": _side_snapshot(home, matcher.match(home), "home"),
        "away": _side_snapshot(away, matcher.match(away), "away"),
        "best_moneyline": {"home": best(ml["home"]), "away": best(ml["away"])},
        "fair_win_prob": (
            {"home": round(fair, 4), "away": round(1 - fair, 4)} if fair is not None else None
        ),
        "consensus_spread": {"home": spread, "away": -spread} if spread is not None else None,
        "consensus_total": statistics.median_low(total_points) if total_points else None,
        "books": books,
    }


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def load_previous(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_atomic(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def sync_public_copy(out: str) -> None:
    if os.path.abspath(out) != DEFAULT_OUT or not os.path.isfile(out):
        return
    if not os.path.isdir(os.path.join(PROJECT_ROOT, "web", "public")):
        return
    os.makedirs(os.path.dirname(PUBLIC_COPY), exist_ok=True)
    tmp = f"{PUBLIC_COPY}.tmp"
    shutil.copyfile(out, tmp)
    os.replace(tmp, PUBLIC_COPY)


def hours_since(iso: str | None) -> float | None:
    if not iso:
        return None
    try:
        then = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    return (datetime.now(timezone.utc) - then).total_seconds() / 3600


def last_odds_pull(previous: dict) -> str | None:
    """When odds were last pulled. Not generated_at: --records-only runs bump that."""
    if previous.get("odds_pulled_at"):
        return previous["odds_pulled_at"]
    stamps = [
        lg.get("odds_updated_at")
        for lg in (previous.get("leagues") or {}).values()
        if lg.get("odds_updated_at")
    ]
    return max(stamps) if stamps else None


def run(args: argparse.Namespace) -> int:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    previous = load_previous(args.out)

    # Daily cache: don't spend credits if odds were pulled recently.
    last_pull = last_odds_pull(previous)
    age = hours_since(last_pull)
    if not args.records_only and not args.force and age is not None and age < args.max_age_hours:
        log.info(
            "Cached odds are %.1f h old (pulled %s), under the %s h limit. "
            "Skipped: 0 credits spent. Use --force to pull anyway.",
            age, last_pull, args.max_age_hours,
        )
        sync_public_copy(args.out)
        return 0

    client = None
    active: set[str] = set()
    if not args.records_only:
        load_dotenv(os.path.join(SCRIPT_DIR, ".env"))
        load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
        api_key = os.environ.get("ODDS_API_KEY", "").strip()
        if not api_key:
            log.error("ODDS_API_KEY is not set (add it to scraper/.env or the environment).")
            return 2
        client = OddsClient(api_key)
        active = client.active_sport_keys()

    payload = {
        "generated_at": now,
        "odds_pulled_at": last_pull if args.records_only else now,
        "sources": {"odds": "The Odds API", "records": "ESPN"},
        "regions": args.regions,
        "markets": args.markets.split(","),
        "leagues": {},
    }

    for gender, cfg in LEAGUES.items():
        log.info("%s: fetching ESPN team records", cfg["title"])
        teams, season = fetch_espn_teams(cfg["espn_slug"])
        matcher = TeamMatcher(teams)
        prev_league = (previous.get("leagues") or {}).get(gender) or {}

        league = {
            "title": cfg["title"],
            "season": season,
            "odds_sport_key": cfg["odds_key"],
            "records_updated_at": now,
            "odds_updated_at": prev_league.get("odds_updated_at"),
            "odds_status": prev_league.get("odds_status", "not_fetched"),
            "games": [],
            "unmatched_teams": [],
            "teams": teams,
        }

        if args.records_only:
            # Keep the last odds pull but refresh the team records embedded in each game.
            for g in prev_league.get("games", []):
                for side in ("home", "away"):
                    g[side] = _side_snapshot(g[side]["name"], matcher.match(g[side]["name"]), side)
                league["games"].append(g)
        elif cfg["odds_key"] not in active:
            log.info("%s: no active odds on The Odds API right now, skipped (0 credits)", cfg["title"])
            league["odds_status"] = "inactive"
            league["odds_updated_at"] = now
        else:
            events = client.odds(cfg["odds_key"], args.regions, args.markets)
            league["games"] = sorted(
                (summarize_event(ev, matcher) for ev in events), key=lambda g: g["commence_time"]
            )
            league["odds_status"] = "ok"
            league["odds_updated_at"] = now
            log.info("%s: %d games with odds", cfg["title"], len(league["games"]))

        unmatched = sorted(
            {g[s]["name"] for g in league["games"] for s in ("home", "away") if not g[s]["team_id"]}
        )
        league["unmatched_teams"] = unmatched
        if unmatched:
            log.warning("%s: no ESPN record for %s (add to TEAM_ALIASES)", cfg["title"], unmatched)

        payload["leagues"][gender] = league
        log.info("%s: %d teams with records (season %s)", cfg["title"], len(teams), season)

    if client:
        payload["odds_api_credits"] = client.quota
        log.info("Odds API credits: used %s, remaining %s", client.quota["used"], client.quota["remaining"])
    elif previous.get("odds_api_credits"):
        payload["odds_api_credits"] = previous["odds_api_credits"]

    write_atomic(args.out, payload)
    sync_public_copy(args.out)
    log.info("Wrote %s", os.path.relpath(args.out, PROJECT_ROOT))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--records-only", action="store_true",
                        help="Refresh ESPN records only (free); keep the cached odds.")
    parser.add_argument("--force", action="store_true",
                        help="Pull odds even if the cache is still fresh (spends credits).")
    parser.add_argument("--max-age-hours", type=float, default=20,
                        help="Skip the odds pull if the cache is younger than this (default 20).")
    parser.add_argument("--regions", default="us",
                        help="Odds API bookmaker regions, comma-separated (each one multiplies credit cost).")
    parser.add_argument("--markets", default="h2h,spreads,totals",
                        help="Odds API markets, comma-separated (each one multiplies credit cost).")
    parser.add_argument("--out", default=DEFAULT_OUT, help="Output JSON path.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(message)s")
    try:
        return run(args)
    except FetchError as exc:
        log.error("%s", exc)
        log.error("Nothing written; the previous data file is unchanged.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
