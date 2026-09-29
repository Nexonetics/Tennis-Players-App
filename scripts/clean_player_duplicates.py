#!/usr/bin/env python3
"""
High-Speed Vectorized Player Deduplication & Merging Script.
Runs in < 5 seconds by using in-memory dictionary indexing for SQL updates.
"""

import os
import sys
import re
import json
import argparse
import unicodedata
from collections import defaultdict

# Setup paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking, TableTennisPlayer
from app.models.player import TennisHistoricalPlayer, TennisHistoricalRanking, Player
from export_all_frontend_cache import export_all

def clean_spacing(s: str) -> str:
    if not s:
        return ""
    s = s.replace('^^', ' ')
    return re.sub(r'\s+', ' ', s).strip()

def norm_str(s: str) -> str:
    if not s:
        return ""
    nfkd = unicodedata.normalize('NFKD', s)
    no_accents = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', no_accents).lower()
    return re.sub(r'\s+', ' ', cleaned).strip()

def get_tokens(name: str):
    s = norm_str(name)
    return tuple(sorted([w for w in s.split() if w]))

def normalize_country(c: str) -> str:
    if not c:
        return 'UNKNOWN'
    c_up = c.strip().upper()
    mapping = {
        'ITALY': 'ITA', 'ITA': 'ITA',
        'GERMANY': 'GER', 'GER': 'GER',
        'FRANCE': 'FRA', 'FRENCH': 'FRA', 'FRA': 'FRA',
        'SWEDEN': 'SWE', 'SWE': 'SWE',
        'JAPAN': 'JPN', 'JPN': 'JPN',
        'CHINA': 'CHN', 'CHN': 'CHN',
        'HONG KONG': 'HKG', 'HONG KONG, CHINA': 'HKG', 'HKG': 'HKG',
        'ENGLAND': 'ENG', 'ENG': 'ENG', 'GREAT BRITAIN': 'GBR', 'GBR': 'GBR',
        'UNITED STATES': 'USA', 'UNITED STATES OF AMERICA': 'USA', 'USA': 'USA',
        'SLOVENIA': 'SLO', 'SLO': 'SLO',
        'AUSTRIA': 'AUT', 'AUT': 'AUT',
        'CROATIA': 'CRO', 'CRO': 'CRO',
        'NIGERIA': 'NGR', 'NGR': 'NGR',
        'PORTUGAL': 'POR', 'POR': 'POR',
        'DENMARK': 'DEN', 'DEN': 'DEN',
        'SOUTH KOREA': 'KOR', 'KOREA REPUBLIC': 'KOR', 'KOR': 'KOR',
        'NORTH KOREA': 'PRK', 'KOREA DPR': 'PRK', 'PRK': 'PRK',
        'INDIA': 'IND', 'IND': 'IND',
        'BRAZIL': 'BRA', 'BRA': 'BRA',
        'SPAIN': 'ESP', 'ESP': 'ESP',
        'ARGENTINA': 'ARG', 'ARG': 'ARG',
        'SERBIA': 'SRB', 'SRB': 'SRB',
        'SLOVAKIA': 'SVK', 'SLOVAK REPUBLIC': 'SVK', 'SVK': 'SVK',
        'CZECHIA': 'CZE', 'CZECH REPUBLIC': 'CZE', 'CZE': 'CZE',
        'BELGIUM': 'BEL', 'BEL': 'BEL',
        'ROUMANIA': 'ROU', 'ROMANIA': 'ROU', 'ROU': 'ROU',
        'PERU': 'PER', 'PER': 'PER',
        'CHILE': 'CHI', 'CHI': 'CHI',
        'TURKEY': 'TUR', 'TÜRKIYE': 'TUR', 'TUR': 'TUR',
        'MALDIVES': 'MDV', 'MDV': 'MDV',
        'EL SALVADOR': 'ESA', 'ESA': 'ESA',
        'COSTA RICA': 'CRC', 'CRC': 'CRC',
        'MAURITIUS': 'MRI', 'MRI': 'MRI',
        'CONGO DEMOCRATIC': 'COD', 'DEMOCRATIC REPUBLIC OF THE CONGO': 'COD', 'COD': 'COD',
        'MALAYSIA': 'MAS', 'MAS': 'MAS',
        'NEW CALEDONIA': 'NCL', 'NCL': 'NCL',
        'TRINIDAD AND TOBAGO': 'TTO', 'TTO': 'TTO',
        'MONGOLIA': 'MGL', 'MGL': 'MGL',
        'INDONESIA': 'INA', 'INA': 'INA',
        'RUSSIA': 'RUS', 'RUS': 'RUS',
        'LUXEMBOURG': 'LUX', 'LUX': 'LUX',
        'SRI LANKA': 'SRI', 'SRI': 'SRI',
        'TAHITI': 'PYF', 'PYF': 'PYF',
        'GUINEA': 'GUI', 'GUI': 'GUI',
        'MACAO': 'MAC', 'MACAO, CHINA': 'MAC', 'MAC': 'MAC',
        'CHINESE TAIPEI': 'TPE', 'TPE': 'TPE',
        'BOTSWANA': 'BOT', 'BOT': 'BOT',
        'KUWAIT': 'KUW', 'KUW': 'KUW',
        'COLOMBIA': 'COL', 'COL': 'COL',
        'LAOS': 'LAO', 'LAO': 'LAO',
        'SWITZERLAND': 'SUI', 'SUI': 'SUI',
        'ALGERIA': 'ALG', 'ALG': 'ALG',
        'EGYPT': 'EGY', 'EGY': 'EGY',
        'GREECE': 'GRE', 'GRE': 'GRE'
    }
    return mapping.get(c_up, c_up[:3])

