import os
import sys
import re
import argparse
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))
load_dotenv(os.path.join(project_root, 'backend', '.env'))

from sqlalchemy import func, text
from app.db.session import SessionLocal
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking, TableTennisPlayer

COUNTRY_MAP = {
    'INDIA': 'IND',
    'INDIAN': 'IND',
    'IND': 'IND',
    'UNITED STATES': 'USA',
    'UNITED STATES OF AMERICA': 'USA',
    'USA': 'USA',
    'GERMANY': 'GER',
    'GER': 'GER',
    'FRANCE': 'FRA',
    'FRA': 'FRA',
    'CHINA': 'CHN',
    'CHN': 'CHN',
    'JAPAN': 'JPN',
    'JPN': 'JPN',
}

def clean_name_str(s: str) -> str:
    if not s:
        return ""
    # Remove scraping artifacts like ^^
    s = s.replace('^^', ' ')
    # Normalize spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def normalize_tokens(first: str, last: str):
    full = f"{clean_name_str(first)} {clean_name_str(last)}".lower()
    words = re.findall(r'\b[a-z]+\b', full)
    return words

def normalize_country(c: str) -> str:
    if not c:
        return 'UNKNOWN'
    c_upper = c.strip().upper()
    return COUNTRY_MAP.get(c_upper, c_upper)

def find_duplicate_clusters(db):
    players = db.query(TableTennisHistoricalPlayer).all()
    print(f"Loaded {len(players)} total TT historical players from DB.")

    # 1. Group by outer tokens (first_word, last_word)
    outer_groups = {}
    for p in players:
        words = normalize_tokens(p.first_name, p.last_name)
        if len(words) < 2:
            continue
        first_word = words[0]
        last_word = words[-1]
        c_code = normalize_country(p.country)
        key = (p.gender, c_code, first_word, last_word)
        outer_groups.setdefault(key, []).append(p)

    duplicate_clusters = []
    processed_pids = set()

    for key, cluster in outer_groups.items():
        if len(cluster) > 1:
            duplicate_clusters.append((key, cluster))
            for p in cluster:
                processed_pids.add(p.id)

    # 2. Find subset duplicates among remaining players (same gender, country, first word, where name tokens are subset)
    first_word_groups = {}
    for p in players:
        if p.id in processed_pids:
            continue
        words = normalize_tokens(p.first_name, p.last_name)
        if len(words) < 2:
            continue
        c_code = normalize_country(p.country)
        key = (p.gender, c_code, words[0])
        first_word_groups.setdefault(key, []).append((p, set(words)))

    subset_clusters_map = {}
    for key, p_list in first_word_groups.items():
        if len(p_list) > 1:
            n = len(p_list)
            for i in range(n):
                for j in range(i + 1, n):
                    p1, tok1 = p_list[i]
                    p2, tok2 = p_list[j]
                    if len(tok1) >= 2 and len(tok2) >= 2:
                        if tok1.issubset(tok2) or tok2.issubset(tok1):
                            # Link p1 and p2
                            cluster_key = min(p1.id, p2.id)
                            if cluster_key not in subset_clusters_map:
                                subset_clusters_map[cluster_key] = set()
                            subset_clusters_map[cluster_key].add(p1)
                            subset_clusters_map[cluster_key].add(p2)

    for c_key, p_set in subset_clusters_map.items():
        c_list = list(p_set)
        if len(c_list) > 1:
            duplicate_clusters.append((("SUBSET", c_key), c_list))

    return duplicate_clusters

def score_player(p: TableTennisHistoricalPlayer, ranking_counts: dict) -> int:
    score = 0
    # Has profile picture
    if p.picture and p.picture.strip():
        score += 500
    # Ranking count
    r_count = ranking_counts.get(p.id, 0)
    score += r_count
    # Complete birth date
    if p.birth_year and p.birth_month and p.birth_date:
        score += 50
    # Clean name (no ^^ in original text)
    orig_name = f"{p.first_name} {p.last_name}"
    if '^^' not in orig_name:
        score += 30
    # Shorter name preferred (fewer middle name tokens)
    words = normalize_tokens(p.first_name, p.last_name)
    if len(words) == 2:
        score += 20
    return score

