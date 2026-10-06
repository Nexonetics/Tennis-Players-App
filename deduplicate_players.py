#!/usr/bin/env python3
import os
import sys
import json
import shutil
import re
import unicodedata

def is_generic_image(url):
    if not url:
        return True
    u = url.lower()
    return "wikimedia.org" in u or "wikipedia.org" in u or "placeholder" in u or "default" in u

def normalize_name(name):
    if not name:
        return ""
    nfkd = unicodedata.normalize('NFKD', name)
    no_accents = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', no_accents).lower()
    tokens = sorted([w for w in cleaned.split() if w])
    return " ".join(tokens)

def pick_best_player(p1, p2):
    """
    Given two records for the exact same physical player, pick the best/latest record
    and merge fields from the other.
    """
    r1 = p1.get('ranking') if (isinstance(p1.get('ranking'), int) and 0 < p1.get('ranking') < 9999) else 9999
    r2 = p2.get('ranking') if (isinstance(p2.get('ranking'), int) and 0 < p2.get('ranking') < 9999) else 9999

    # Prefer record with better rank, or if equal, prefer one with birth_date / latest last_updated
    if r1 != r2:
        primary = p1 if r1 < r2 else p2
        secondary = p2 if r1 < r2 else p1
    else:
        u1 = str(p1.get('last_updated') or '')
        u2 = str(p2.get('last_updated') or '')
        d1 = 1 if p1.get('birth_date') else 0
        d2 = 1 if p2.get('birth_date') else 0

        if u1 != u2:
            primary = p1 if u1 > u2 else p2
            secondary = p2 if u1 > u2 else p1
        elif d1 != d2:
            primary = p1 if d1 > d2 else p2
            secondary = p2 if d1 > d2 else p1
        else:
            primary = p1
            secondary = p2

    merged = dict(primary)

    # Merge missing/better fields from secondary
    if not merged.get('birth_date') and secondary.get('birth_date'):
        merged['birth_date'] = secondary['birth_date']
    
    img1 = merged.get('image_url')
    img2 = secondary.get('image_url')
    if not img1 and img2:
        merged['image_url'] = img2
    elif img2 and ('wttsimfiles' in img2 or 'atptour' in img2 or 'wtatennis' in img2):
        merged['image_url'] = img2

    if (not merged.get('playing_style') or merged.get('playing_style') == 'Unknown') and secondary.get('playing_style') and secondary.get('playing_style') != 'Unknown':
        merged['playing_style'] = secondary['playing_style']

    if merged.get('win_percentage') is None and secondary.get('win_percentage') is not None:
        merged['win_percentage'] = secondary['win_percentage']

    # Career high rank logic
    ch1 = primary.get('career_high_rank') or primary.get('highest_ranking') or 9999
    ch2 = secondary.get('career_high_rank') or secondary.get('highest_ranking') or 9999
    if ch2 < ch1:
        merged['career_high_rank'] = ch2
        merged['highest_ranking'] = ch2
        merged['career_high_date'] = secondary.get('career_high_date') or secondary.get('highest_ranking_date')

    # Keep latest timestamp
    u1 = str(primary.get('last_updated') or '')
    u2 = str(secondary.get('last_updated') or '')
    if u2 > u1:
        merged['last_updated'] = secondary.get('last_updated')

    return merged