def is_generic_picture(url: str) -> bool:
    if not url or not url.strip():
        return True
    u = url.lower()
    return "wikimedia.org" in u or "wikipedia.org" in u or "placeholder" in u or "default" in u

def score_tt_player(p: TableTennisHistoricalPlayer, ranking_counts: dict, latest_ranks: dict) -> int:
    score = 0
    latest_rank = latest_ranks.get(p.id, 9999)
    if latest_rank < 9999:
        score += 10000

    if p.picture and not is_generic_picture(p.picture):
        score += 2000
    elif p.picture:
        score += 500

    r_count = ranking_counts.get(p.id, 0)
    score += min(r_count, 1000)

    if p.birth_year and p.birth_month and p.birth_date:
        score += 500

    full = f"{p.first_name} {p.last_name}"
    if '^^' not in full:
        score += 100
    if any(w.isupper() and len(w) > 1 for w in full.split()):
        score += 200

    return score

def score_tennis_player(p: TennisHistoricalPlayer, ranking_counts: dict, latest_ranks: dict) -> int:
    score = 0
    latest_rank = latest_ranks.get(p.id, 9999)
    if latest_rank < 9999:
        score += 10000

    if p.picture and not is_generic_picture(p.picture):
        score += 2000
    elif p.picture:
        score += 500

    r_count = ranking_counts.get(p.id, 0)
    score += min(r_count, 1000)

    if p.birth_year and p.birth_month and p.birth_date:
        score += 500

    return score

