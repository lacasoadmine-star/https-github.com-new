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
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
NAMES = """Multi Hot 5 Burn Wilds|Multi Hot 5 Super Wilds|Multi Hot 10|Multi Hot 20|Multi Hot 100|Multi Hot Ways|Burning Ice|Burning Ice 10|Burning Ice 40|Hot Samba|Safari Simba|Samurai|Vampires|Book of Win|Book of Futuria|Dark|Dark 100|Magic Garden|Magic Garden 10|Magic Garden 40|Moonstone|Princess of Birds|The Kingdom of The Elves|Evolution|Caravan of Riches|Wilds and Gods|Fruity Time|Jungles|Blazing Hot 10|Blazing Hot 40|Cashino|Chilli Flame 7s|City Slot|Crazy Mustang|Dota|Double Fruit|Egypt|Genie's Bonanza|Golden Ball|Happy New Year|Joker's Wild|Madagascar|Pharaoh's Coin|Summer Cocktail|Sweet Kingdom|Wild Jungle|Zombies|JetX|JetX3|Next Level JetX|Helicopter X|Football X|Cricket X|Plinko X|Plinko X Classic|Balloon|Mine Island|Mine Island 2|Crash Duel X|Propel X|SplitX|PopX|World Champion X|Cappadocia|Aviastar|Tower X|Hunter X|Roll X|Slicer X|Smash X|Dr. Shocker|4 Bonuses Bonanza|Fruit Roulette|European Roulette|American Roulette|Personal Roulette|Virtual Burning Roulette|Virtual Classic Roulette|Blackjack|Texas Hold'em Poker|Caribbean Stud Poker|Russian Poker|Joker Poker|Sic Bo|Keno|Russian Keno|VIP Keno|Toto Keno|Bingo|Fortune Catch""".split('|')

def norm(value):
    return re.sub(r'[^a-z0-9]', '', value.lower())

def fetch(url):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'ZPLAY-public-reference-metadata/1.0'})
        with urllib.request.urlopen(request, timeout=35) as response:
            body = response.read(4 * 1024 * 1024)
            text = body.decode('utf-8', errors='replace')
            heads = [html.unescape(re.sub('<[^>]+>', '', x)).strip() for x in re.findall(r'<h1\b[^>]*>(.*?)</h1>', text, re.S | re.I)]
            links = [html.unescape(x) for x in re.findall(r'href=["\']([^"\']+)["\']', text)]
            demos = list(dict.fromkeys(x for x in links if 'ssgportal.com/GameLauncher/' in x))
            # Main product appears before related-games links. Preserve the exact href.
            return {'requestedUrl': url, 'responseUrl': response.geturl(), 'status': response.status, 'retrievedAtUtc': started,
                    'sizeBytes': len(body), 'sha256': hashlib.sha256(body).hexdigest(), 'headings': list(dict.fromkeys(heads)),
                    'officialDemoHrefs': demos, 'contentType': response.headers.get('Content-Type')}
    except (OSError, urllib.error.URLError) as error:
        return {'requestedUrl': url, 'retrievedAtUtc': started, 'error': str(error), 'status': getattr(error, 'code', None)}

def parse_catalog(text):
    records = []
    for block in re.split(r'<div[^>]*role="listitem"[^>]*>', text):
        names = re.findall(r'fs-cmsfilter-field="name"[^>]*>(.*?)</p>', block)
        if not names:
            continue
        pages = re.findall(r'href="(/games/[^"?#]+)"', block)
        demos = re.findall(r'href="(https://eu-server.ssgportal.com/[^"<>]+)"', block)
        categories = re.findall(r'fs-cmsfilter-field="category"[^>]*>(.*?)</p>', block)
        records.append({'name': html.unescape(names[0]).strip(),
                        'officialPage': 'https://www.smartsoftgaming.com' + pages[0] if pages else None,
                        'officialDemoHref': html.unescape(demos[0]) if demos else None,
                        'category': categories[0] if categories else None})
    return records

def main():
    catalogue_url = 'https://www.smartsoftgaming.com/games'
    with urllib.request.urlopen(catalogue_url, timeout=35) as response:
        raw = response.read()
    catalogue = parse_catalog(raw.decode())
    current = {norm(x['name']): x for x in catalogue}
    aliases = {'mineisland2': 'mineisland2', 'jetx3': 'aviastar', 'nextleveljetx': 'neweraofjetx', 'crashduelx': 'crashduel'}
    pages = sorted(set(x['officialPage'] for x in catalogue if x['officialPage']))
    # Reopen requested product pages, not all unrelated catalogue entries.
    requested_pages = set()
    for name in NAMES:
        key = aliases.get(norm(name), norm(name))
        if key in current:
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
            observation = page_by_url[product['officialPage']]
            row.update({'provider': 'SmartSoft Gaming', 'catalogueProductName': product['name'],
                        'officialPage': product['officialPage'], 'officialDemoHref': product['officialDemoHref'],
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
                            'parsedProductCount': len(catalogue)},
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
