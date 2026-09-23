#!/usr/bin/env python3
import json
import os
import shutil

def is_generic_image(url):
    if not url:
        return True
    u = url.lower()
    return "wikimedia.org" in u or "wikipedia.org" in u or "placeholder" in u or "default" in u

def normalize_name(name):
    if not name:
        return ""
    tokens = sorted(name.lower().strip().split())
    return " ".join(tokens)

def pick_best_player(p1, p2):
    """
    Given two records for the exact same physical player, pick the best/latest record
    and merge fields from the other.
    """
    # Prefer valid non-9999 ranking, and lower ranking number (better/active rank)
    r1 = p1.get('ranking') if (isinstance(p1.get('ranking'), int) and p1.get('ranking') > 0) else 9999
    r2 = p2.get('ranking') if (isinstance(p2.get('ranking'), int) and p2.get('ranking') > 0) else 9999

    if r1 != r2:
        primary = p1 if r1 < r2 else p2
        secondary = p2 if r1 < r2 else p1
    else:
        # If ranks are equal, prefer the one with birth_date or last_updated
        d1 = 1 if p1.get('birth_date') else 0
        d2 = 1 if p2.get('birth_date') else 0
        if d1 != d2:
            primary = p1 if d1 > d2 else p2
            secondary = p2 if d1 > d2 else p1
        else:
            primary = p1
            secondary = p2

    # Create a merged record based on primary
    merged = dict(primary)

    # Merge missing/better fields from secondary
    if not merged.get('birth_date') and secondary.get('birth_date'):
        merged['birth_date'] = secondary['birth_date']
    if (not merged.get('playing_style') or merged.get('playing_style') == 'Unknown') and secondary.get('playing_style') and secondary.get('playing_style') != 'Unknown':
        merged['playing_style'] = secondary['playing_style']
    if not merged.get('image_url') and secondary.get('image_url'):
        merged['image_url'] = secondary['image_url']
    if not merged.get('win_percentage') and secondary.get('win_percentage'):
        merged['win_percentage'] = secondary['win_percentage']

    # Career high rank logic: keep the absolute best career high rank
    ch1 = primary.get('career_high_rank') or primary.get('highest_ranking') or 9999
    ch2 = secondary.get('career_high_rank') or secondary.get('highest_ranking') or 9999
    if ch2 < ch1:
        merged['career_high_rank'] = ch2
        merged['highest_ranking'] = ch2
        merged['career_high_date'] = secondary.get('career_high_date') or secondary.get('highest_ranking_date')

    return merged

def process_file(json_filepath):
    print(f"Processing {json_filepath}...")
    with open(json_filepath, 'r', encoding='utf-8') as f:
        players = json.load(f)

    print(f"Original count: {len(players)}")

    unique_players = []
    image_url_to_index = {}
    name_dob_to_index = {}
    id_redirect_map = {}

    for p in players:
        pid = str(p.get('id'))
        img = p.get('image_url')
        name = p.get('name')
        dob = p.get('birth_date')
        norm_name = normalize_name(name)

        target_index = None

        # Check by unique headshot image URL first
        if img and not is_generic_image(img):
            if img in image_url_to_index:
                target_index = image_url_to_index[img]

        # Check by normalized name + birth_date if not matched by image
        if target_index is None and norm_name and dob:
            key = (norm_name, dob)
            if key in name_dob_to_index:
                target_index = name_dob_to_index[key]

        if target_index is not None:
            # We found a duplicate of an existing player!
            existing_p = unique_players[target_index]
            merged_p = pick_best_player(existing_p, p)
            unique_players[target_index] = merged_p
            
            existing_id = str(existing_p.get('id'))
            merged_id = str(merged_p.get('id'))
            if pid != merged_id:
                id_redirect_map[pid] = merged_id
            if existing_id != merged_id:
                id_redirect_map[existing_id] = merged_id

            merged_img = merged_p.get('image_url')
            if merged_img and not is_generic_image(merged_img):
                image_url_to_index[merged_img] = target_index
            if norm_name and merged_p.get('birth_date'):
                name_dob_to_index[(norm_name, merged_p.get('birth_date'))] = target_index
        else:
            new_index = len(unique_players)
            unique_players.append(p)
            if img and not is_generic_image(img):
                image_url_to_index[img] = new_index
            if norm_name and dob:
                name_dob_to_index[(norm_name, dob)] = new_index

    print(f"Deduplicated count: {len(unique_players)} (Removed {len(players) - len(unique_players)} duplicates)")
    return unique_players, id_redirect_map

def main():
    base_dir = "/home/nexonetics/nexonetics/tennis_app"
    web_json_dir = os.path.join(base_dir, "web/src/data/json")
    web_public_json_dir = os.path.join(base_dir, "web/public/data/json")
    frontend_json_dir = os.path.join(base_dir, "frontend/assets/data")

    tt_file = os.path.join(web_json_dir, "tt_players.json")
    clean_tt, tt_redirects = process_file(tt_file)

    with open(tt_file, 'w', encoding='utf-8') as f:
        json.dump(clean_tt, f, indent=2, ensure_ascii=False)

    tennis_file = os.path.join(web_json_dir, "players.json")
    clean_tennis, tennis_redirects = process_file(tennis_file)

    with open(tennis_file, 'w', encoding='utf-8') as f:
        json.dump(clean_tennis, f, indent=2, ensure_ascii=False)

    for fname in os.listdir(web_json_dir):
        src_p = os.path.join(web_json_dir, fname)
        if os.path.isfile(src_p):
            os.makedirs(web_public_json_dir, exist_ok=True)
            shutil.copy2(src_p, os.path.join(web_public_json_dir, fname))
            os.makedirs(frontend_json_dir, exist_ok=True)
            shutil.copy2(src_p, os.path.join(frontend_json_dir, fname))

    print("Data sync across web and frontend completed successfully.")

if __name__ == '__main__':
    main()