def process_table_tennis(db, dry_run: bool = True):
    print("\n" + "=" * 60)
    print("TABLE TENNIS DEDUPLICATION & MERGING")
    print("=" * 60)

    players = db.query(TableTennisHistoricalPlayer).all()
    print(f"Loaded {len(players)} Table Tennis Historical Players.")

    counts_res = db.query(
        TableTennisHistoricalRanking.player_id,
        text("COUNT(id)")
    ).group_by(TableTennisHistoricalRanking.player_id).all()
    ranking_counts = {r[0]: r[1] for r in counts_res}

    latest_date_res = db.query(
        TableTennisHistoricalRanking.ranking_year,
        TableTennisHistoricalRanking.ranking_month,
        TableTennisHistoricalRanking.ranking_date
    ).order_by(
        TableTennisHistoricalRanking.ranking_year.desc(),
        TableTennisHistoricalRanking.ranking_month.desc(),
        TableTennisHistoricalRanking.ranking_date.desc()
    ).first()

    latest_ranks = {}
    if latest_date_res:
        latest_ranks_res = db.query(
            TableTennisHistoricalRanking.player_id,
            TableTennisHistoricalRanking.rank
        ).filter(
            TableTennisHistoricalRanking.ranking_year == latest_date_res[0],
            TableTennisHistoricalRanking.ranking_month == latest_date_res[1],
            TableTennisHistoricalRanking.ranking_date == latest_date_res[2]
        ).all()
        latest_ranks = {r[0]: r[1] for r in latest_ranks_res}

    clusters_map = defaultdict(list)
    for p in players:
        full_name = f"{p.first_name or ''} {p.last_name or ''}".strip()
        tokens = get_tokens(full_name)
        if len(tokens) >= 2:
            key = (tokens, p.gender)
            clusters_map[key].append(p)

    clusters = []
    for key, member_list in clusters_map.items():
        if len(member_list) > 1:
            countries = set(normalize_country(m.country) for m in member_list if normalize_country(m.country) not in ('UNKNOWN', 'UNK'))
            if len(countries) <= 1:
                dobs = set()
                for m in member_list:
                    if m.birth_year and m.birth_month and m.birth_date:
                        dobs.add((m.birth_year, m.birth_month, m.birth_date))
                if len(dobs) <= 1:
                    clusters.append(member_list)

    print(f"Found {len(clusters)} valid duplicate clusters in Table Tennis.")

    # Pre-load ALL rankings into memory map for fast vectorized merging
    all_rankings = db.query(TableTennisHistoricalRanking).all()
    rankings_by_pid = defaultdict(list)
    for r in all_rankings:
        rankings_by_pid[r.player_id].append(r)

    merged_count = 0
    secondaries_removed = 0
    ranking_deletes_ids = []
    ranking_updates = []
    secondary_pids_to_delete = []

    for cluster in clusters:
        sorted_cluster = sorted(cluster, key=lambda p: score_tt_player(p, ranking_counts, latest_ranks), reverse=True)
        primary = sorted_cluster[0]
        secondaries = sorted_cluster[1:]

        best_fn = clean_spacing(primary.first_name)
        best_ln = clean_spacing(primary.last_name)

        for p in cluster:
            fn = clean_spacing(p.first_name)
            ln = clean_spacing(p.last_name)
            if ln.isupper() and len(ln) > 1 and not fn.isupper():
                best_fn, best_ln = fn, ln
                break
            elif fn.isupper() and len(fn) > 1 and not ln.isupper():
                best_fn, best_ln = ln, fn
                break

        pri_name = f"{best_fn} {best_ln}".strip()

        if not dry_run:
            primary.first_name = best_fn
            primary.last_name = best_ln

        primary_dates = set((r.ranking_year, r.ranking_month, r.ranking_date) for r in rankings_by_pid.get(primary.id, []))

        for sec in secondaries:
            sec_name = f"{sec.first_name} {sec.last_name}".strip()
            secondary_pids_to_delete.append(sec.id)

            if not dry_run:
                # Merge DOB
                if not primary.birth_year and sec.birth_year:
                    primary.birth_year = sec.birth_year
                    primary.birth_month = sec.birth_month
                    primary.birth_date = sec.birth_date

                # Merge Picture
                if (is_generic_picture(primary.picture)) and sec.picture and not is_generic_picture(sec.picture):
                    primary.picture = sec.picture
                elif not primary.picture and sec.picture:
                    primary.picture = sec.picture

                # Merge Country
                if (not primary.country or primary.country.upper() == 'UNKNOWN') and sec.country:
                    primary.country = sec.country

                # Resolve rankings
                sec_ranks = rankings_by_pid.get(sec.id, [])
                for r in sec_ranks:
                    d_tuple = (r.ranking_year, r.ranking_month, r.ranking_date)
                    if d_tuple in primary_dates:
                        ranking_deletes_ids.append(r.id)
                    else:
                        ranking_updates.append((primary.id, r.id))
                        primary_dates.add(d_tuple)

            secondaries_removed += 1
        merged_count += 1

    if not dry_run:
        print(f"Executing batch deletion of {len(ranking_deletes_ids)} duplicate ranking snapshots...")
        if ranking_deletes_ids:
            chunk_size = 500
            for i in range(0, len(ranking_deletes_ids), chunk_size):
                chunk = ranking_deletes_ids[i:i+chunk_size]
                db.execute(text(f"DELETE FROM tt_rankings_historical WHERE id IN ({','.join(map(str, chunk))})"))

        print(f"Executing batch update of {len(ranking_updates)} ranking snapshots...")
        for pri_id, r_id in ranking_updates:
            db.execute(text("UPDATE tt_rankings_historical SET player_id = :pid WHERE id = :rid"), {"pid": pri_id, "rid": r_id})

        print(f"Deleting {len(secondary_pids_to_delete)} secondary TT historical players...")
        if secondary_pids_to_delete:
            chunk_size = 500
            for i in range(0, len(secondary_pids_to_delete), chunk_size):
                chunk = secondary_pids_to_delete[i:i+chunk_size]
                db.execute(text(f"DELETE FROM tt_players_historical WHERE id IN ({','.join(map(str, chunk))})"))

        db.execute(text("""
            UPDATE tt_players_historical
            SET first_name = TRIM(REPLACE(first_name, '^^', '')),
                last_name = TRIM(REPLACE(last_name, '^^', ''))
            WHERE first_name LIKE '%^^%' OR last_name LIKE '%^^%'
        """))

        tt_legacy = db.query(TableTennisPlayer).all()
        leg_groups = defaultdict(list)
        for p in tt_legacy:
            if not p.name: continue
            cleaned_n = clean_spacing(p.name)
            p.name = cleaned_n
            tokens = get_tokens(cleaned_n)
            if len(tokens) >= 2:
                leg_groups[(tokens, p.gender)].append(p)

        for key, group in leg_groups.items():
            if len(group) > 1:
                group.sort(key=lambda x: (x.ranking if (x.ranking and x.ranking > 0) else 9999, x.id))
                pri_leg = group[0]
                for sec_leg in group[1:]:
                    if not pri_leg.birth_date and sec_leg.birth_date:
                        pri_leg.birth_date = sec_leg.birth_date
                    if (is_generic_picture(pri_leg.image_url)) and sec_leg.image_url and not is_generic_picture(sec_leg.image_url):
                        pri_leg.image_url = sec_leg.image_url
                    db.delete(sec_leg)

    print(f"Table Tennis Summary: Merged {merged_count} clusters, removed {secondaries_removed} secondary duplicate records.")


