const encoder = new TextEncoder();
const PREFIX = '/independent74';
const ACCOUNT_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', vary: 'Cookie', 'x-content-type-options': 'nosniff' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class GatewayError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const reject = (status, code, message) => { throw new GatewayError(status, code, message); };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: ACCOUNT_HEADERS });
const hex = bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
export async function hash(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export async function csrfGuard(token) { return hash('independent74-session-v1:' + token); }

async function readBody(stream, limit) {
  if (!stream) return '';
  const reader = stream.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); reject(413, 'BODY_TOO_LARGE', 'Request exceeds the size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { reject(400, 'INVALID_ENCODING', 'UTF-8 is required.'); }
}

function parse(text) {
  try { return JSON.parse(text); }
  catch { reject(400, 'INVALID_JSON', 'A JSON request is required.'); }
}

function sessionToken(request) {
  const matches = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith('sw_session='));
  if (matches.length !== 1) reject(401, 'SIGN_IN_REQUIRED', 'Sign in to your player account.');
  const token = matches[0].slice('sw_session='.length);
  if (!token || token.length > 4096) reject(401, 'SIGN_IN_REQUIRED', 'Sign in to your player account.');
  return token;
}

async function constantEqual(left, right) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(right), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(right));
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(left));
}

function validateAction(input, ids) {
  if (!input || Array.isArray(input) || typeof input !== 'object') reject(400, 'INVALID_ACTION', 'Invalid action.');
  if (!UUID.test(input.request_id) || !ids.has(input.game_id)) reject(400, 'INVALID_ACTION', 'Invalid request or game identity.');
  const allowed = new Set(['request_id', 'game_id', 'type', 'options']);
  if (input.type === 'play') allowed.add('stake_minor');
  else if (['reveal', 'collect'].includes(input.type)) {
    allowed.add('round_id'); allowed.add('expected_version');
    if (!UUID.test(input.round_id) || !Number.isSafeInteger(input.expected_version) || input.expected_version < 0) reject(400, 'INVALID_ROUND', 'A current round version is required.');
  } else reject(400, 'INVALID_ACTION', 'Unsupported action.');
  if (Object.keys(input).some(key => !allowed.has(key))) reject(400, 'INVALID_ACTION', 'Unsupported action fields.');
  if (input.type === 'play' && (typeof input.stake_minor !== 'string' || !/^[1-9][0-9]{0,18}$/.test(input.stake_minor) || BigInt(input.stake_minor) > 9223372036854775807n)) reject(400, 'INVALID_STAKE', 'Stake must be a positive minor-unit integer within ledger storage.');
  if (input.options !== undefined) {
    if (!input.options || Array.isArray(input.options) || typeof input.options !== 'object') reject(400, 'INVALID_OPTIONS', 'Invalid options.');
    const options = new Set(['cell', 'target', 'targetBps', 'risk', 'rows', 'choice', 'steps', 'mode', 'number', 'numbers', 'mineCount']);
    if (Object.keys(input.options).some(key => !options.has(key))) reject(400, 'INVALID_OPTIONS', 'Unsupported game option.');
    for (const [key, value] of Object.entries(input.options)) {
      if (['cell', 'target', 'targetBps', 'rows', 'steps', 'number', 'mineCount'].includes(key) && (!Number.isSafeInteger(value) || value < 0 || value > 100000000)) reject(400, 'INVALID_OPTIONS', 'Invalid numeric game option.');
      if (key === 'numbers' && (!Array.isArray(value) || value.length < 1 || value.length > 5 || new Set(value).size !== value.length || value.some(n => !Number.isInteger(n) || n < 1 || n > 40))) reject(400, 'INVALID_OPTIONS', 'Choose one to five distinct numbers from 1 to 40.');
      if (['risk', 'choice', 'mode'].includes(key) && (typeof value !== 'string' || !/^[a-z0-9_-]{1,24}$/i.test(value))) reject(400, 'INVALID_OPTIONS', 'Invalid game option.');
    }
  }
  return input;
}

