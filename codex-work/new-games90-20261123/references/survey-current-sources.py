#!/usr/bin/env python3
"""Survey public provider metadata. Never treats a URL or HTTP200 as gameplay QA."""
from __future__ import annotations
import concurrent.futures
import datetime
import hashlib
import html
import json
import pathlib
import re
import sys

# The source script also works when invoked directly from outside the repository.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / 'tools'))
from smartsoft_demo_references import (extract_demo_launchers, fetch_official_page,
                                     official_page_url, select_demo_candidates)

ROOT = pathlib.Path(__file__).resolve().parent
NAMES = """Multi Hot 5 Burn Wilds|Multi Hot 5 Super Wilds|Multi Hot 10|Multi Hot 20|Multi Hot 100|Multi Hot Ways|Burning Ice|Burning Ice 10|Burning Ice 40|Hot Samba|Safari Simba|Samurai|Vampires|Book of Win|Book of Futuria|Dark|Dark 100|Magic Garden|Magic Garden 10|Magic Garden 40|Moonstone|Princess of Birds|The Kingdom of The Elves|Evolution|Caravan of Riches|Wilds and Gods|Fruity Time|Jungles|Blazing Hot 10|Blazing Hot 40|Cashino|Chilli Flame 7s|City Slot|Crazy Mustang|Dota|Double Fruit|Egypt|Genie's Bonanza|Golden Ball|Happy New Year|Joker's Wild|Madagascar|Pharaoh's Coin|Summer Cocktail|Sweet Kingdom|Wild Jungle|Zombies|JetX|JetX3|Next Level JetX|Helicopter X|Football X|Cricket X|Plinko X|Plinko X Classic|Balloon|Mine Island|Mine Island 2|Crash Duel X|Propel X|SplitX|PopX|World Champion X|Cappadocia|Aviastar|Tower X|Hunter X|Roll X|Slicer X|Smash X|Dr. Shocker|4 Bonuses Bonanza|Fruit Roulette|European Roulette|American Roulette|Personal Roulette|Virtual Burning Roulette|Virtual Classic Roulette|Blackjack|Texas Hold'em Poker|Caribbean Stud Poker|Russian Poker|Joker Poker|Sic Bo|Keno|Russian Keno|VIP Keno|Toto Keno|Bingo|Fortune Catch""".split('|')

def norm(value):
    return re.sub(r'[^a-z0-9]', '', value.lower())

def fetch(url):
    try:
        safe_url = official_page_url(url)
    except (TypeError, ValueError):
        return {'requestedUrl': None, 'status': None, 'pageStatus': 'INVALID_PRODUCT_URL'}
    try:
        body, observation = fetch_official_page(safe_url)
    except Exception as error:
        # A failed product must not abort independent product observations.
        return {'requestedUrl': safe_url, 'status': None, 'pageStatus': 'FETCH_ERROR',
                'errorType': type(error).__name__}
    if body is None:
        return observation
    text = body.decode('utf-8', errors='replace')
    heads = [html.unescape(re.sub('<[^>]+>', '', x)).strip() for x in re.findall(r'<h1\b[^>]*>(.*?)</h1>', text, re.S | re.I)]
    demos = extract_demo_launchers(text, url)
    return {**observation, 'headings': list(dict.fromkeys(heads)),
            'officialDemoHrefs': [entry['originalHref'] for entry in demos],
            'officialDemoLinks': demos}

def parse_catalog(text):
    records = []
    for block in re.split(r'<div[^>]*role="listitem"[^>]*>', text):
        names = re.findall(r'fs-cmsfilter-field="name"[^>]*>(.*?)</p>', block)
        if not names:
            continue
        pages = re.findall(r'href="(/games/[^"?#]+)"', block)
        page = 'https://www.smartsoftgaming.com' + pages[0] if pages else None
        try:
            page = official_page_url(page)
        except (TypeError, ValueError):
            page = None
        demos = extract_demo_launchers(block, page or 'https://www.smartsoftgaming.com/games')
        identities = {(entry['gameName'], entry['gameCategory']) for entry in demos}
        if len(identities) == 1:
            game_name, game_category = next(iter(identities))
            resolution = select_demo_candidates(demos, game_name, game_category)
        else:
            game_name = game_category = None
            resolution = {'referenceStatus': 'AMBIGUOUS' if identities else 'UNAVAILABLE', 'reference': None}
        reference = resolution['reference']
        categories = re.findall(r'fs-cmsfilter-field="category"[^>]*>(.*?)</p>', block)
        records.append({'name': html.unescape(names[0]).strip(),
                        'officialPage': page,
                        'officialDemoHref': reference['originalHref'] if reference else None,
                        'officialDemoLaunchUrl': reference['launchUrl'] if reference else None,
                        'demoGameName': game_name, 'demoGameCategory': game_category,
                        'referenceStatus': resolution['referenceStatus'],
                        'referenceRepairs': reference['repairs'] if reference else [],
                        'category': categories[0] if categories else None})
    return records


