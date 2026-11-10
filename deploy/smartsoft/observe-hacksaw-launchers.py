"""Observe public demo iframe URLs from visible official Try it controls; never wager."""
import asyncio,json,hashlib,os,time
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit,parse_qs,urljoin
from playwright.async_api import async_playwright
ROOT=Path('/workspace/superwin-live/evidence/catalogue-r15')
source=(ROOT/'hacksaw.html').read_bytes();soup=BeautifulSoup(source,'html.parser');cards=[]
for card in soup.select('li[data-gameid]'):
 a=card.select_one('a[href^="/games/"]');name=card.select_one('.GridListItemOverlayInfo__bottom > p');img=card.select_one('[data-bg-image]')
 if a and name and img:cards.append({'providerKey':card['data-gameid'],'name':name.get_text(' ',strip=True),'officialPage':urljoin('https://www.hacksawgaming.com',a['href']),'officialIcon':img['data-bg-image']})
proxy=urlsplit(os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY'))
PROXY={'server':proxy.scheme+'://'+proxy.hostname+(':'+str(proxy.port) if proxy.port else '')}
if proxy.username:PROXY['username']=proxy.username
if proxy.password:PROXY['password']=proxy.password
async def main():
 rows=[];errors=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy=PROXY,args=['--no-sandbox'])
  context=await b.new_context(viewport={'width':1280,'height':900})
  page=await context.new_page()
  for card in cards[:25]:
   try:
    await page.goto(card['officialPage'],wait_until='domcontentloaded',timeout=25000)
    await page.wait_for_timeout(500)
    for label in ['Ok']:
     consent=page.get_by_text(label,exact=True).first
     if await consent.count() and await consent.is_visible():await consent.click();break
    button=page.locator('.js-launch-game[data-gameid="'+card['providerKey']+'"]:visible').first
    await button.click(timeout=5000)
    consent=page.get_by_text('Ok',exact=True).first
    if await consent.count() and await consent.is_visible():await consent.click();await page.wait_for_timeout(200)
    approve=page.locator('.js-responsible-approve')
    if await approve.is_visible():await approve.click()
    deadline=time.monotonic()+15;url=None
    while time.monotonic()<deadline:
     iframe=page.locator('iframe#Game')
     if await iframe.count():
      candidate=await iframe.get_attribute('src')
      if candidate and candidate.startswith('https://'):url=candidate;break
     await page.wait_for_timeout(150)
    if not url:raise ValueError('NO_PUBLISHED_IFRAME')
    qs=parse_qs(urlsplit(url).query)
    if qs.get('mode') not in (['demo'],['2']) or qs.get('gameid')!=[card['providerKey']]:raise ValueError('NOT_FREE_DEMO_IDENTITY')
    raw=await page.content();raw=raw.encode();(ROOT/'pages'/(hashlib.sha256(card['officialPage'].encode()).hexdigest()+'.html')).write_bytes(raw)
    rows.append({**card,'provider':'hacksaw','studio':'Hacksaw Gaming','officialDemo':url,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceBytes':len(raw),'status':'reference_identified','demoObserved':False,'presentationVerified':False,'financialRelease':False,'launcherObserved':True})
    await page.screenshot(path=str(ROOT/('hacksaw-launch-'+card['providerKey']+'.png')))
    print(json.dumps({'name':card['name'],'launcherObserved':True,'count':len(rows)}),flush=True)
    (ROOT/'hacksaw-discovered.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    if len(rows)>=20:break
   except Exception as e:errors.append({'name':card['name'],'error':str(e)[:200]});print(json.dumps(errors[-1]),flush=True)
  await b.close()
 (ROOT/'hacksaw-failures.json').write_text(json.dumps(errors,indent=2)+'\n')
asyncio.run(main())
