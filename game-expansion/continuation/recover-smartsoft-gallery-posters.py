"""Capture original posters from individually linked official gallery cards.

The detail-page placeholder SVG is not game artwork. The gallery is a separate
public source, not an attempt to bypass access controls on any failed asset.
"""
import asyncio
import hashlib
import io
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'smartsoft-69-posters'


async def main():
    inventory = json.loads((OUT / 'inventory.json').read_text())
    gallery = json.loads((OUT / 'official-gallery.json').read_text())
    assert gallery['status'] == 200
    semaphore = asyncio.Semaphore(4)
    async with async_playwright() as p:
        request = await p.request.new_context(
            proxy={'server': os.environ['HTTPS_PROXY']}, user_agent='Mozilla/5.0')

        async def capture(row):
            if row['status'] == 'reused-previously-verified-official-poster':
                return row
            choices = {}
            for card in gallery['rows']:
                if card['url'].rstrip('/') != row['officialPage'].rstrip('/'):
                    continue
                links = {u.rstrip('/') for u in card.get('gameLinks', [])}
                if links - {row['officialPage'].rstrip('/')}:
                    continue
                for image in card['images']:
                    url = image['src']
                    if 'placeholder' not in url and urlparse(url).scheme == 'https':
                        choices[url] = image
            if len(choices) != 1:
                row['galleryRecovery'] = {'status': 'ambiguous-or-missing', 'candidates': len(choices)}
                return row
            url, image = next(iter(choices.items()))
            if row.get('sourceURL') == url and row.get('sha256'):
                row['galleryEvidence'] = {'page': gallery['source'], 'cardURL': row['officialPage'], 'imageAlt': image['alt']}
                return row
            async with semaphore:
                try:
                    response = await request.get(url, timeout=30000)
                    if response.status != 200:
                        row['galleryRecovery'] = {'status': response.status, 'sourceURL': url}
                        return row
                    body = await response.body()
                    assert 0 < len(body) <= 8_000_000
                    with Image.open(io.BytesIO(body)) as im:
                        width, height = im.size
                        fmt = im.format
                        assert width >= 80 and height >= 80
                    suffix = {'WEBP': '.webp', 'PNG': '.png', 'JPEG': '.jpg', 'AVIF': '.avif'}[fmt]
                    sha = hashlib.sha256(body).hexdigest()
                    path = OUT / (sha + suffix)
                    if not path.exists():
                        path.write_bytes(body)
                    old = {k: row[k] for k in ['sourceURL', 'status', 'imageStatus', 'sha256', 'localPath'] if k in row}
                    row.update({
                        'previousDetailPageEvidence': old,
                        'sourceURL': url, 'sourceAlt': image['alt'],
                        'selectionEvidence': 'image-inside-individual-exact-game-link-on-official-gallery',
                        'galleryEvidence': {'page': gallery['source'], 'cardURL': row['officialPage'], 'imageAlt': image['alt']},
                        'imageStatus': 200, 'status': 'official-poster-bytes-captured',
                        'sha256': sha, 'bytes': len(body), 'width': width, 'height': height,
                        'format': fmt, 'localPath': str(path), 'visuallyVerified': False,
                    })
                except Exception as exc:
                    row['galleryRecovery'] = {'status': 'failed', 'reason': str(exc)[:160]}
            return row

        rows = await asyncio.gather(*(capture(row) for row in inventory['rows']))
        await request.dispose()
    hashes = {}
    for row in rows:
        if row.get('sha256'):
            hashes.setdefault(row['sha256'], []).append(row['name'])
        slug = urlparse(row['officialPage']).path.rstrip('/').split('/')[-1]
        (OUT / (slug + '.json')).write_text(json.dumps(row, indent=2))
    inventory.update({
        'rows': rows,
        'counts': {s: sum(r['status'] == s for r in rows) for s in sorted({r['status'] for r in rows})},
        'duplicateImagesForReview': {sha: names for sha, names in hashes.items() if len(names) > 1},
    })
    (OUT / 'inventory.json').write_text(json.dumps(inventory, indent=2))
    print(json.dumps({k: v for k, v in inventory.items() if k != 'rows'}))


asyncio.run(main())
