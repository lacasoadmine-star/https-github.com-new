#!/usr/bin/env node
// Native fetch, reload, localStorage and Web Locks with an intercepted test-only
// ledger. This is not a PostgreSQL, production account or real wallet test.
const { chromium } = require('playwright');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const origin = 'https://recovery-qa.zplay.invalid';
const gameId = 'new72_browser_recovery_fixture';
const guard = 'a'.repeat(64), modelHash = 'c'.repeat(64);
const money = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const bounded = async promise => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error('TEST_BARRIER_TIMEOUT')), 10000);
  })]); } finally { clearTimeout(timer); }
};

(async () => {
  const sharedRoot = resolve(__dirname, '..');
  const output = resolve(process.env.ZPLAY_RECOVERY_QA_OUTPUT || resolve(__dirname, 'browser-results'));
  await mkdir(output, { recursive: true });
  const report = { success: false, startedAt: new Date().toISOString(), checks: [], scenarios: [],
    pageErrors: [], forbiddenRequests: [], sourceHashes: {}, testOnly: true,
    realMoneyActions: 0, productionEndpointsUsed: false };
  const failureProbe = process.env.ZPLAY_RECOVERY_QA_FAILURE_PROBE === 'after-exclusive-lock';
  report.failureProbeRequested = failureProbe;
  const files = {};
  for (const [url, file] of Object.entries({
    '/shared/round-recovery.mjs': 'round-recovery.mjs',
    '/shared/qa/browser-fixture.mjs': 'qa/browser-fixture.mjs',
  })) {
    const bytes = await readFile(resolve(sharedRoot, file));
    files[url] = bytes.toString('utf8');
    report.sourceHashes[file] = createHash('sha256').update(bytes).digest('hex');
  }
  report.sourceHashes['qa/run-recovery-browser.cjs'] = createHash('sha256')
    .update(await readFile(__filename)).digest('hex');
  const check = (name, condition, observed) => {
    report.checks.push({ name, passed: Boolean(condition), observed });
    if (!condition) throw Error(name);
  };
  let browser;

  async function scenario(name, behavior, run) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const record = { name, calls: [], accepted: [], debitCount: 0, creditCount: 0,
      abortedRequests: [], settledBalance: '100.00' };
    report.scenarios.push(record);
    const stored = new Map();
    let balance = 10000n;
    const reply = (route, status, body, headers = {}) => route.fulfill({ status,
      contentType: 'application/json', headers, body: JSON.stringify(body) });
    await context.route('**/*', async route => {
      try {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== origin) {
          report.forbiddenRequests.push(request.url());
          return await route.abort('blockedbyclient');
        }
        if (request.method() === 'GET' && url.pathname === '/fixture/' && !url.search) {
          return await route.fulfill({ status: 200, contentType: 'text/html', body:
            '<!doctype html><html><head><title>Isolated recovery QA</title></head><body><h1>Synthetic recovery fixture</h1><script type="module" src="/shared/qa/browser-fixture.mjs"></script></body></html>' });
        }
        if (request.method() === 'GET' && Object.hasOwn(files, url.pathname) && !url.search) {
          return await route.fulfill({ status: 200, contentType: 'text/javascript', body: files[url.pathname] });
        }
        if (request.method() === 'GET' && url.pathname === '/api/slots/fresh-state' &&
          url.searchParams.get('gameId') === gameId && [...url.searchParams].length === 1) {
          record.calls.push({ kind: 'state', at: Date.now() });
          return await reply(route, 200, { authenticated: true, currency: 'ETB', sessionGuard: guard,
            balance: money(balance), blockedByActiveGame: null, game: { id: gameId,
              enabled: true, freshReleaseReady: true, betLevels: ['1.00'], availableBetLevels: ['1.00'],
              mathVersion: 'browser-fixture-rules-1', engineVersion: 'browser-fixture-engine-1', mathSha256: modelHash } });
        }
        if (request.method() !== 'POST' || url.pathname !== '/api/slots/spin' || url.search) {
          report.forbiddenRequests.push(request.method() + ' ' + request.url());
          return await route.abort('blockedbyclient');
        }
        const action = request.postDataJSON();
        if (action.gameId !== gameId || action.sessionGuard !== guard || action.bet !== '1.00' ||
          action.mathSha256 !== modelHash || action.mathVersion !== 'browser-fixture-rules-1' ||
          action.engineVersion !== 'browser-fixture-engine-1') throw Error('UNEXPECTED_TEST_ACTION');
        const entry = { kind: action.replayOnly ? 'replay' : 'spin', token: action.roundToken,
          at: Date.now(), action: structuredClone(action) };
        record.calls.push(entry);
        if (await behavior?.before?.({ route, action, record, reply })) return;
        let receipt = stored.get(action.roundToken);
        if (!receipt && action.replayOnly) return await reply(route, 404, { code: 'ROUND_NOT_FOUND_FOR_REPLAY' });
        if (!receipt) {
          // Atomic only in this in-memory fixture: no await occurs across its
          // lookup/debit/credit/save. It does not stand in for SQL lock tests.
          const before = balance, stake = 100n, win = 200n;
          balance = before - stake + win;
          record.debitCount++; record.creditCount++;
          receipt = { gameId, bet: '1.00', currency: 'ETB', roundId: randomUUID(), roundToken: action.roundToken,
            isFree: false, finalWin: '2.00', mathVersion: action.mathVersion, engineVersion: action.engineVersion,
            mathSha256: modelHash, testOnly: true, fixtureOutcome: 'known-test-result', walletReceipt: {
              currency: 'ETB', chargedStake: '1.00', finalWin: '2.00', balanceBefore: money(before), balanceAfter: money(balance) } };
          stored.set(action.roundToken, receipt);
          record.accepted.push({ token: action.roundToken, roundId: receipt.roundId });
          record.settledBalance = money(balance);
        }
        if (await behavior?.after?.({ route, action, record, receipt, reply })) return;
        await reply(route, 200, receipt);
      } catch (error) {
        report.pageErrors.push('route: ' + error.message);
        await route.abort('failed').catch(() => {});
      }
    });
    const open = async () => {
      const page = await context.newPage();
      page.on('pageerror', error => report.pageErrors.push(name + ': ' + error.message));
      page.on('requestfailed', request => record.abortedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
      await page.goto(origin + '/fixture/');
      await page.evaluate(() => globalThis.recoveryQaReady);
      return page;
    };
    const call = (page, method, value) => page.evaluate(([method, value]) => recoveryQa.call(method, value), [method, value]);
    const snap = page => page.evaluate(() => ({ ...recoveryQa.snapshot, generatedTokens: recoveryQa.generatedTokens }));
    try { await run({ open, call, snap, record, context }); }
    finally { await context.close(); }
  }

  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.ZPLAY_QA_CHROMIUM ? { executablePath: process.env.ZPLAY_QA_CHROMIUM } : {}) });
    report.browserVersion = browser.version();
    const entered = defer(), release = defer();
    await scenario('native-cross-tab-exclusive-lock', { before: async ({ action }) => {
      if (!action.replayOnly) { entered.resolve(); await bounded(release.promise); }
      return false;
    } }, async ({ open, call, record }) => {
      const first = await open(), second = await open();
      check('native Web Locks available', await first.evaluate(() => isSecureContext && typeof navigator.locks?.query === 'function'));
      const pending = call(first, 'spin', '1.00').catch(error => ({ ok: false, runnerError: error.message }));
      try {
        await bounded(entered.promise);
        const locks = await second.evaluate(() => navigator.locks.query());
        check('first tab holds exclusive native lock', locks.held.length === 1 && locks.held[0].mode === 'exclusive', locks);
        // Deliberate negative QA path: it must fail and still drain the held
        // evaluation, close context/browser and write its failure artifact.
        if (failureProbe) throw Error('INTENTIONAL_CLEANUP_PROBE');
        const collision = await call(second, 'spin', '1.00');
        check('overlapping second tab rejected without token', !collision.ok && collision.error.code === 'ROUND_BUSY' && collision.generatedTokens === 0, collision.error);
        release.resolve();
        const settled = await pending;
        check('cross-tab overlap submits and settles once', settled.ok && record.debitCount === 1 && record.creditCount === 1 && record.calls.filter(x => x.kind === 'spin').length === 1, record.accepted);
        check('settled round blocks next spin and AUTO until fresh balance', settled.snapshot.phase === 'SETTLED' && !settled.snapshot.canSpin && !settled.snapshot.canAuto && !settled.snapshot.balanceFresh);
        const refreshed = await call(first, 'refresh');
        check('authoritative refresh enables next round', refreshed.ok && refreshed.snapshot.canSpin && refreshed.snapshot.account.balance === '101.00');
      } finally { release.resolve(); await pending; record.heldEvaluationDrained = true; }
    });

    let lostAccepted = false;
    await scenario('accepted-response-lost-and-reload', { after: async ({ route, action }) => {
      if (!action.replayOnly && !lostAccepted) { lostAccepted = true; await route.abort('failed'); return true; }
      return false;
    } }, async ({ open, call, snap, record }) => {
      const page = await open();
      const lost = await call(page, 'spin', '1.00');
      check('accepted response loss retains pending identity', !lost.ok && lost.error.code === 'NETWORK_UNAVAILABLE' && lost.snapshot.phase === 'PENDING' && record.debitCount === 1);
      const original = lost.snapshot.pending;
      const blocked = await call(page, 'spin', '1.00');
      check('unresolved response blocks new spin and AUTO', !blocked.ok && blocked.error.code === 'ROUND_NOT_READY' && !blocked.snapshot.canAuto && record.debitCount === 1);
      await page.reload(); await page.evaluate(() => globalThis.recoveryQaReady);
      const resumed = await snap(page);
      check('real reload recovers stored request without new token', resumed.phase === 'PENDING' && resumed.pending.roundToken === original.roundToken && resumed.generatedTokens === 0);
      const recovered = await call(page, 'recover');
      const posts = record.calls.filter(x => x.kind !== 'state');
      check('status-first replay returns same accepted round', recovered.ok && recovered.result.roundId === record.accepted[0].roundId && posts.length === 2 && posts[1].kind === 'replay' && posts.every(x => x.token === original.roundToken), posts);
      check('accepted recovery has one fixture debit and credit', record.debitCount === 1 && record.creditCount === 1 && record.settledBalance === '101.00');
      const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('zplay.new72.pending.')));
      check('accepted request journal cleared only after verified receipt', keys.length === 0 && recovered.snapshot.phase === 'SETTLED');
    });

    let lostUnaccepted = false;
    await scenario('unaccepted-request-lost-same-key-retry', { before: async ({ route, action }) => {
      if (!action.replayOnly && !lostUnaccepted) { lostUnaccepted = true; await route.abort('failed'); return true; }
      return false;
    } }, async ({ open, call, record }) => {
      const page = await open(), lost = await call(page, 'spin', '1.00');
      check('request lost before acceptance has no fixture debit', !lost.ok && lost.snapshot.phase === 'PENDING' && record.debitCount === 0);
      const start = record.calls.length;
      const recovered = await call(page, 'recover');
      const sequence = record.calls.slice(start).map(x => x.kind);
      const posts = record.calls.filter(x => x.kind === 'spin');
      check('explicit miss precedes state check and same-key resend', recovered.ok && sequence.join(',') === 'replay,state,spin' && JSON.stringify(posts[0].action) === JSON.stringify(posts[1].action), sequence);
      check('same-key retry accepts once with one generated token', record.debitCount === 1 && record.creditCount === 1 && recovered.generatedTokens === 1 && record.accepted.length === 1);
    });

    let lostLimited = false, limited = false;
    await scenario('cross-tab-persisted-retry-after', {
      before: async ({ route, action, reply, record }) => {
        if (action.replayOnly && !limited) {
          limited = true;
          const issuedAt = Date.now();
          record.rateLimit = { issuedAt, notBefore: issuedAt + 2000, seconds: 2, earlyReplays: 0 };
          await reply(route, 429, { code: 'RATE_LIMITED' }, { 'Retry-After': '2' });
          return true;
        }
        if (action.replayOnly && record.rateLimit && Date.now() < record.rateLimit.notBefore) {
          record.rateLimit.earlyReplays++;
          await reply(route, 429, { code: 'RATE_LIMITED' }, {
            'Retry-After': String(Math.ceil((record.rateLimit.notBefore - Date.now()) / 1000)),
          });
          return true;
        }
        return false;
      },
      after: async ({ route, action }) => {
        if (!action.replayOnly && !lostLimited) { lostLimited = true; await route.abort('failed'); return true; }
        return false;
      },
    }, async ({ open, call, record }) => {
      const first = await open(); await call(first, 'spin', '1.00');
      const second = await open();
      const deferred = await call(first, 'recover');
      const count = record.calls.length;
      const blocked = await call(second, 'recover');
      check('429 persists full server retry deadline', !deferred.ok && deferred.error.code === 'RETRY_DEFERRED' && deferred.snapshot.retryAt >= record.rateLimit.notBefore, record.rateLimit);
      check('other connected tab honors new deadline without request', !blocked.ok && blocked.error.code === 'RETRY_DEFERRED' && record.calls.length === count && blocked.snapshot.retryAt === deferred.snapshot.retryAt);
      const wait = Math.max(0, deferred.snapshot.retryAt - Date.now() + 25);
      if (wait > 3000) throw Error('UNBOUNDED_TEST_WAIT');
      await new Promise(resolve => setTimeout(resolve, wait));
      const recovered = await call(second, 'recover');
      const replays = record.calls.filter(x => x.kind === 'replay');
      check('retry after deadline uses same key without another debit', recovered.ok && replays.length === 2 && replays[1].at >= deferred.snapshot.retryAt && replays[1].at >= record.rateLimit.notBefore && record.rateLimit.earlyReplays === 0 && new Set(replays.map(x => x.token)).size === 1 && record.debitCount === 1 && record.creditCount === 1, replays);
    });
    check('no unexpected browser exceptions', report.pageErrors.length === 0, report.pageErrors);
    check('all requests confined to intercepted test origin', report.forbiddenRequests.length === 0, report.forbiddenRequests);
    report.success = true;
  } catch (error) { report.failure = { name: error.name, message: error.message }; }
  finally {
    if (browser) await browser.close();
    report.browserClosed = Boolean(browser);
    report.finishedAt = new Date().toISOString();
    report.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sharedRoot, encoding: 'utf8' }).trim();
    report.hasUncommittedSource = execFileSync('git', ['status', '--porcelain', '--', '.'], { cwd: sharedRoot, encoding: 'utf8' }).trim().length > 0;
    report.limitations = ['In-memory fixture ledger; not SQL locking or production settlement proof',
      'Injected shared localStorage metadata and native Web Locks; production default sessionStorage is unchanged',
      'No new game registration, model, activation, authentication bypass or real wager',
      'No provider gameplay, audio, video, BFCache or performance parity claim'];
    await writeFile(resolve(output, 'recovery-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ success: report.success, passed: report.checks.filter(x => x.passed).length,
      checks: report.checks.length, failure: report.failure ?? null, sourceCommit: report.sourceCommit }) + '\n');
    if (!report.success) process.exitCode = 1;
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
