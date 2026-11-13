// Local, disposable browser checks. Never calls a production or provider endpoint.
// Catalogue cases exercise shared round handling, not completed game engines.
export async function runBrowserChecks({gameIds, log}) {
  const prefix = 'zplay-disposable-round-check-' + crypto.randomUUID();
  const opened = [];
  let passed = 0, failed = 0;
  const check = (condition, message) => {if (!condition) throw new Error(message);};
  const journal = accountId => {
    const j = createRoundJournal({accountId, indexedDB, databaseName: prefix});
    opened.push(j); return j;
  };
  async function test(name, fn) {
    try {await fn(); passed++; log('PASS', name);}
    catch (error) {failed++; log('FAIL', name + ': ' + error.message);}
  }
  await test('IndexedDB persists only the request identity across connections', async () => {
    const a = journal('storage-fixture');
    await a.claim({gameId: 'fixture', roundId: 'saved', betMinor: 100, balanceMinor: 9999, token: 'not-to-be-stored'});
    await a.close();
    const b = journal('storage-fixture'), value = await b.load();
    check(JSON.stringify(Object.keys(value).sort()) === JSON.stringify(['betMinor','gameId','roundId']), 'Unexpected stored fields');
    check(value.roundId === 'saved', 'Reload lost the unresolved round'); await b.release('saved');
  });
  await test('Concurrent connections permit only one claim for the account', async () => {
    const a = journal('race-fixture'), b = journal('race-fixture');
    const attempts = await Promise.allSettled([
      a.claim({gameId:'a',roundId:'race-a',betMinor:100}),
      b.claim({gameId:'b',roundId:'race-b',betMinor:200})
    ]);
    check(attempts.filter(x => x.status === 'fulfilled').length === 1, 'Concurrent wager intents were both accepted');
    const saved = await a.load(); await b.release(saved.roundId);
  });
  await test('Accounts stay isolated and mismatched release cannot erase an intent', async () => {
    const a = journal('identity-a'), b = journal('identity-b');
    await a.claim({gameId:'a',roundId:'identity-a',betMinor:100});
    await b.claim({gameId:'b',roundId:'identity-b',betMinor:200});
    const wrong = await Promise.allSettled([a.release('identity-b')]);
    check(wrong[0].status === 'rejected', 'Wrong identity release succeeded');
    check((await a.load()).roundId === 'identity-a', 'Wrong identity erased the pending request');
    await a.release('identity-a'); await b.release('identity-b');
  });
  await test(`${gameIds.length} catalogue identities restore an uncertain round without another wager`, async () => {
    for (const [index, gameId] of gameIds.entries()) {
      const aJournal = journal('catalogue-' + index);
      let wagers = 0, recoveries = 0;
      const options = {
        gameId, journal: aJournal, nextToken: () => 'round-' + index,
        startRound: async () => {wagers++; throw new Error('Simulated lost response');},
        recoverRound: async pending => {recoveries++; return {...pending, grid:[['fixture']], balanceMinor:900};},
        validateResult: value => value,
        present: () => ({finished:Promise.resolve({cancelled:false}), stop(){}, cancel(){}})
      };
      const first = new RoundController(options); await first.initialize(); await first.spin(100); first.dispose();
      const second = new RoundController({...options, journal:journal('catalogue-' + index)});
      await second.initialize(); check(second.state === 'uncertain', gameId + ' did not restore');
      await second.recover(); check(wagers === 1 && recoveries === 1 && second.state === 'idle', gameId + ' replayed a wager');
      check(await aJournal.load() === null, gameId + ' left a completed intent'); second.dispose();
    }
  });
  await test('Real Canvas clips reel sprites and caps DPR at 360, 390 and 430 px', async () => {
    const texture = document.createElement('canvas'); texture.width = 20; texture.height = 10;
    const t = texture.getContext('2d'); t.fillStyle='#ff0000'; t.fillRect(0,0,10,10); t.fillStyle='#00ff00'; t.fillRect(10,0,10,10);
    for (const width of [360,390,430]) {
      const canvas = document.createElement('canvas');
      const painter = createReelPainter({canvas,columns:2,rows:2,atlas:{a:{image:texture,x:0,y:0,width:10,height:10},b:{image:texture,x:10,y:0,width:10,height:10}}});
      painter.resize(width,400,4);
      painter.render({reels:[{column:0,result:['a','b'],settled:true},{column:1,result:['b','a'],settled:true}]});
      check(canvas.width === width * 2, 'DPR cap failed');
      const ctx = canvas.getContext('2d');
      check(ctx.getImageData(10,10,1,1).data[0] === 255, 'First reel mismatch');
      check(ctx.getImageData(width+10,10,1,1).data[1] === 255, 'Second reel mismatch');
      painter.dispose(); check(ctx.getImageData(10,10,1,1).data[3] === 0, 'Dispose did not clear the view');
    }
  });
  for (const item of opened) await item.close();
  await new Promise((resolve,reject) => {
    const request = indexedDB.deleteDatabase(prefix);
    request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Disposable test database cleanup blocked'));
  });
  return {passed,failed,catalogueIdentities:gameIds.length,completedGameEngines:0};
}