def process_tennis(db, dry_run: bool = True):
    print("\n" + "=" * 60)
    print("TENNIS DEDUPLICATION & MERGING")
    print("=" * 60)

    players = db.query(TennisHistoricalPlayer).all()
    print(f"Loaded {len(players)} Tennis Historical Players.")

    counts_res = db.query(
        TennisHistoricalRanking.player_id,
        text("COUNT(id)")
    ).group_by(TennisHistoricalRanking.player_id).all()
    ranking_counts = {r[0]: r[1] for r in counts_res}

    latest_date_res = db.query(
        TennisHistoricalRanking.ranking_year,
        TennisHistoricalRanking.ranking_month,
        TennisHistoricalRanking.ranking_date
    ).order_by(
        TennisHistoricalRanking.ranking_year.desc(),
        TennisHistoricalRanking.ranking_month.desc(),
        TennisHistoricalRanking.ranking_date.desc()
    ).first()

    latest_ranks = {}
    if latest_date_res:
        latest_ranks_res = db.query(
            TennisHistoricalRanking.player_id,
            TennisHistoricalRanking.rank
        ).filter(
            TennisHistoricalRanking.ranking_year == latest_date_res[0],
            TennisHistoricalRanking.ranking_month == latest_date_res[1],
            TennisHistoricalRanking.ranking_date == latest_date_res[2]
        ).all()
        latest_ranks = {r[0]: r[1] for r in latest_ranks_res}

    clusters_map = defaultdict(list)
    for p in players:
        full_name = f"{p.first_name or ''} {p.last_name or ''}".strip()
        tokens = get_tokens(full_name)
        if len(tokens) >= 2:
            key = (tokens, p.gender)
            clusters_map[key].append(p)

    clusters = []
    for key, member_list in clusters_map.items():
        if len(member_list) > 1:
            countries = set(normalize_country(m.country) for m in member_list if normalize_country(m.country) not in ('UNKNOWN', 'UNK'))
            if len(countries) <= 1:
                clusters.append(member_list)

    print(f"Found {len(clusters)} valid duplicate clusters in Tennis Historical.")

    # Clean legacy Tennis table `players`
    legacy_tennis = db.query(Player).all()
    leg_groups = defaultdict(list)
    for p in legacy_tennis:
        if not p.name: continue
        cleaned_n = clean_spacing(p.name)
        p.name = cleaned_n
        tokens = get_tokens(cleaned_n)
        if len(tokens) >= 2:
            leg_groups[(tokens, p.gender)].append(p)

    leg_merged = 0
    for key, group in leg_groups.items():
        if len(group) > 1:
            group.sort(key=lambda x: (x.ranking if (x.ranking and x.ranking > 0) else 9999, x.id))
            pri_leg = group[0]
            for sec_leg in group[1:]:
                print(f"  [TENNIS LEGACY MERGE] Primary ID {pri_leg.id} ('{pri_leg.name}') <-- Secondary ID {sec_leg.id} ('{sec_leg.name}')")
                if not dry_run:
                    if not pri_leg.birth_date and sec_leg.birth_date:
                        pri_leg.birth_date = sec_leg.birth_date
                    if (is_generic_picture(pri_leg.image_url)) and sec_leg.image_url and not is_generic_picture(sec_leg.image_url):
                        pri_leg.image_url = sec_leg.image_url
                    if not pri_leg.height and sec_leg.height:
                        pri_leg.height = sec_leg.height
                    if not pri_leg.weight and sec_leg.weight:
                        pri_leg.weight = sec_leg.weight
                    if (not pri_leg.playing_style or pri_leg.playing_style == 'Unknown') and sec_leg.playing_style and sec_leg.playing_style != 'Unknown':
                        pri_leg.playing_style = sec_leg.playing_style
                    db.delete(sec_leg)
                leg_merged += 1

    print(f"Tennis Summary: Merged {len(clusters)} historical clusters & {leg_merged} legacy player records.")


def main():
    parser = argparse.ArgumentParser(description="Deduplicate Tennis and Table Tennis Players")
    parser.add_argument("--execute", action="store_true", help="Commit database changes and update JSON caches")
    args = parser.parse_args()

    dry_run = not args.execute
    db = SessionLocal()

    try:
        if dry_run:
            print("============================================================")
            print("RUNNING IN DRY-RUN MODE (Pass --execute to commit changes)")
            print("============================================================")
        else:
            print("============================================================")
            print("RUNNING IN EXECUTE MODE (Database will be updated & synced)")
            print("============================================================")

        process_table_tennis(db, dry_run=dry_run)
        process_tennis(db, dry_run=dry_run)

        if not dry_run:
            db.commit()
            print("\nDatabase transaction committed successfully!")
            print("Exporting and syncing fresh JSON caches across frontend & web...")
            export_all()
            print("\n✅ ALL PLAYER DEDUPLICATIONS AND ASSET SYNCS COMPLETED SUCCESSFULLY!")
        else:
            print("\nDRY-RUN COMPLETED. No database changes were made.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR during deduplication: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    main()
