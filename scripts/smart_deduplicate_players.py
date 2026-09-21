#!/usr/bin/env python3
"""
Smart Player Deduplicator & Disambiguator
==========================================
1. Normalizes country demonyms (e.g. 'Portugal' vs 'Portuguese' -> 'POR', 'South Korea' vs 'Korea Republic' -> 'KOR').
2. Groups players by (gender, normalized_country, sorted_name_tokens).
3. Merges VIRTUAL DUPLICATES (same human scraped under different casing/country spellings with same/missing birth year).
4. PRESERVES REAL DIFFERENT PLAYERS (same name string but DIFFERENT birth years/ages).
"""

import os
import sys
import re
from datetime import date

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from sqlalchemy import func, text
from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking, TableTennisPlayer
from app.models.player import TennisHistoricalPlayer, TennisHistoricalRanking, Player

DEMONYM_COUNTRY_MAP = {
    'PORTUGAL': 'POR', 'PORTUGUESE': 'POR', 'POR': 'POR',
    'GERMANY': 'GER', 'GERMAN': 'GER', 'GER': 'GER',
    'FRANCE': 'FRA', 'FRENCH': 'FRA', 'FRA': 'FRA',
    'KOREA REPUBLIC': 'KOR', 'SOUTH KOREA': 'KOR', 'KOREA': 'KOR', 'KOR': 'KOR', 'KOREAN': 'KOR',
    'CHINA': 'CHN', 'CHINESE': 'CHN', 'CHN': 'CHN',
    'JAPAN': 'JPN', 'JAPANESE': 'JPN', 'JPN': 'JPN',
    'INDIA': 'IND', 'INDIAN': 'IND', 'IND': 'IND',
    'UNITED STATES': 'USA', 'UNITED STATES OF AMERICA': 'USA', 'USA': 'USA', 'AMERICAN': 'USA',
    'SPAIN': 'ESP', 'SPANISH': 'ESP', 'ESP': 'ESP',
    'ITALY': 'ITA', 'ITALIAN': 'ITA', 'ITA': 'ITA',
    'BRAZIL': 'BRA', 'BRAZILIAN': 'BRA', 'BRA': 'BRA',
    'SWEDEN': 'SWE', 'SWEDISH': 'SWE', 'SWE': 'SWE',
    'RUSSIA': 'RUS', 'RUSSIAN': 'RUS', 'RUS': 'RUS',
    'CHINESE TAIPEI': 'TPE', 'TAIWAN': 'TPE', 'TPE': 'TPE',
    'HONG KONG': 'HKG', 'HONG KONG, CHINA': 'HKG', 'HKG': 'HKG',
    'SINGAPORE': 'SGP', 'SGP': 'SGP', 'SIN': 'SGP',
}

def normalize_country(c: str) -> str:
    if not c:
        return 'UNKNOWN'
    c_clean = c.strip().upper()
    return DEMONYM_COUNTRY_MAP.get(c_clean, c_clean)

def get_name_tokens(first: str, last: str):
    full = f"{first or ''} {last or ''}".lower()
    # Extract only alphabetical words
    words = sorted(re.findall(r'\b[a-z]+\b', full))
    return tuple(words)

def score_tt_player(p, ranking_counts):
    score = 0
    # Has photo
    if p.picture and p.picture.strip():
        score += 500
    # Ranking count
    score += ranking_counts.get(p.id, 0)
    # Valid birth year
    if p.birth_year:
        score += 100
    # Standard capitalization for country name
    if p.country and p.country.upper() in DEMONYM_COUNTRY_MAP:
        score += 20
    return score

def deduplicate_tt_players(db):
    print("\n--- Running Smart Deduplication for Table Tennis Players ---")
    all_players = db.query(TableTennisHistoricalPlayer).all()
    print(f"Loaded {len(all_players)} TableTennisHistoricalPlayer records.")

    # Get ranking counts per player ID
    ranking_rows = db.query(TableTennisHistoricalRanking.player_id, func.count(TableTennisHistoricalRanking.id)).group_by(TableTennisHistoricalRanking.player_id).all()
    ranking_counts = {r[0]: r[1] for r in ranking_rows}

    # Group players by (gender, normalized_country, name_tokens_tuple)
    clusters = {}
    for p in all_players:
        tokens = get_name_tokens(p.first_name, p.last_name)
        if not tokens:
            continue
        c_code = normalize_country(p.country)
        key = (p.gender, c_code, tokens)
        clusters.setdefault(key, []).append(p)

    merged_groups = 0
    deleted_players = 0

    for key, group in clusters.items():
        if len(group) <= 1:
            continue

        # Sub-group by birth_year if birth_year is specified
        by_year = {}
        no_year = []
        for p in group:
            if p.birth_year:
                by_year.setdefault(p.birth_year, []).append(p)
            else:
                no_year.append(p)

        # Merge sub-groups with same birth_year
        for b_year, sub_list in by_year.items():
            if len(sub_list) > 1:
                primary, to_delete = merge_tt_subgroup(db, sub_list, ranking_counts)
                merged_groups += 1
                deleted_players += len(to_delete)

        # If there are no_year players, merge them into the best matching player in group
        if no_year:
            # Pick primary among all group
            all_sorted = sorted(group, key=lambda p: score_tt_player(p, ranking_counts), reverse=True)
            primary = all_sorted[0]
            for p in no_year:
                if p.id != primary.id:
                    merge_tt_player_into(db, p, primary)
                    merged_groups += 1
                    deleted_players += 1

    db.commit()
    print(f"✅ Table Tennis Deduplication Complete! Merged {merged_groups} duplicate groups, deleted {deleted_players} duplicate player records.")

def merge_tt_subgroup(db, sub_list, ranking_counts):
    sorted_list = sorted(sub_list, key=lambda p: score_tt_player(p, ranking_counts), reverse=True)
    primary = sorted_list[0]
    secondaries = sorted_list[1:]
    for sec in secondaries:
        merge_tt_player_into(db, sec, primary)
    return primary, secondaries

def merge_tt_player_into(db, secondary, primary):
    print(f"  Merging Duplicate TT Player ID {secondary.id} ('{secondary.first_name} {secondary.last_name}', {secondary.country}) -> Primary ID {primary.id} ('{primary.first_name} {primary.last_name}', {primary.country})")
    
    # Update primary details if primary is missing fields
    if not primary.picture and secondary.picture:
        primary.picture = secondary.picture
    if not primary.birth_year and secondary.birth_year:
        primary.birth_year = secondary.birth_year
        primary.birth_month = secondary.birth_month
        primary.birth_date = secondary.birth_date

    # Re-link rankings from secondary to primary
    db.execute(
        text("UPDATE tt_rankings_historical SET player_id = :p_id WHERE player_id = :s_id"),
        {"p_id": primary.id, "s_id": secondary.id}
    )

    # Delete secondary historical player record
    db.delete(secondary)

def main():
    db = SessionLocal()
    try:
        deduplicate_tt_players(db)
    finally:
        db.close()

if __name__ == '__main__':
    main()