function carryIdentity(response, identity) {
  const marker = identity.headers.get('x-zplay-session');
  if (marker) response.headers.set('x-zplay-session', marker);
  const cookies = identity.headers.getSetCookie?.() || [];
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

export function validateNativeAction(input, ids) {
  if (!input || Array.isArray(input) || typeof input !== 'object' || !UUID.test(input.request_id) || !ids.has(input.game_id) ||
      typeof input.model_version !== 'string' || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(input.model_version)) reject(400,'INVALID_ACTION','Invalid request, model or game identity.');
  const allowed=new Set(['request_id','game_id','model_version','type']);
  if(input.type==='start'){
    allowed.add('stake');allowed.add('options');
    // Match the retained LibraryService decimal transport. This is a storage
    // boundary; account/game limits and funded liability belong to the server.
    if(typeof input.stake!=='string'||!/^(?:0|[1-9][0-9]{0,10})\.[0-9]{2}$/.test(input.stake))reject(400,'INVALID_STAKE','An exact ETB amount is required.');
    const minor=BigInt(input.stake.replace('.',''));
    if(minor<100n||minor%100n!==0n)reject(400,'INVALID_STAKE','Choose a positive whole-ETB stake within the server account and game limits.');
    const options=input.options??{};
    const plinkoX=input.game_id==='ind74_official_plinkox',destinyWheel=input.game_id==='ind74_official_wheelofdestiny',gatesMerlyn=input.game_id==='ind74_official_gatesofmerlyn';
    const genieBonanza=input.game_id==='ind74_official_geniesbonanza',coinsAtlantis=input.game_id==='ind74_official_coinsofatlantis',mariachi=input.game_id==='ind74_official_mariachicoins';
    const chargingFruits=input.game_id==='ind74_official_multifruitschargingwilds',chargingGems=input.game_id==='ind74_official_gemscrownchargingwilds';
    const optionKeys=plinkoX?['risk','ballAmount']:destinyWheel?['bets']:gatesMerlyn||genieBonanza||coinsAtlantis?['mode']:chargingFruits||chargingGems?['ante','holdWin']:mariachi?['holdWin']:['mode','target','holdWin'];
    if(!options||Array.isArray(options)||typeof options!=='object'||Object.keys(options).some(k=>!optionKeys.includes(k)))reject(400,'INVALID_OPTIONS','Unsupported game option.');
    if(plinkoX){
      if(options.risk!==undefined&&!['low','medium','high'].includes(options.risk))reject(400,'INVALID_OPTIONS','Choose a verified risk board.');
      if(options.ballAmount!==undefined&&(!Number.isSafeInteger(options.ballAmount)||![1,5,10,25].includes(options.ballAmount)))reject(400,'INVALID_OPTIONS','Choose a supported ball amount.');
      const count=BigInt(options.ballAmount??1);
      if(minor%(count*100n)!==0n)reject(400,'INVALID_STAKE','The total stake must split into whole-ETB stakes per ball.');
    }
    if(gatesMerlyn||genieBonanza||coinsAtlantis){
      const steps=gatesMerlyn?{base:100n,ante:300n,buy100:10000n,buy500:50000n}:genieBonanza?{base:100n,buy100:10000n}:{base:100n,ante:300n,buy60:6000n},mode=options.mode??'base';
      if(typeof mode!=='string'||!Object.hasOwn(steps,mode))reject(400,'INVALID_OPTIONS','Choose a supported mode for this game.');
      if(minor%steps[mode]!==0n)reject(400,'INVALID_STAKE','The total debit must match the selected base stake and mode cost.');
    }
    if(chargingFruits||chargingGems){
      const ante=options.ante??1,choices=chargingFruits?[1,5,10]:[1];
      if(!choices.includes(ante))reject(400,'INVALID_OPTIONS','Choose a supported Charging Wilds ANTE.');
      if(minor%(100n*BigInt(ante))!==0n)reject(400,'INVALID_STAKE','The total debit must contain an exact whole-ETB base stake for the selected ANTE.');
    }
    if(destinyWheel&&options.bets!==undefined){
      if(!Array.isArray(options.bets)||options.bets.length<1||options.bets.length>9)reject(400,'INVALID_OPTIONS','Choose one to nine distinct wheel fields.');
      const chosen=new Set();let allocated=0n;
      for(const bet of options.bets){
        if(!bet||typeof bet!=='object'||Array.isArray(bet)||Object.keys(bet).length!==2||Object.keys(bet).some(k=>!['symbolIndex','amountMinor'].includes(k))||!Number.isSafeInteger(bet.symbolIndex)||bet.symbolIndex<0||bet.symbolIndex>8||chosen.has(bet.symbolIndex)||typeof bet.amountMinor!=='string'||!/^[1-9][0-9]{0,14}$/.test(bet.amountMinor))reject(400,'INVALID_OPTIONS','Invalid wheel allocation.');
        const amount=BigInt(bet.amountMinor);if(amount<100n||amount%100n!==0n)reject(400,'INVALID_STAKE','Wheel allocations must use whole-ETB stakes.');
        chosen.add(bet.symbolIndex);allocated+=amount;
      }
      if(allocated!==minor)reject(400,'INVALID_STAKE','Wheel allocations must equal the total stake.');
    }
    if(options.mode!==undefined&&(typeof options.mode!=='string'||!/^[a-z0-9_-]{1,24}$/.test(options.mode)))reject(400,'INVALID_OPTIONS','Invalid game mode.');
    if(options.target!==undefined&&(!Number.isSafeInteger(options.target)||options.target<1||options.target>99))reject(400,'INVALID_OPTIONS','Invalid dice target.');
    if(options.holdWin!==undefined&&typeof options.holdWin!=='boolean')reject(400,'INVALID_OPTIONS','Invalid held-win choice.');
  }else if(input.type==='action'){
    for(const key of ['round_id','expected_version','action','input'])allowed.add(key);
    if(!UUID.test(input.round_id)||!Number.isSafeInteger(input.expected_version)||input.expected_version<0||!['reveal','collect','sync','gamble'].includes(input.action))reject(400,'INVALID_ROUND','Invalid round action.');
    const actionInput=input.input??{};
    const actionFields=input.action==='reveal'?['cell']:input.action==='gamble'?['color']:[];
    if(!actionInput||Array.isArray(actionInput)||typeof actionInput!=='object'||Object.keys(actionInput).some(k=>!actionFields.includes(k)))reject(400,'INVALID_OPTIONS','Unsupported action input.');
    if(actionInput.cell!==undefined&&(!Number.isSafeInteger(actionInput.cell)||actionInput.cell<0||actionInput.cell>99))reject(400,'INVALID_OPTIONS','Invalid cell.');
    if(input.action==='gamble'&&!['red','black'].includes(actionInput.color))reject(400,'INVALID_OPTIONS','Choose red or black.');
  }else reject(400,'INVALID_ACTION','Unsupported action.');
  if(Object.keys(input).some(key=>!allowed.has(key)))reject(400,'INVALID_ACTION','Unsupported client authority.');
  return input;
}

function existingNativeOrigin(env){
  let origin;try{origin=new URL(env.NATIVE_ENGINE_ORIGIN);}catch{return null;}
  return origin.protocol==='https:'&&!origin.username&&!origin.password&&origin.pathname==='/'&&!origin.search&&!origin.hash?origin:null;
}

async function runtimeAccountCatalog({env,accountGames,integratedIds,fetchImpl}){
  const origin=existingNativeOrigin(env);
  const fallback={games:accountGames,accountServiceAvailable:false};
  if(!origin)return fallback;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetchImpl(new URL('/v2/independent74/health',origin),{method:'GET',headers:{accept:'application/json'},redirect:'error',signal:controller.signal});
    if(!response.ok){await response.body?.cancel();return fallback;}
    const value=JSON.parse(await readBody(response.body,2*1024*1024));
    if(!Array.isArray(value.games)||value.games.length!==60||new Set(value.games.map(game=>game?.id)).size!==60||value.games.some(game=>!integratedIds.has(game?.id)))return fallback;
    if(value.new_rounds_enabled!==true)return {...fallback,accountServiceAvailable:true};
    const deployed=new Map(value.games.map(game=>[game.id,game]));
    return {accountServiceAvailable:true,games:accountGames.map(game=>{
      const live=deployed.get(game.id);
      if(!live||live.currency!=='ETB'||live.version!==game.version||live.accepting!==true||live.launchable!==true)return game;
      const limits=live.limits;
      if(!limits||!['minBetMinor','maxBetMinor','betStepMinor','maxWinMinor'].every(key=>typeof limits[key]==='string'&&/^[1-9][0-9]{0,14}$/.test(limits[key])))return game;
      if(BigInt(limits.minBetMinor)>BigInt(limits.maxBetMinor)||BigInt(limits.betStepMinor)<100n)return game;
      return {...game,accepting:true,launchable:true,limits:{...game.limits,...limits}};
    })};
  }catch{return fallback;}finally{clearTimeout(timer);}
}

