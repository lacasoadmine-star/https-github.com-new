// Installed in the existing slot worker, beside its current service and ledger.
// All verification is read-only or pure arithmetic; no test accounts or credits.
// The private account state applies the same maximum-payout bound used by the
// existing pre-RNG guard. This is an availability hint; settlement rechecks the
// locked house balance and remains authoritative.
function referenceAvailableGame(game, reserveMinor) {
  const reserve = BigInt(reserveMinor);
  if (reserve < 0n || !Number.isSafeInteger(game.maxWinMultiplier) || game.maxWinMultiplier <= 0 || !Array.isArray(game.betLevels))
    throw Error('INVALID_GAME_CAPACITY');
  const maximum = BigInt(game.maxWinMultiplier);
  const betLevels = game.betLevels.filter(level => {
    if (typeof level !== 'string' || !/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(level)) throw Error('INVALID_GAME_CAPACITY');
    const stake = BigInt(level.replace('.', ''));
    return stake > 0n && stake * maximum <= reserve;
  });
  return { ...game, betLevels, wagerAvailability: betLevels.length ? 'available' : 'house_capacity' };
}

function referenceReceiptVerification(receipt) {
  const checks = [];
  const check = (name, fn) => {
    try { if (fn() !== true) throw Error('ASSERTION_FAILED'); checks.push({name, passed:true}); }
    catch { checks.push({name, passed:false}); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };
  check('paid_round_conserves_minor_units',()=>receipt(100000n,2500n,5000n,102500n).balanceAfter==='1025.00');
  check('losing_round_charges_once',()=>receipt(100000n,2500n,0n,97500n).netChange==='-25.00');
  check('free_round_charges_zero',()=>receipt(100000n,0n,150n,100150n).chargedStake==='0.00');
  check('zero_win_is_exact',()=>receipt(10n,10n,0n,0n).finalWin==='0.00');
  check('large_balances_preserve_precision',()=>receipt(9007199254740993n,1n,2n,9007199254740994n).balanceAfter==='90071992547409.94');
  check('mismatched_balance_is_rejected',()=>rejects(()=>receipt(100n,10n,20n,109n)));
  check('negative_amount_is_rejected',()=>rejects(()=>receipt(100n,-10n,0n,110n)));
  check('unfunded_stake_is_rejected',()=>rejects(()=>receipt(5n,10n,20n,15n)));
  return Object.freeze({status:checks.every(c=>c.passed)?'passed':'failed', checks, databaseWrites:0});
}

function referenceDraftMathVerification() {
  const checks=[];
  const check=(name,fn)=>{try{if(fn()!==true)throw Error();checks.push({name,passed:true});}catch{checks.push({name,passed:false});}};
  const core=fresh74.createFreshSlotCore(previousVersioned,{
    sha256:createHash('sha256').update(fresh74Bytes).digest('hex'), enabled:true,
    uuid:()=> '00000000-0000-4000-8000-000000000001', draw:()=>0,
  });
  const game=core.getGame('fresh_multihot10');
  check('all_74_existing_registrations_retained',()=>core.publicGames().filter(g=>g.freshRegistration).length===74);
  check('uniform_maximum_uses_actual_evaluator',()=>core.spin('fresh_multihot10','0.10').finalWin==='100.00');
  // draw=0 selects the first wheel value (1x), so this fixture is 1000x.
  const maximum=fresh74.createFreshSlotCore(previousVersioned,{
    sha256:createHash('sha256').update(fresh74Bytes).digest('hex'), enabled:true,
    uuid:()=> '00000000-0000-4000-8000-000000000002', draw:bound=>bound===5?2:0,
  });
  check('declared_5000x_bound_matches_evaluator',()=>maximum.spin('fresh_multihot10','0.10').finalWin==='500.00');
  check('maximum_stake_is_exact',()=>maximum.spin('fresh_multihot10','200.00').finalWin==='1000000.00');
  check('pending_machine_rejects_spin',()=>{try{core.spin('fresh_popx','0.10');return false;}catch(e){return e.message==='FRESH_MACHINE_NOT_BUILT';}});
  const symbols=game.symbols.length, columns=game.reels;
  if(symbols!==8||columns!==5||game.paylines!==10||!game.wheel.weights.every(w=>w===1))throw Error('UNSUPPORTED_REFERENCE_PROOF_MODEL');
  let numerator=0n;
  for(const pay of Object.values(game.paytable)) {
    numerator+=BigInt(pay[3]) * BigInt(symbols*(symbols-1));
    numerator+=BigInt(pay[4]) * BigInt(symbols-1);
    numerator+=BigInt(pay[5]);
  }
  numerator*=BigInt(game.wheel.values.reduce((sum,v)=>sum+v,0));
  let denominator=BigInt(symbols)**BigInt(columns)*BigInt(game.wheel.values.length);
  const gcd=(a,b)=>b?gcd(b,a%b):a, divisor=gcd(numerator,denominator);
  numerator/=divisor;denominator/=divisor;
  check('exact_expected_return',()=>numerator===4065n&&denominator===4096n);
  check('line_bet_has_no_fractional_minor_units',()=>game.betLevels.every(v=>cents(v)%BigInt(game.paylines)===0n));
  return Object.freeze({status:checks.every(c=>c.passed)?'passed':'failed',checks,databaseWrites:0,
    gameId:'fresh_multihot10',model:'independent-uniform-symbols-and-multiplier',
    expectedReturn:{numerator:String(numerator),denominator:String(denominator),percent:Number(numerator)*100/Number(denominator)},
    providerRtpReproduced:false, moneyUnit:'ETB minor units', activationChanged:false});
}

const referenceMathProof=referenceDraftMathVerification();
const referenceJson=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
}});