# Country normalization: maps full names / alternate spellings to 3-letter codes
# so that "Portugal" and "POR" are treated as the same country.
_COUNTRY_NORM = {
    'PORTUGAL': 'POR', 'SPAIN': 'ESP', 'FRANCE': 'FRA', 'GERMANY': 'GER',
    'ITALY': 'ITA', 'CHINA': 'CHN', 'JAPAN': 'JPN', 'KOREA REPUBLIC': 'KOR',
    'SOUTH KOREA': 'KOR', 'NORTH KOREA': 'PRK', 'KOREA DPR': 'PRK',
    'UNITED STATES': 'USA', 'UNITED STATES OF AMERICA': 'USA',
    'GREAT BRITAIN': 'GBR', 'ENGLAND': 'ENG', 'BRAZIL': 'BRA',
    'ARGENTINA': 'ARG', 'COLOMBIA': 'COL', 'MEXICO': 'MEX', 'CHILE': 'CHI',
    'PERU': 'PER', 'CUBA': 'CUB', 'RUSSIA': 'RUS', 'UKRAINE': 'UKR',
    'ROMANIA': 'ROU', 'ROUMANIA': 'ROU', 'CZECHIA': 'CZE', 'CZECH REPUBLIC': 'CZE',
    'SLOVAKIA': 'SVK', 'SLOVAK REPUBLIC': 'SVK', 'SERBIA': 'SRB',
    'CROATIA': 'CRO', 'SLOVENIA': 'SLO', 'AUSTRIA': 'AUT', 'BELGIUM': 'BEL',
    'NETHERLANDS': 'NED', 'DENMARK': 'DEN', 'SWEDEN': 'SWE', 'NORWAY': 'NOR',
    'FINLAND': 'FIN', 'SWITZERLAND': 'SUI', 'TURKEY': 'TUR', 'TÜRKIYE': 'TUR',
    'INDIA': 'IND', 'INDONESIA': 'INA', 'MALAYSIA': 'MAS', 'THAILAND': 'THA',
    'CHINESE TAIPEI': 'TPE', 'HONG KONG': 'HKG', 'HONG KONG, CHINA': 'HKG',
    'MACAO': 'MAC', 'MACAO, CHINA': 'MAC', 'EGYPT': 'EGY', 'ALGERIA': 'ALG',
    'AUSTRALIA': 'AUS', 'NEW ZEALAND': 'NZL', 'CANADA': 'CAN',
    'SOUTH AFRICA': 'RSA', 'NIGERIA': 'NGR', 'KENYA': 'KEN',
    'KAZAKHSTAN': 'KAZ', 'UZBEKISTAN': 'UZB', 'GEORGIA': 'GEO',
    'ISRAEL': 'ISR', 'MOROCCO': 'MAR', 'TUNISIA': 'TUN',
    'PAPUA NEW GUINEA': 'PNG', 'SAN MARINO': 'SMR', 'NORTH MACEDONIA': 'MKD',
    'MACEDONIA': 'MKD', 'KYRGYZSTAN': 'KGZ', 'CAMEROON': 'CMR',
    'CONGO BRAZZAVILLE': 'CGO', 'REPUBLIC OF CONGO': 'CGO',
    "COTE D'IVOIRE": 'CIV', 'IVORY COAST': 'CIV',
    'TAHITI': 'PYF', 'FRENCH POLYNESIA': 'PYF',
    'LEBANON': 'LBN', 'SENEGAL': 'SEN', 'DENMARK': 'DEN',
    'BENIN': 'BEN', 'LAOS': 'LAO',
    'CHINESE (BEFORE 2015)PORTUGUESE (AFTER 2015)[3]': 'POR',
}

def normalize_country_for_dedup(c):
    """Normalize country to 3-letter code for comparison."""
    if not c:
        return '???'
    up = c.strip().upper()
    return _COUNTRY_NORM.get(up, up[:3] if len(up) >= 3 else up)

def same_country(c1, c2):
    """Return True if two country strings refer to the same country."""
    n1 = normalize_country_for_dedup(c1)
    n2 = normalize_country_for_dedup(c2)
    # Unknown countries don't block a merge
    if n1 == '???' or n2 == '???' or not n1 or not n2:
        return True
    return n1 == n2


def extract_year(dob_val):
    if not dob_val:
        return None
    s = str(dob_val).strip()
    m = re.search(r'\b(19\d\d|20\d\d)\b', s)
    return int(m.group(1)) if m else None

def get_headshot_id(url):
    if not url:
        return None
    m = re.search(r'/(\d+)_', url)
    return m.group(1) if m else None

# Specifically protect known distinct player IDs from merging
PROTECTED_DISTINCT_IDS = {
    (14373, 3341), (3341, 14373),  # Lee Daeun
    (4389, 4411), (4411, 4389),    # Maria Garcia POR / CUB
    (4389, 4412), (4412, 4389),    # Maria Garcia POR / ARG
    (4411, 4412), (4412, 4411),    # Maria Garcia CUB / ARG
    (520, 13326), (13326, 520),    # Park Gyeongtae
    (4822, 13386), (13386, 4822),  # Tsholofelo Gaokgalemelwe
    (4085, 13330), (13330, 4085),  # Yang Hao-Jen
}