export function createGateway({ previous, assets = {}, games = [], accountGames = [], demoHandler = null, homeEnhancement = false, accountTransport = 'protected-readonly', integratedAccountGameIds = [], fetchImpl = (...args) => fetch(...args) }) {
  if (typeof previous?.fetch !== 'function') throw new Error('Legacy handler required.');
  const ids = new Set(games.map(game => game.id));
  const accountIds = new Set(accountGames.map(game => game.id));
  const integratedIds=new Set(integratedAccountGameIds);
  if(accountTransport==='existing-library60'&&(integratedIds.size!==60||integratedAccountGameIds.length!==60||[...integratedIds].some(id=>!accountIds.has(id))))throw new TypeError('Exactly60 reviewed existing-wallet game identities are required.');
  return async function independent74(request, env, ctx) {
    const url = new URL(request.url), path = url.pathname;
    if(path===PREFIX+'/progress.html')return new Response(null,{status:302,headers:{location:'/', 'cache-control':'no-store'}});
    if (path !== PREFIX && !path.startsWith(PREFIX + '/')) {
      const response=await previous.fetch(request,env,ctx);
      if(!homeEnhancement||path!=='/'||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html')||response.headers.has('content-encoding'))return response;
      const html=await response.text();
      if(html.includes('/independent74/lobby74.mjs'))return new Response(html,response);
      const revision=name=>{const digest=assets[name]?.etag?.match(/[a-f0-9]{64}/)?.[0];return digest?'?v='+digest:'';};
      const body=html.replace('</head>','<link rel="stylesheet" href="/independent74/lobby74.css'+revision('/lobby74.css')+'"></head>').replace('</body>','<script type="module" src="/independent74/lobby74.mjs'+revision('/lobby74.mjs')+'"></script></body>');
      const headers=new Headers(response.headers);headers.delete('etag');headers.delete('content-length');headers.set('cache-control','private, no-store');
      const policy=headers.get('content-security-policy');
      if(policy){
        let next=policy.includes('https://cdn.prod.website-files.com')?policy:policy.replace(/img-src[^;]*/i,value=>value+' https://cdn.prod.website-files.com');
        if(/(?:^|;)\s*frame-src\s/i.test(next))next=next.replace(/frame-src[^;]*/i,value=>value.includes("'self'")?value:value.replace(/\s+'none'(?=\s|$)/g,'')+" 'self'");
        else next+="; frame-src 'self'";
        headers.set('content-security-policy',next);
      }
      return new Response(body,{status:response.status,headers});
    }
    try {
      if (path === PREFIX) return new Response(null, { status: 308, headers: { location: PREFIX + '/', 'cache-control': 'no-store' } });
      if(path.startsWith(PREFIX+'/demo-api/'))return demoHandler?demoHandler(request,env,ctx):json({error:{code:'DEMO_SERVICE_UNAVAILABLE',message:'Free demo is temporarily unavailable.'}},503);
      if (path.startsWith(PREFIX+'/account-api/')) {
        const action=path.slice((PREFIX+'/account-api/').length);
        if(!['catalog','state','action','history'].includes(action))reject(404,'NOT_FOUND','Endpoint not found.');
        if(request.method!==(action==='action'?'POST':'GET'))reject(405,'METHOD_NOT_ALLOWED','Unsupported method.');
        if(action==='catalog'){
          if(url.search)reject(400,'INVALID_QUERY','Unsupported catalog query.');
          const catalog=accountTransport==='existing-library60'?await runtimeAccountCatalog({env,accountGames,integratedIds,fetchImpl}):{games:accountGames,accountServiceAvailable:false};
          return json({edition:'ZPLAY independent operator build',officialProviderMath:false,productionReleaseVerified:false,...catalog});
        }
        if(action==='action'&&(request.headers.get('origin')!==url.origin||!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')))reject(403,'SAME_ORIGIN_REQUIRED','A same-origin JSON request is required.');
        const token=sessionToken(request);
        const identity=await previous.fetch(new Request(new URL('/api/machine-session',url),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
        if(!identity.ok){await identity.body?.cancel();return carryIdentity(json({error:{code:'SIGN_IN_REQUIRED',message:'Sign in to your existing player account.'}},401),identity);}
        let identityData;
        try{identityData=JSON.parse(await readBody(identity.body,16384));}catch{reject(502,'INVALID_ACCOUNT_RESPONSE','Unreadable identity response.');}
        if(identityData?.authenticated!==true)return carryIdentity(json({error:{code:'SIGN_IN_REQUIRED',message:'Sign in to your existing player account.'}},401),identity);
        const existing60=accountTransport==='existing-library60';
        let preparedAction=null;
        if(existing60){
          if(identityData.currency!=='ETB'||typeof identityData.balance!=='string'||!/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(identityData.balance)||!/^[a-f0-9]{64}$/.test(identityData.sessionId||''))reject(502,'INVALID_ACCOUNT_RESPONSE','The existing account balance could not be verified.');
          if(action==='action'){
            if(url.search||!await constantEqual(request.headers.get('x-independent74-session')||'',identityData.sessionId))reject(403,'SESSION_REFRESH_REQUIRED','Refresh account state before playing.');
            preparedAction=validateNativeAction(parse(await readBody(request.body,8192)),accountIds);
          }
        }
        const requestedAccountId=preparedAction?.game_id??url.searchParams.get('game_id');
        if(accountTransport==='protected-readonly'||existing60&&!integratedIds.has(requestedAccountId)){
          // The working protected games already use this exact authenticated
          // session balance. Do not route new machines to a different engine
          // or invent a financial action while their evaluator is uninstalled.
          if(identityData.currency!=='ETB'||typeof identityData.balance!=='string'||!/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(identityData.balance)||!/^[a-f0-9]{64}$/.test(identityData.sessionId||''))reject(502,'INVALID_ACCOUNT_RESPONSE','The existing account balance could not be verified.');
          if(action==='action'){
            if(url.search||!await constantEqual(request.headers.get('x-independent74-session')||'',identityData.sessionId))reject(403,'SESSION_REFRESH_REQUIRED','Refresh account state before playing.');
            if(!preparedAction)validateNativeAction(parse(await readBody(request.body,8192)),accountIds);
            reject(503,'GAME_RELEASE_NOT_READY','This game has not been enabled on the existing wallet.');
          }
          for(const key of url.searchParams.keys())if(key!=='game_id'||url.searchParams.getAll(key).length!==1)reject(400,'INVALID_QUERY','Unsupported query parameter.');
          const gameId=url.searchParams.get('game_id');if(!accountIds.has(gameId))reject(400,'UNKNOWN_GAME','Unknown game.');
          if(action==='history')reject(503,'GAME_HISTORY_NOT_AVAILABLE','This new game has no verified history route on the existing backend.');
          const game=accountGames.find(g=>g.id===gameId);
          return carryIdentity(json({authenticated:true,mode:'account',currency:'ETB',balance:identityData.balance,
            game:{...game,accepting:false,launchable:false},accepting:false,round:null,
            activeRecoveryVerified:false,historyAvailable:false,existingWalletReadOnly:true,
            sessionGuard:identityData.sessionId}),identity);
        }
        if(accountTransport!=='library74'&&!existing60)reject(503,'ACCOUNT_SERVICE_UNAVAILABLE','Unsupported account transport.');
        const guard=existing60?identityData.sessionId:await csrfGuard(token);
        let body='',gameId,backendPath='/v2/independent74/'+action;
        if(action==='action'){
          if(url.search||!await constantEqual(request.headers.get('x-independent74-session')||'',guard))reject(403,'SESSION_REFRESH_REQUIRED','Refresh account state before playing.');
          const input=preparedAction??validateNativeAction(parse(await readBody(request.body,8192)),accountIds);body=JSON.stringify(input);gameId=input.game_id;
        }else{
          for(const key of url.searchParams.keys())if(key!=='game_id'||url.searchParams.getAll(key).length!==1)reject(400,'INVALID_QUERY','Unsupported query parameter.');
          gameId=url.searchParams.get('game_id');if(!accountIds.has(gameId))reject(400,'UNKNOWN_GAME','Unknown game.');backendPath+='?game_id='+encodeURIComponent(gameId);
        }
        if(!env.NATIVE_ENGINE_ORIGIN||!env.NATIVE_ENGINE_SECRET)reject(503,'ACCOUNT_SERVICE_UNAVAILABLE','The existing account service is unavailable.');
        let origin;try{origin=new URL(env.NATIVE_ENGINE_ORIGIN);}catch{reject(503,'ACCOUNT_SERVICE_UNAVAILABLE','Invalid existing account service.');}
        if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)reject(503,'ACCOUNT_SERVICE_UNAVAILABLE','Invalid existing account service.');
        const target=new URL(backendPath,origin),timestamp=String(Date.now()),subject='@session:'+await hash(token);
        const payload=[request.method,target.pathname+target.search,timestamp,subject,await hash(body)].join('\n');
        const key=await crypto.subtle.importKey('raw',encoder.encode(env.NATIVE_ENGINE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
        const signature=hex(await crypto.subtle.sign('HMAC',key,encoder.encode(payload)));
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
        let upstream,result;
        try{
          upstream=await fetchImpl(target,{method:request.method,headers:{accept:'application/json','content-type':'application/json','x-native-user':subject,'x-native-time':timestamp,'x-native-signature':signature},...(body?{body}:{}),redirect:'manual',signal:controller.signal});
          if(upstream.status>=300&&upstream.status<400){await upstream.body?.cancel();reject(502,'INVALID_ACCOUNT_RESPONSE','Unexpected service redirect.');}
          result=JSON.parse(await readBody(upstream.body,2*1024*1024));
          if(!result||Array.isArray(result)||typeof result!=='object')throw Error('INVALID_RESPONSE');
        }catch(error){if(error instanceof GatewayError)throw error;reject(503,action==='action'?'ACTION_UNCONFIRMED':'ACCOUNT_SERVICE_UNAVAILABLE','The existing account service did not confirm this request.');}
        finally{clearTimeout(timeout);}
        // The player session was already verified by the existing site.
        // An unavailable/new engine route must not send a signed-in player
        // through an endless login loop or invent a wallet balance.
        if(upstream.status===401)reject(503,'GAME_ACCOUNT_ROUTE_UNAVAILABLE','The existing account is signed in, but this game account route is not available yet.');
        if(upstream.ok){
          if(result.authenticated!==true||result.currency!=='ETB')reject(502,'INVALID_ACCOUNT_RESPONSE','The account identity and currency could not be verified.');
          if(action==='history'){
            if(result.game_id!==gameId||!Array.isArray(result.history)||result.history.length>100)reject(502,'INVALID_ACCOUNT_RESPONSE','Invalid account history.');
          }else if(result.game?.id!==gameId||!/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(result.balance||'')||typeof result.accepting!=='boolean')reject(502,'INVALID_ACCOUNT_RESPONSE','Invalid account snapshot.');
        }
        return carryIdentity(json(upstream.ok?{...result,sessionGuard:guard}:result,upstream.status),identity);
      }
      if (path === PREFIX + '/api/catalog') {
        if (!['GET', 'HEAD'].includes(request.method)) reject(405, 'METHOD_NOT_ALLOWED', 'GET is required.');
        const response = json({ edition: 'Independent edition', officialProviderMath: false, games });
        return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response;
      }
      if (path.startsWith(PREFIX + '/api/')) {
        const action = path.slice((PREFIX + '/api/').length);
        if (!['state', 'history', 'action'].includes(action)) reject(404, 'NOT_FOUND', 'Endpoint not found.');
        if (request.method !== (action === 'action' ? 'POST' : 'GET')) reject(405, 'METHOD_NOT_ALLOWED', 'Unsupported method.');
        if (action === 'action' && (request.headers.get('origin') !== url.origin || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))) reject(403, 'SAME_ORIGIN_REQUIRED', 'A same-origin JSON request is required.');
        const token = sessionToken(request);
        const identity = await previous.fetch(new Request(new URL('/api/machine-session', url), { headers: { cookie: request.headers.get('cookie'), accept: 'application/json' } }), env, ctx);
        if (!identity.ok) { await identity.body?.cancel(); return carryIdentity(json({ error: { code: 'SIGN_IN_REQUIRED', message: 'Sign in to your existing player account.' }, retryable: false }, 401), identity); }
        let identityData;
        try { identityData = JSON.parse(await readBody(identity.body, 16384)); }
        catch { reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The identity service returned an unreadable response.'); }
        if (!identityData || typeof identityData !== 'object' || Array.isArray(identityData)) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The identity service returned an invalid response.');
        if (identityData.authenticated !== true) return carryIdentity(json({ error: { code: 'SIGN_IN_REQUIRED', message: 'Sign in to your existing player account.' }, retryable: false }, 401), identity);
        const guard = await csrfGuard(token);
        let body = '', backendPath = '/v1/independent74/' + action;
        if (action === 'action') {
          if (url.search || !await constantEqual(request.headers.get('x-independent74-session') || '', guard)) reject(403, 'SESSION_REFRESH_REQUIRED', 'Refresh the account state before playing.');
          body = JSON.stringify(validateAction(parse(await readBody(request.body, 8192)), ids));
        } else {
          for (const key of url.searchParams.keys()) if (key !== 'game_id' || url.searchParams.getAll(key).length !== 1) reject(400, 'INVALID_QUERY', 'Unsupported query parameter.');
          const gameId = url.searchParams.get('game_id');
          if (!ids.has(gameId)) reject(400, 'UNKNOWN_GAME', 'Unknown independent game.');
          backendPath += '?game_id=' + encodeURIComponent(gameId);
        }
        if (!env.NATIVE_ENGINE_ORIGIN || !env.NATIVE_ENGINE_SECRET) reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The existing account service is unavailable.');
        let origin;
        try { origin = new URL(env.NATIVE_ENGINE_ORIGIN); } catch { reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The existing account service is unavailable.'); }
        if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The account service is unavailable.');
        const target = new URL(backendPath, origin), timestamp = String(Date.now()), subject = '@session:' + await hash(token);
        const payload = [request.method, target.pathname + target.search, timestamp, subject, await hash(body)].join('\n');
        const key = await crypto.subtle.importKey('raw', encoder.encode(env.NATIVE_ENGINE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
        let upstream, result;
        try {
          upstream = await fetchImpl(target, { method: request.method, headers: { accept: 'application/json', 'content-type': 'application/json', 'x-native-user': subject, 'x-native-time': timestamp, 'x-native-signature': signature }, ...(body ? { body } : {}), redirect: 'manual', signal: controller.signal });
          if (upstream.status >= 300 && upstream.status < 400) { await upstream.body?.cancel(); reject(502, 'INVALID_ACCOUNT_RESPONSE', 'Unexpected account-service redirect.'); }
          try { result = JSON.parse(await readBody(upstream.body, 2 * 1024 * 1024)); }
          catch { reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account service returned an unreadable response.'); }
          if (!result || typeof result !== 'object' || Array.isArray(result)) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account service returned an invalid response.');
        } catch (error) {
          if (error instanceof GatewayError) throw error;
          reject(503, 'ACTION_UNCONFIRMED', 'The account service did not confirm this action. Refresh the round before retrying.');
        } finally { clearTimeout(timeout); }
        if (upstream.ok && (result.authenticated !== true || result.currency !== 'ETB' || result.game?.id !== (action === 'action' ? JSON.parse(body).game_id : url.searchParams.get('game_id')) || !/^[0-9]+$/.test(result.wallet?.balance_minor || ''))) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account response could not be verified.');
        return carryIdentity(json(upstream.ok ? { ...result, sessionGuard: guard } : result, upstream.status), identity);
      }
      if (!['GET', 'HEAD'].includes(request.method)) reject(405, 'METHOD_NOT_ALLOWED', 'GET is required.');
      let assetPath=path===PREFIX+'/'?(assets['/compare74.html']?'/compare74.html':'/index.html'):path.slice(PREFIX.length);
      if(assets['/machines74.html']&&['/official74.html','/test72.html'].includes(assetPath))assetPath='/machines74.html';
      const asset = Object.hasOwn(assets,assetPath)?assets[assetPath]:null;
      if (!asset) reject(404, 'NOT_FOUND', 'Asset not found.');
      if (request.headers.get('if-none-match') === asset.etag) return new Response(null, { status: 304, headers: { etag: asset.etag } });
      const headers = { 'content-type': asset.type, etag: asset.etag, 'cache-control': asset.type.includes('html') ? 'no-store' : 'public, max-age=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
      if (asset.type.includes('html')) {
        const referencePage=assetPath==='/compare74.html';
        headers['content-security-policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:"+(referencePage?' https://cdn.prod.website-files.com':'')+"; connect-src 'self'; media-src 'self' blob:; "+(referencePage?"frame-src 'self' https://*.ssgportal.com https://*.smartsoftgaming.com; ":'')+"object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
      }
      return new Response(request.method === 'HEAD' ? null : asset.body, { headers });
    } catch (error) {
      if (error instanceof GatewayError) return json({ error: { code: error.code, message: error.message }, retryable: error.status >= 500 }, error.status);
      console.error(JSON.stringify({ event: 'independent74_gateway_error', name: error?.name || 'Error' }));
      return json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The game service is temporarily unavailable.' }, retryable: true }, 503);
    }
  };
}