async function referenceRequireAdmin(request) {
  const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!raw)throw Object.assign(Error('ADMIN_LOGIN_REQUIRED'),{status:401});
  const result=await service.pool.query(
    'SELECT u.role,u.status FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id WHERE s.token=ANY($1::text[]) AND s.expires>$2',
    [[raw,hash(raw)],Date.now()]
  );
  if(result.rowCount!==1||result.rows[0].status!=='active')throw Object.assign(Error('ADMIN_LOGIN_REQUIRED'),{status:401});
  if(result.rows[0].role!=='admin')throw Object.assign(Error('ADMIN_ROLE_REQUIRED'),{status:403});
}

async function referenceReadOnlyLedgerAudit() {
  const client=await service.pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout='5s'");
    const transfers=await client.query(`WITH recent AS (
      SELECT id,sender,recipient,amount FROM sw_rebuild.transfers ORDER BY created_at DESC LIMIT 500
    ), entries AS (
      SELECT r.id,r.amount,r.sender,r.recipient,count(l.wallet_id)::int AS entries,
        COALESCE(sum(l.delta),0) AS net,
        COALESCE(sum(CASE WHEN l.wallet_id=r.sender THEN l.delta ELSE 0 END),0) AS debit,
        COALESCE(sum(CASE WHEN l.wallet_id=r.recipient THEN l.delta ELSE 0 END),0) AS credit
      FROM recent r LEFT JOIN sw_rebuild.ledger l ON l.transfer_id=r.id
      GROUP BY r.id,r.amount,r.sender,r.recipient
    ) SELECT count(*)::int AS checked,
      count(*) FILTER(WHERE entries<>2 OR net<>0 OR debit<>-amount OR credit<>amount OR amount<=0 OR sender=recipient)::int AS mismatches
      FROM entries`);
    const rounds=await client.query(`WITH recent AS (
      SELECT round_id,user_id,bet,total_win,result_json FROM sw_nine.game_rounds ORDER BY created_at DESC LIMIT 500
    ) SELECT count(*)::int AS checked,
      count(*) FILTER(WHERE (r.bet>0 AND (b.id IS NULL OR b.amount<>r.bet))
       OR (r.total_win>0 AND (w.id IS NULL OR w.amount<>r.total_win))
       OR (r.total_win=0 AND w.id IS NOT NULL))::int AS mismatches
      FROM recent r LEFT JOIN sw_nine.wallet_transactions b ON b.round_id=r.round_id AND b.type='BET'
      LEFT JOIN sw_nine.wallet_transactions w ON w.round_id=r.round_id AND w.type='WIN'`);
    await client.query('ROLLBACK');
    return {readOnly:true,databaseWrites:0,scope:'Most recent 500 transfers and 500 slot rounds',
      transfers:transfers.rows[0],rounds:rounds.rows[0],
      receiptVerification:service.referenceReceiptCheck,mathVerification:referenceMathProof,
      ready:transfers.rows[0].mismatches===0&&rounds.rows[0].mismatches===0&&service.referenceReceiptCheck.status==='passed'&&referenceMathProof.status==='passed'};
  } catch(error) { await client.query('ROLLBACK').catch(()=>{});throw error; }
  finally {client.release();}
}