def merge_cluster(db, cluster, ranking_counts: dict, dry_run: bool = True):
    # Determine primary player
    sorted_cluster = sorted(cluster, key=lambda p: score_player(p, ranking_counts), reverse=True)
    primary = sorted_cluster[0]
    secondaries = sorted_cluster[1:]

    # Look across the cluster for the cleanest 2-word name (without middle names)
    best_fn = clean_name_str(primary.first_name)
    best_ln = clean_name_str(primary.last_name)
    for p in cluster:
        fn_c = clean_name_str(p.first_name)
        ln_c = clean_name_str(p.last_name)
        words = normalize_tokens(fn_c, ln_c)
        if len(words) == 2:
            best_fn = words[0].capitalize()
            best_ln = words[1].capitalize()
            break

    if not dry_run:
        primary.first_name = best_fn
        primary.last_name = best_ln

    primary_name = f"{best_fn} {best_ln}"

    logs = []
    logs.append(f"Cluster Primary -> ID {primary.id}: '{primary_name}' (Gender={primary.gender}, Country='{primary.country}', Pic={bool(primary.picture)}, Ranks={ranking_counts.get(primary.id, 0)})")

    for sec in secondaries:
        sec_name = f"{sec.first_name} {sec.last_name}"
        sec_ranks = ranking_counts.get(sec.id, 0)
        logs.append(f"   Merging Secondary -> ID {sec.id}: '{sec_name}' (Ranks={sec_ranks}) into Primary ID {primary.id}")

        if not dry_run:
            # Transfer metadata if primary is missing it
            if (not primary.picture or not primary.picture.strip()) and sec.picture:
                primary.picture = sec.picture
            if not primary.birth_year and sec.birth_year:
                primary.birth_year = sec.birth_year
                primary.birth_month = sec.birth_month
                primary.birth_date = sec.birth_date
            if (not primary.country or primary.country.upper() == 'UNKNOWN') and sec.country:
                primary.country = sec.country

            # Bulk SQL delete colliding dates from secondary
            db.execute(text("""
                DELETE FROM tt_rankings_historical
                WHERE player_id = :sec_id
                  AND EXISTS (
                      SELECT 1 FROM tt_rankings_historical r2
                      WHERE r2.player_id = :primary_id
                        AND r2.ranking_year = tt_rankings_historical.ranking_year
                        AND r2.ranking_month = tt_rankings_historical.ranking_month
                        AND r2.ranking_date = tt_rankings_historical.ranking_date
                  )
            """), {"sec_id": sec.id, "primary_id": primary.id})

            # Bulk SQL update remaining rankings to primary_id
            db.execute(text("""
                UPDATE tt_rankings_historical
                SET player_id = :primary_id
                WHERE player_id = :sec_id
            """), {"sec_id": sec.id, "primary_id": primary.id})

            # Bulk SQL delete secondary player
            db.execute(text("""
                DELETE FROM tt_players_historical
                WHERE id = :sec_id
            """), {"sec_id": sec.id})

    return logs

def main():
    parser = argparse.ArgumentParser(description="Deduplicate TT Historical Players")
    parser.add_argument("--execute", action="store_true", help="Execute database changes (default is dry-run)")
    args = parser.parse_args()

    dry_run = not args.execute
    db = SessionLocal()

    try:
        if dry_run:
            print("=== DRY RUN MODE (No DB changes will be committed) ===")
        else:
            print("=== EXECUTE MODE (DB changes will be committed) ===")

        clusters = find_duplicate_clusters(db)
        print(f"Found {len(clusters)} candidate duplicate clusters.\n")

        # Pre-fetch ranking counts
        counts_res = db.query(
            TableTennisHistoricalRanking.player_id,
            func.count(TableTennisHistoricalRanking.id)
        ).group_by(TableTennisHistoricalRanking.player_id).all()
        ranking_counts = {r[0]: r[1] for r in counts_res}

        merged_clusters_count = 0
        total_secondaries_removed = 0

        for key, cluster in clusters:
            logs = merge_cluster(db, cluster, ranking_counts, dry_run=dry_run)
            merged_clusters_count += 1
            total_secondaries_removed += (len(cluster) - 1)
            
            names_in_cluster = [f"{p.first_name} {p.last_name}" for p in cluster]
            is_target_player = any(n in ' '.join(names_in_cluster) for n in ['Jash', 'Diya', 'Manush', 'Manav', 'Abhinandh', 'Sharath'])
            if is_target_player or merged_clusters_count % 20 == 0:
                for line in logs:
                    print(line)
                print(f"--- Processed {merged_clusters_count}/{len(clusters)} clusters ---")

        # Clean artifact ^^ symbols for any remaining single players
        if not dry_run:
            db.execute(text("""
                UPDATE tt_players_historical
                SET first_name = TRIM(REPLACE(first_name, '^^', '')),
                    last_name = TRIM(REPLACE(last_name, '^^', ''))
                WHERE first_name LIKE '%^^%' OR last_name LIKE '%^^%'
            """))

            # Also deduplicate TableTennisPlayer (active table)
            tt_legacy_players = db.query(TableTennisPlayer).all()
            legacy_groups = {}
            for p in tt_legacy_players:
                if not p.name: continue
                words = re.findall(r'\b[a-z]+\b', p.name.lower())
                if len(words) < 2: continue
                key = (p.gender, words[0], words[-1])
                legacy_groups.setdefault(key, []).append(p)
            
            for key, group in legacy_groups.items():
                if len(group) > 1:
                    # Keep the one with highest rank (lowest rank number)
                    group.sort(key=lambda x: (x.ranking if x.ranking else 999999, x.id))
                    primary = group[0]
                    for sec in group[1:]:
                        db.delete(sec)

            db.commit()
            print(f"\n✅ SUCCESSFULLY EXECUTED: Merged {merged_clusters_count} clusters, removed {total_secondaries_removed} duplicate historical player records!")
            print(f"\n✅ SUCCESSFULLY EXECUTED: Merged {merged_clusters_count} clusters, removed {total_secondaries_removed} duplicate historical player records!")
        else:
            print(f"\nDRY RUN SUMMARY: Would merge {merged_clusters_count} clusters, removing {total_secondaries_removed} duplicate player records.")

    except Exception as e:
        db.rollback()
        print(f"ERROR during deduplication: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