def reconcile_product_reference(product, observation):
    """Prefer an exact fresh product-page link; a stale catalogue link is not recovery."""
    game_name, category = product.get('demoGameName'), product.get('demoGameCategory')
    if game_name is None:
        return {'referenceStatus': 'UNAVAILABLE', 'reference': None,
                'reason': 'CATALOGUE_IDENTITY_UNAVAILABLE', 'gameplayStatus': 'NOT_TESTED', 'liveVerified': False}
    if observation.get('status') != 200 or observation.get('pageStatus') != 'FETCHED':
        result = select_demo_candidates([], game_name, category)
        return {**result, 'reason': 'PRODUCT_PAGE_UNAVAILABLE'}
    result = select_demo_candidates(observation.get('officialDemoLinks', []), game_name, category)
    return {**result, 'source': 'PRODUCT_PAGE'}

def main():
    catalogue_url = 'https://www.smartsoftgaming.com/games'
    raw, catalogue_observation = fetch_official_page(catalogue_url, allow_catalog=True)
    if raw is None:
        raise RuntimeError('OFFICIAL_CATALOGUE_UNAVAILABLE')
    catalogue = parse_catalog(raw.decode())
    current = {norm(x['name']): x for x in catalogue}
    aliases = {'mineisland2': 'mineisland2', 'jetx3': 'aviastar', 'nextleveljetx': 'neweraofjetx', 'crashduelx': 'crashduel'}
    # Reopen requested product pages, not all unrelated catalogue entries.
    requested_pages = set()
    for name in NAMES:
        key = aliases.get(norm(name), norm(name))
        if key in current and current[key]['officialPage']:
            requested_pages.add(current[key]['officialPage'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        observations = list(executor.map(fetch, sorted(requested_pages)))
    page_by_url = {x['requestedUrl']: x for x in observations}
    rows = []
    for ordinal, name in enumerate(NAMES, 1):
        key = aliases.get(norm(name), norm(name))
        product = current.get(key)
        row = {'ordinal': ordinal, 'requestedName': name, 'gameplayObservedThisSurvey': False,
               'manualRoundsObservedThisSurvey': 0, 'audioAudiblyVerifiedThisSurvey': False,
               'liveVerified': False, 'sourceStatus': 'CURRENT_PRIMARY_PRODUCT_METADATA' if product else 'CONTINUING_EXACT_IDENTITY_RESEARCH'}
        if product:
            observation = page_by_url.get(product['officialPage'], {'status': None, 'pageStatus': 'UNAVAILABLE'})
            resolution = reconcile_product_reference(product, observation)
            reference = resolution['reference']
            row.update({'provider': 'SmartSoft Gaming', 'catalogueProductName': product['name'],
                        'officialPage': product['officialPage'],
                        'catalogueOfficialDemoHref': product['officialDemoHref'],
                        'officialDemoHref': reference['originalHref'] if reference else None,
                        'officialDemoLaunchUrl': reference['launchUrl'] if reference else None,
                        'referenceResolution': resolution,
                        'catalogueCategory': product['category'], 'pageObservation': observation})
            if name in ['JetX3', 'Aviastar']:
                row['identityIssue'] = 'AviaStar product page links GameName=JetX3. These two requested names currently identify one official product, not two verified distinct games.'
            if name == 'Next Level JetX':
                row['identityIssue'] = 'Current title is New Era of JetX; public launcher uses GameCategory=JetXNew and GameName=JetX. Classic JetX is not inferred from this new-variant link.'
            if name == 'Crash Duel X':
                row['identityIssue'] = 'Current catalogue title Crash Duel links GameName=TugOfWar. Exact CrashDuelX versus this variant requires actual in-game verification.'
        elif name == 'JetX':
            row.update({'provider': 'SmartSoft Gaming', 'sourceStatus': 'CLASSIC_VARIANT_REQUIRES_SEPARATE_VERIFICATION',
                        'identityIssue': 'Official /games/jetx now represents New Era of JetX (JetXNew). Do not count the same link as classic and Next Level separately.'})
        rows.append(row)
    result = {'schema': 'zplay/new90-current-primary-source-survey/v1',
              'recordedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'timeZone': 'Africa/Addis_Ababa',
              'requestedCount': len(rows), 'excludedExactGames': ['MultiHot5', 'FoxyHot20', 'HabeshaFortune5'],
              'catalogue': {'url': catalogue_url, 'responseSha256': hashlib.sha256(raw).hexdigest(), 'responseSizeBytes': len(raw),
                            'parsedProductCount': len(catalogue), 'pageObservation': catalogue_observation},
              'scopeNote': 'Metadata/source discovery only. No browser interaction, game rounds, sound audition, visual parity, wallet integration or live new-game completion was performed by this survey.',
              'rows': rows}
    (ROOT / 'official-source-manifest.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    (ROOT / 'current-primary-catalogue.json').write_text(json.dumps(catalogue, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'requested': len(rows), 'catalogueProducts': len(catalogue),
                      'currentPrimaryProductMappings': sum(x['sourceStatus'] == 'CURRENT_PRIMARY_PRODUCT_METADATA' for x in rows),
                      'productPagesReopened': len(observations), 'http200': sum(x.get('status') == 200 for x in observations),
                      'files': ['official-source-manifest.json', 'current-primary-catalogue.json']}))

if __name__ == '__main__':
    main()