def can_merge_players(p1, p2):
    """
    Carefully compare ALL available data to determine if p1 and p2
    are genuinely the exact same physical player, or different players with the same name.
    """
    # 1. Gender check
    g1 = (p1.get('gender') or p1.get('category') or '').upper()
    g2 = (p2.get('gender') or p2.get('category') or '').upper()
    if g1 and g2 and g1 != g2:
        return False

    # 2. Distinct IDs check
    id1 = p1.get('id')
    id2 = p2.get('id')
    if (id1, id2) in PROTECTED_DISTINCT_IDS:
        return False

    # 3. Normalized Name check
    n1 = normalize_name(p1.get('name'))
    n2 = normalize_name(p2.get('name'))
    if n1 != n2:
        return False

    # Explicit protection for all Lee Daeun records
    if "daeun" in n1 and "lee" in n1 and id1 != id2:
        return False

    # 4. Country check
    c1 = p1.get('country') or p1.get('nationality') or ''
    c2 = p2.get('country') or p2.get('nationality') or ''
    if not same_country(c1, c2):
        return False

    # 5. Headshot image / photo ID check
    img1 = p1.get('image_url')
    img2 = p2.get('image_url')
    if img1 and img2 and not is_generic_image(img1) and not is_generic_image(img2):
        hid1 = get_headshot_id(img1)
        hid2 = get_headshot_id(img2)
        if hid1 and hid2 and hid1 != hid2:
            return False  # Different official player photo IDs (e.g. 135391 vs 132702)
        if not hid1 and not hid2 and img1 != img2:
            return False

    # 6. Birth date / year / age check
    dob1 = p1.get('birth_date')
    dob2 = p2.get('birth_date')
    if dob1 and dob2:
        if str(dob1) != str(dob2):
            y1 = extract_year(dob1)
            y2 = extract_year(dob2)
            if y1 and y2 and y1 != y2:
                return False

    # 7. Active ranking in current snapshot check
    # If BOTH players have an active rank (1 <= rank < 9999), and their ranks differ:
    # A single physical player CANNOT be ranked at two different positions in the same official ranking list!
    r1 = p1.get('ranking')
    r2 = p2.get('ranking')
    if isinstance(r1, int) and 0 < r1 < 9999 and isinstance(r2, int) and 0 < r2 < 9999:
        if r1 != r2:
            return False

    return True


def process_file(json_filepath):
    print(f"Processing {json_filepath}...")
    with open(json_filepath, 'r', encoding='utf-8') as f:
        players = json.load(f)

    print(f"Original count: {len(players)}")

    # Group players by gender/category to deduplicate and re-rank per category
    gender_groups = {}
    for p in players:
        g = (p.get('gender') or p.get('category') or 'M').upper()
        if g not in gender_groups:
            gender_groups[g] = []
        gender_groups[g].append(p)

    all_deduped_players = []

    for g, group in gender_groups.items():
        unique_players = []

        for p in group:
            target_index = None

            # Compare against existing unique players using all available data
            for idx, existing_p in enumerate(unique_players):
                if can_merge_players(existing_p, p):
                    target_index = idx
                    break

            if target_index is not None:
                existing_p = unique_players[target_index]
                merged_p = pick_best_player(existing_p, p)
                unique_players[target_index] = merged_p
            else:
                unique_players.append(p)


        # Re-rank logic: separate valid ranks (< 9999) and unranked/legacy (>= 9999)
        ranked_players = [p for p in unique_players if p.get('ranking') and 0 < p.get('ranking') < 9999]
        unranked_players = [p for p in unique_players if not p.get('ranking') or p.get('ranking') >= 9999]

        # Sort ranked players by ranking asc, last_updated desc, name asc
        ranked_players.sort(key=lambda x: (
            x.get('ranking') or 9999,
            0 if (x.get('last_updated') and '2026' in str(x.get('last_updated'))) else 1,
            x.get('name') or ''
        ))

        # Re-assign clean, unique sequential ranks (1, 2, 3, 4...)
        for new_rank, p in enumerate(ranked_players, start=1):
            p['ranking'] = new_rank

        all_deduped_players.extend(ranked_players)
        all_deduped_players.extend(unranked_players)

    print(f"Deduplicated count: {len(all_deduped_players)} (Removed {len(players) - len(all_deduped_players)} duplicates)")
    return all_deduped_players

def main():
    base_dir = "/home/nexonetics/nexonetics/tennis_app"
    web_json_dir = os.path.join(base_dir, "web/src/data/json")
    web_public_json_dir = os.path.join(base_dir, "web/public/data/json")
    frontend_json_dir = os.path.join(base_dir, "frontend/assets/data")

    target_files = [
        "tt_players.json",
        "players.json",
        "football_national_teams.json",
        "basketball_national_teams.json",
        "basketball_clubs.json"
    ]

    for fname in target_files:
        src_file = os.path.join(web_json_dir, fname)
        if os.path.isfile(src_file):
            clean_data = process_file(src_file)
            with open(src_file, 'w', encoding='utf-8') as f:
                json.dump(clean_data, f, indent=2, ensure_ascii=False)

    web_out_json_dir = os.path.join(base_dir, "web/out/data/json")

    for fname in os.listdir(web_json_dir):
        src_p = os.path.join(web_json_dir, fname)
        if os.path.isfile(src_p):
            os.makedirs(web_public_json_dir, exist_ok=True)
            shutil.copy2(src_p, os.path.join(web_public_json_dir, fname))
            os.makedirs(frontend_json_dir, exist_ok=True)
            shutil.copy2(src_p, os.path.join(frontend_json_dir, fname))
            if os.path.exists(os.path.join(base_dir, "web/out")):
                os.makedirs(web_out_json_dir, exist_ok=True)
                shutil.copy2(src_p, os.path.join(web_out_json_dir, fname))

    print("Data sync across web and frontend completed successfully.")

if __name__ == '__main__':
    main()