async function referenceFinancialReadiness(request) {
  await referenceRequireAdmin(request);
  return referenceReadOnlyLedgerAudit();
}

const referenceStartupAudit=await referenceReadOnlyLedgerAudit().catch(error=>({
  ready:false,readOnly:true,databaseWrites:0,status:'unavailable',code:typeof error.code==='string'?error.code:'READONLY_CHECK_UNAVAILABLE'
}));

const retainedReferenceFetch=service.fetch;
service.fetch=async request=>{
  const path=new URL(request.url).pathname.replace(/^\/api\/slots/,'/api');
  if(!path.startsWith('/api/references/'))return retainedReferenceFetch(request);
  if(request.method!=='GET')return referenceJson({detail:'METHOD_NOT_ALLOWED'},405);
  try {
    if(path==='/api/references/catalog')return referenceJson({
      version:'smartsoft-fresh-reference-20261111-v1',source:REFERENCE_CATALOGUE.source_url,
      capturedAt:REFERENCE_CATALOGUE.retrieved_at,gameCount:REFERENCE_CATALOGUE.games.length,
      games:publicGames().filter(g=>g.freshRegistration).map(g=>({
        id:g.id,name:g.name,buildStatus:g.buildStatus,enabled:g.enabled===true||g.freshReleaseReady===true,
        reference:REFERENCE_CATALOGUE.games.find(r=>r.official_url===g.observedSource)||null,
        providerRtpReproduced:g.providerRtpReproduced===true
      }))});
    if(path==='/api/references/verification')return referenceJson({
      status:service.referenceReceiptCheck.status==='passed'&&referenceMathProof.status==='passed'?'passed':'failed',
      runtime:'existing-superwin-nine-slot-engine',existingWallet:'sw_rebuild.wallets',existingLedger:'sw_rebuild.ledger',
      verificationLocation:'existing Railway staging worker',databaseWrites:0,
      receiptVerification:service.referenceReceiptCheck,mathVerification:referenceMathProof,
      ledgerVerification:{ready:referenceStartupAudit.ready,readOnly:true,databaseWrites:0,
        scope:referenceStartupAudit.scope||null,status:referenceStartupAudit.status||'checked'},
      catalogueCount:REFERENCE_CATALOGUE.games.length,independentOfLegacyReadiness:true
    });
    if(path==='/api/references/financial-readiness')return referenceJson(await referenceFinancialReadiness(request));
    return referenceJson({detail:'NOT_FOUND'},404);
  }catch(error){return referenceJson({detail:error.status?error.message:'REFERENCE_CHECK_UNAVAILABLE'},error.status||503);}
};
console.info(JSON.stringify({event:'smartsoft_reference_integration_ready',catalogueCount:REFERENCE_CATALOGUE.games.length,
 receiptChecks:service.referenceReceiptCheck.status,mathChecks:referenceMathProof.status,databaseWrites:0}));
