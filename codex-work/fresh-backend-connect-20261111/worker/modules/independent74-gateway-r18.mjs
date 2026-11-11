const C = new TextEncoder(), E = "/independent74", q = { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "Cookie", "x-content-type-options": "nosniff" }, Q = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class J extends Error {
  constructor(s, i, a) {
    super(a), this.status = s, this.code = i;
  }
}
const e = (t, s, i) => {
  throw new J(t, s, i);
}, w = (t, s = 200) => new Response(JSON.stringify(t), { status: s, headers: q }), F = (t) => [...new Uint8Array(t)].map((s) => s.toString(16).padStart(2, "0")).join("");
async function hash(t) {
  return F(await crypto.subtle.digest("SHA-256", C.encode(t)));
}
async function csrfGuard(t) {
  return hash("independent74-session-v1:" + t);
}
async function v(t, s) {
  if (!t) return "";
  const i = t.getReader(), a = [];
  let n = 0;
  try {
    for (; ; ) {
      const { done: U, value: p } = await i.read();
      if (U) break;
      n += p.byteLength, n > s && (await i.cancel(), e(413, "BODY_TOO_LARGE", "Request exceeds the size limit.")), a.push(p);
    }
  } finally {
    i.releaseLock();
  }
  const c = new Uint8Array(n);
  let b = 0;
  for (const U of a) c.set(U, b), b += U.byteLength;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(c);
  } catch {
    e(400, "INVALID_ENCODING", "UTF-8 is required.");
  }
}
function Y(t) {
  try {
    return JSON.parse(t);
  } catch {
    e(400, "INVALID_JSON", "A JSON request is required.");
  }
}
function X(t) {
  const s = (t.headers.get("cookie") || "").split(";").map((a) => a.trim()).filter((a) => a.startsWith("sw_session="));
  s.length !== 1 && e(401, "SIGN_IN_REQUIRED", "Sign in to your player account.");
  const i = s[0].slice(11);
  return (!i || i.length > 4096) && e(401, "SIGN_IN_REQUIRED", "Sign in to your player account."), i;
}
async function z(t, s) {
  const i = await crypto.subtle.importKey("raw", C.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]), a = await crypto.subtle.sign("HMAC", i, C.encode(s));
  return crypto.subtle.verify("HMAC", i, a, C.encode(t));
}
function ee(t, s) {
  (!t || Array.isArray(t) || typeof t != "object") && e(400, "INVALID_ACTION", "Invalid action."), (!Q.test(t.request_id) || !s.has(t.game_id)) && e(400, "INVALID_ACTION", "Invalid request or game identity.");
  const i = /* @__PURE__ */ new Set(["request_id", "game_id", "type", "options"]);
  if (t.type === "play" ? i.add("stake_minor") : ["reveal", "collect"].includes(t.type) ? (i.add("round_id"), i.add("expected_version"), (!Q.test(t.round_id) || !Number.isSafeInteger(t.expected_version) || t.expected_version < 0) && e(400, "INVALID_ROUND", "A current round version is required.")) : e(400, "INVALID_ACTION", "Unsupported action."), Object.keys(t).some((a) => !i.has(a)) && e(400, "INVALID_ACTION", "Unsupported action fields."), t.type === "play" && (typeof t.stake_minor != "string" || !/^[1-9][0-9]{0,18}$/.test(t.stake_minor) || BigInt(t.stake_minor) > 9223372036854775807n) && e(400, "INVALID_STAKE", "Stake must be a positive minor-unit integer within ledger storage."), t.options !== void 0) {
    (!t.options || Array.isArray(t.options) || typeof t.options != "object") && e(400, "INVALID_OPTIONS", "Invalid options.");
    const a = /* @__PURE__ */ new Set(["cell", "target", "targetBps", "risk", "rows", "choice", "steps", "mode", "number", "numbers", "mineCount"]);
    Object.keys(t.options).some((n) => !a.has(n)) && e(400, "INVALID_OPTIONS", "Unsupported game option.");
    for (const [n, c] of Object.entries(t.options)) ["cell", "target", "targetBps", "rows", "steps", "number", "mineCount"].includes(n) && (!Number.isSafeInteger(c) || c < 0 || c > 1e8) && e(400, "INVALID_OPTIONS", "Invalid numeric game option."), n === "numbers" && (!Array.isArray(c) || c.length < 1 || c.length > 5 || new Set(c).size !== c.length || c.some((b) => !Number.isInteger(b) || b < 1 || b > 40)) && e(400, "INVALID_OPTIONS", "Choose one to five distinct numbers from 1 to 40."), ["risk", "choice", "mode"].includes(n) && (typeof c != "string" || !/^[a-z0-9_-]{1,24}$/i.test(c)) && e(400, "INVALID_OPTIONS", "Invalid game option.");
  }
  return t;
}
function x(t, s) {
  const i = s.headers.get("x-zplay-session");
  i && t.headers.set("x-zplay-session", i);
  const a = s.headers.getSetCookie?.() || [];
  for (const n of a) t.headers.append("set-cookie", n);
  return t;
}
function validateNativeAction(t, s) {
  (!t || Array.isArray(t) || typeof t != "object" || !Q.test(t.request_id) || !s.has(t.game_id) || typeof t.model_version != "string" || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(t.model_version)) && e(400, "INVALID_ACTION", "Invalid request, model or game identity.");
  const i = /* @__PURE__ */ new Set(["request_id", "game_id", "model_version", "type"]);
  if (t.type === "start") {
    i.add("stake"), i.add("options"), (typeof t.stake != "string" || !/^(?:0|[1-9][0-9]{0,10})\.[0-9]{2}$/.test(t.stake)) && e(400, "INVALID_STAKE", "An exact ETB amount is required.");
    const a = BigInt(t.stake.replace(".", ""));
    (a < 100n || a % 100n !== 0n) && e(400, "INVALID_STAKE", "Choose a positive whole-ETB stake within the server account and game limits.");
    const n = t.options ?? {}, c = t.game_id === "ind74_official_plinkox", b = t.game_id === "ind74_official_wheelofdestiny", U = c ? ["risk", "ballAmount"] : b ? ["bets"] : ["mode", "target", "holdWin"];
    if ((!n || Array.isArray(n) || typeof n != "object" || Object.keys(n).some((p) => !U.includes(p))) && e(400, "INVALID_OPTIONS", "Unsupported game option."), c) {
      n.risk !== void 0 && !["low", "medium", "high"].includes(n.risk) && e(400, "INVALID_OPTIONS", "Choose a verified risk board."), n.ballAmount !== void 0 && (!Number.isSafeInteger(n.ballAmount) || ![1, 5, 10, 25].includes(n.ballAmount)) && e(400, "INVALID_OPTIONS", "Choose a supported ball amount.");
      const p = BigInt(n.ballAmount ?? 1);
      a % (p * 100n) !== 0n && e(400, "INVALID_STAKE", "The total stake must split into whole-ETB stakes per ball.");
    }
    if (b && n.bets !== void 0) {
      (!Array.isArray(n.bets) || n.bets.length < 1 || n.bets.length > 9) && e(400, "INVALID_OPTIONS", "Choose one to nine distinct wheel fields.");
      const p = /* @__PURE__ */ new Set();
      let D = 0n;
      for (const u of n.bets) {
        (!u || typeof u != "object" || Array.isArray(u) || Object.keys(u).length !== 2 || Object.keys(u).some((N) => !["symbolIndex", "amountMinor"].includes(N)) || !Number.isSafeInteger(u.symbolIndex) || u.symbolIndex < 0 || u.symbolIndex > 8 || p.has(u.symbolIndex) || typeof u.amountMinor != "string" || !/^[1-9][0-9]{0,14}$/.test(u.amountMinor)) && e(400, "INVALID_OPTIONS", "Invalid wheel allocation.");
        const o = BigInt(u.amountMinor);
        (o < 100n || o % 100n !== 0n) && e(400, "INVALID_STAKE", "Wheel allocations must use whole-ETB stakes."), p.add(u.symbolIndex), D += o;
      }
      D !== a && e(400, "INVALID_STAKE", "Wheel allocations must equal the total stake.");
    }
    n.mode !== void 0 && (typeof n.mode != "string" || !/^[a-z0-9_-]{1,24}$/.test(n.mode)) && e(400, "INVALID_OPTIONS", "Invalid game mode."), n.target !== void 0 && (!Number.isSafeInteger(n.target) || n.target < 1 || n.target > 99) && e(400, "INVALID_OPTIONS", "Invalid dice target."), n.holdWin !== void 0 && typeof n.holdWin != "boolean" && e(400, "INVALID_OPTIONS", "Invalid held-win choice.");
  } else if (t.type === "action") {
    for (const c of ["round_id", "expected_version", "action", "input"]) i.add(c);
    (!Q.test(t.round_id) || !Number.isSafeInteger(t.expected_version) || t.expected_version < 0 || !["reveal", "collect", "sync", "gamble"].includes(t.action)) && e(400, "INVALID_ROUND", "Invalid round action.");
    const a = t.input ?? {}, n = t.action === "reveal" ? ["cell"] : t.action === "gamble" ? ["color"] : [];
    (!a || Array.isArray(a) || typeof a != "object" || Object.keys(a).some((c) => !n.includes(c))) && e(400, "INVALID_OPTIONS", "Unsupported action input."), a.cell !== void 0 && (!Number.isSafeInteger(a.cell) || a.cell < 0 || a.cell > 99) && e(400, "INVALID_OPTIONS", "Invalid cell."), t.action === "gamble" && !["red", "black"].includes(a.color) && e(400, "INVALID_OPTIONS", "Choose red or black.");
  } else e(400, "INVALID_ACTION", "Unsupported action.");
  return Object.keys(t).some((a) => !i.has(a)) && e(400, "INVALID_ACTION", "Unsupported client authority."), t;
}
// Public catalog capability only. A balance connection is confirmed only
// after the unchanged authenticated /api/machine-session read succeeds.
function readOnlyAccountDefinition(game) {
  return {
    ...game, accepting: false, launchable: false, readOnly: true,
    modelInstalled: false, accountReadSupported: true,
    historyAvailable: false, activeRecoveryVerified: false,
    releaseStatus: 'pending', controls: { ...game.controls, actions: [] },
  };
}

function createGateway({ previous: t, assets: s = {}, games: i = [], accountGames: a = [], demoHandler: n = null, homeEnhancement: c = false, accountTransport: b = "protected-readonly", fetchImpl: U = (...p) => fetch(...p) }) {
  if (typeof t?.fetch != "function") throw new Error("Legacy handler required.");
  const p = new Set(i.map((u) => u.id)), D = new Set(a.map((u) => u.id));
  return async function(o, N, G) {
    const I = new URL(o.url), _ = I.pathname;
    if (_ === E + "/progress.html") return new Response(null, { status: 302, headers: { location: "/", "cache-control": "no-store" } });
    if (_ !== E && !_.startsWith(E + "/")) {
      const d = await t.fetch(o, N, G);
      if (!c || _ !== "/" || o.method !== "GET" || d.status !== 200 || !d.headers.get("content-type")?.includes("text/html") || d.headers.has("content-encoding")) return d;
      const O = await d.text();
      if (O.includes("/independent74/lobby74.mjs")) return new Response(O, d);
      const V = (g) => {
        const S = s[g]?.etag?.match(/[a-f0-9]{64}/)?.[0];
        return S ? "?v=" + S : "";
      }, r = s["/fresh74-lobby.mjs"] ? '<script type="module" src="/independent74/fresh74-lobby.mjs' + V("/fresh74-lobby.mjs") + '"><\/script>' : "", k = s["/fresh74-lobby.css"] ? '<link rel="stylesheet" href="/independent74/fresh74-lobby.css' + V("/fresh74-lobby.css") + '">' : "", y = O.replace("</head>", '<link rel="stylesheet" href="/independent74/lobby74.css' + V("/lobby74.css") + '">' + k + "</head>").replace("</body>", '<script type="module" src="/independent74/lobby74.mjs' + V("/lobby74.mjs") + '"><\/script>' + r + "</body>"), l = new Headers(d.headers);
      l.delete("etag"), l.delete("content-length"), l.set("cache-control", "private, no-store");
      let m = l.get("content-security-policy");
      return m && (m.includes("https://cdn.prod.website-files.com") || (m = m.replace(/img-src[^;]*/i, (g) => g + " https://cdn.prod.website-files.com")), m = /frame-src[^;]*/i.test(m) ? m.replace(/frame-src[^;]*/i, "frame-src 'self'") : m + "; frame-src 'self'", l.set("content-security-policy", m)), new Response(y, { status: d.status, headers: l });
    }
    try {
      if (_ === E) return new Response(null, { status: 308, headers: { location: E + "/", "cache-control": "no-store" } });
      if (_.startsWith(E + "/demo-api/")) return n ? n(o, N, G) : w({ error: { code: "DEMO_SERVICE_UNAVAILABLE", message: "Free demo is temporarily unavailable." } }, 503);
      if (_.startsWith(E + "/account-api/")) {
        const r = _.slice((E + "/account-api/").length);
        if (["catalog", "state", "action", "history"].includes(r) || e(404, "NOT_FOUND", "Endpoint not found."), o.method !== (r === "action" ? "POST" : "GET") && e(405, "METHOD_NOT_ALLOWED", "Unsupported method."), r === "catalog") return I.search && e(400, "INVALID_QUERY", "Unsupported catalog query."), w({ edition: "ZPLAY independent operator build", officialProviderMath: false, productionReleaseVerified: false,
          games: b === "protected-readonly" ? a.map(readOnlyAccountDefinition) : a,
          ...(b === "protected-readonly" ? { readOnly: true, accountReadSupported: true,
            modelInstalled: false, new_rounds_enabled: false, historyAvailable: false,
            activeRecoveryVerified: false, releaseStatus: 'pending' } : {}),
        });
        r === "action" && (o.headers.get("origin") !== I.origin || !/^application\/json(?:\s*;|$)/i.test(o.headers.get("content-type") || "")) && e(403, "SAME_ORIGIN_REQUIRED", "A same-origin JSON request is required.");
        const k = X(o), y = await t.fetch(new Request(new URL("/api/machine-session", I), { headers: { cookie: o.headers.get("cookie"), accept: "application/json" } }), N, G);
        if (!y.ok) return await y.body?.cancel(), x(w({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to your existing player account." } }, 401), y);
        let l;
        try {
          l = JSON.parse(await v(y.body, 16384));
        } catch {
          e(502, "INVALID_ACCOUNT_RESPONSE", "Unreadable identity response.");
        }
        if (l?.authenticated !== true) return x(w({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to your existing player account." } }, 401), y);
        if (b === "protected-readonly") {
          (l.currency !== "ETB" || typeof l.balance != "string" || !/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(l.balance) || !/^[a-f0-9]{64}$/.test(l.sessionId || "")) && e(502, "INVALID_ACCOUNT_RESPONSE", "The existing account balance could not be verified."), r === "action" && ((I.search || !await z(o.headers.get("x-independent74-session") || "", l.sessionId)) && e(403, "SESSION_REFRESH_REQUIRED", "Refresh account state before playing."), validateNativeAction(Y(await v(o.body, 8192)), D), e(503, "GAME_RELEASE_NOT_READY", "This game has not been enabled on the existing wallet."));
          for (const W of I.searchParams.keys()) (W !== "game_id" || I.searchParams.getAll(W).length !== 1) && e(400, "INVALID_QUERY", "Unsupported query parameter.");
          const A = I.searchParams.get("game_id");
          D.has(A) || e(400, "UNKNOWN_GAME", "Unknown game."), r === "history" && e(503, "GAME_HISTORY_NOT_AVAILABLE", "This new game has no verified history route on the existing backend.");
          const Z = a.find((W) => W.id === A);
          return x(w({ authenticated: true, mode: "account", currency: "ETB", balance: l.balance,
            game_id: A, game: readOnlyAccountDefinition(Z), model_version: Z.version,
            accepting: false, new_rounds_enabled: false, round: null,
            readOnly: true, modelInstalled: false, accountServiceAvailable: true,
            accountReadSupported: true, activeRecoveryVerified: false,
            historyAvailable: false, existingWalletReadOnly: true,
            releaseStatus: 'pending', sessionGuard: l.sessionId,
          }), y);
        }
        b !== "library74" && e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "Unsupported account transport.");
        const m = await csrfGuard(k);
        let g = "", S, R = "/v2/independent74/" + r;
        if (r === "action") {
          (I.search || !await z(o.headers.get("x-independent74-session") || "", m)) && e(403, "SESSION_REFRESH_REQUIRED", "Refresh account state before playing.");
          const A = validateNativeAction(Y(await v(o.body, 8192)), D);
          g = JSON.stringify(A), S = A.game_id;
        } else {
          for (const A of I.searchParams.keys()) (A !== "game_id" || I.searchParams.getAll(A).length !== 1) && e(400, "INVALID_QUERY", "Unsupported query parameter.");
          S = I.searchParams.get("game_id"), D.has(S) || e(400, "UNKNOWN_GAME", "Unknown game."), R += "?game_id=" + encodeURIComponent(S);
        }
        (!N.NATIVE_ENGINE_ORIGIN || !N.NATIVE_ENGINE_SECRET) && e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "The existing account service is unavailable.");
        let T;
        try {
          T = new URL(N.NATIVE_ENGINE_ORIGIN);
        } catch {
          e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "Invalid existing account service.");
        }
        (T.protocol !== "https:" || T.username || T.password || T.pathname !== "/" || T.search || T.hash) && e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "Invalid existing account service.");
        const P = new URL(R, T), j = String(Date.now()), B = "@session:" + await hash(k), K = [o.method, P.pathname + P.search, j, B, await hash(g)].join(`
`), $ = await crypto.subtle.importKey("raw", C.encode(N.NATIVE_ENGINE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), M = F(await crypto.subtle.sign("HMAC", $, C.encode(K))), H = new AbortController(), L = setTimeout(() => H.abort(), 15e3);
        let f, h;
        try {
          if (f = await U(P, { method: o.method, headers: { accept: "application/json", "content-type": "application/json", "x-native-user": B, "x-native-time": j, "x-native-signature": M }, ...g ? { body: g } : {}, redirect: "manual", signal: H.signal }), f.status >= 300 && f.status < 400 && (await f.body?.cancel(), e(502, "INVALID_ACCOUNT_RESPONSE", "Unexpected service redirect.")), h = JSON.parse(await v(f.body, 2 * 1024 * 1024)), !h || Array.isArray(h) || typeof h != "object") throw Error("INVALID_RESPONSE");
        } catch (A) {
          if (A instanceof J) throw A;
          e(503, r === "action" ? "ACTION_UNCONFIRMED" : "ACCOUNT_SERVICE_UNAVAILABLE", "The existing account service did not confirm this request.");
        } finally {
          clearTimeout(L);
        }
        return f.status === 401 && e(503, "GAME_ACCOUNT_ROUTE_UNAVAILABLE", "The existing account is signed in, but this game account route is not available yet."), f.ok && ((h.authenticated !== true || h.currency !== "ETB") && e(502, "INVALID_ACCOUNT_RESPONSE", "The account identity and currency could not be verified."), r === "history" ? (h.game_id !== S || !Array.isArray(h.history) || h.history.length > 100) && e(502, "INVALID_ACCOUNT_RESPONSE", "Invalid account history.") : (h.game?.id !== S || !/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(h.balance || "") || typeof h.accepting != "boolean") && e(502, "INVALID_ACCOUNT_RESPONSE", "Invalid account snapshot.")), x(w(f.ok ? { ...h, sessionGuard: m } : h, f.status), y);
      }
      if (_ === E + "/api/catalog") {
        ["GET", "HEAD"].includes(o.method) || e(405, "METHOD_NOT_ALLOWED", "GET is required.");
        const r = w({ edition: "Independent edition", officialProviderMath: false, games: i });
        return o.method === "HEAD" ? new Response(null, { headers: r.headers }) : r;
      }
      if (_.startsWith(E + "/api/")) {
        const r = _.slice((E + "/api/").length);
        ["state", "history", "action"].includes(r) || e(404, "NOT_FOUND", "Endpoint not found."), o.method !== (r === "action" ? "POST" : "GET") && e(405, "METHOD_NOT_ALLOWED", "Unsupported method."), r === "action" && (o.headers.get("origin") !== I.origin || !/^application\/json(?:\s*;|$)/i.test(o.headers.get("content-type") || "")) && e(403, "SAME_ORIGIN_REQUIRED", "A same-origin JSON request is required.");
        const k = X(o), y = await t.fetch(new Request(new URL("/api/machine-session", I), { headers: { cookie: o.headers.get("cookie"), accept: "application/json" } }), N, G);
        if (!y.ok) return await y.body?.cancel(), x(w({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to your existing player account." }, retryable: false }, 401), y);
        let l;
        try {
          l = JSON.parse(await v(y.body, 16384));
        } catch {
          e(502, "INVALID_ACCOUNT_RESPONSE", "The identity service returned an unreadable response.");
        }
        if ((!l || typeof l != "object" || Array.isArray(l)) && e(502, "INVALID_ACCOUNT_RESPONSE", "The identity service returned an invalid response."), l.authenticated !== true) return x(w({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to your existing player account." }, retryable: false }, 401), y);
        const m = await csrfGuard(k);
        let g = "", S = "/v1/independent74/" + r;
        if (r === "action") (I.search || !await z(o.headers.get("x-independent74-session") || "", m)) && e(403, "SESSION_REFRESH_REQUIRED", "Refresh the account state before playing."), g = JSON.stringify(ee(Y(await v(o.body, 8192)), p));
        else {
          for (const A of I.searchParams.keys()) (A !== "game_id" || I.searchParams.getAll(A).length !== 1) && e(400, "INVALID_QUERY", "Unsupported query parameter.");
          const h = I.searchParams.get("game_id");
          p.has(h) || e(400, "UNKNOWN_GAME", "Unknown independent game."), S += "?game_id=" + encodeURIComponent(h);
        }
        (!N.NATIVE_ENGINE_ORIGIN || !N.NATIVE_ENGINE_SECRET) && e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "The existing account service is unavailable.");
        let R;
        try {
          R = new URL(N.NATIVE_ENGINE_ORIGIN);
        } catch {
          e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "The existing account service is unavailable.");
        }
        (R.protocol !== "https:" || R.username || R.password || R.pathname !== "/" || R.search || R.hash) && e(503, "ACCOUNT_SERVICE_UNAVAILABLE", "The account service is unavailable.");
        const T = new URL(S, R), P = String(Date.now()), j = "@session:" + await hash(k), B = [o.method, T.pathname + T.search, P, j, await hash(g)].join(`
`), K = await crypto.subtle.importKey("raw", C.encode(N.NATIVE_ENGINE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), $ = F(await crypto.subtle.sign("HMAC", K, C.encode(B))), M = new AbortController(), H = setTimeout(() => M.abort(), 15e3);
        let L, f;
        try {
          L = await U(T, { method: o.method, headers: { accept: "application/json", "content-type": "application/json", "x-native-user": j, "x-native-time": P, "x-native-signature": $ }, ...g ? { body: g } : {}, redirect: "manual", signal: M.signal }), L.status >= 300 && L.status < 400 && (await L.body?.cancel(), e(502, "INVALID_ACCOUNT_RESPONSE", "Unexpected account-service redirect."));
          try {
            f = JSON.parse(await v(L.body, 2 * 1024 * 1024));
          } catch {
            e(502, "INVALID_ACCOUNT_RESPONSE", "The account service returned an unreadable response.");
          }
          (!f || typeof f != "object" || Array.isArray(f)) && e(502, "INVALID_ACCOUNT_RESPONSE", "The account service returned an invalid response.");
        } catch (h) {
          if (h instanceof J) throw h;
          e(503, "ACTION_UNCONFIRMED", "The account service did not confirm this action. Refresh the round before retrying.");
        } finally {
          clearTimeout(H);
        }
        return L.ok && (f.authenticated !== true || f.currency !== "ETB" || f.game?.id !== (r === "action" ? JSON.parse(g).game_id : I.searchParams.get("game_id")) || !/^[0-9]+$/.test(f.wallet?.balance_minor || "")) && e(502, "INVALID_ACCOUNT_RESPONSE", "The account response could not be verified."), x(w(L.ok ? { ...f, sessionGuard: m } : f, L.status), y);
      }
      ["GET", "HEAD"].includes(o.method) || e(405, "METHOD_NOT_ALLOWED", "GET is required.");
      let d = _ === E + "/" ? s["/compare74.html"] ? "/compare74.html" : "/index.html" : _.slice(E.length);
      s["/machines74.html"] && ["/official74.html", "/test72.html"].includes(d) && (d = "/machines74.html");
      const O = Object.hasOwn(s, d) ? s[d] : null;
      if (O || e(404, "NOT_FOUND", "Asset not found."), o.headers.get("if-none-match") === O.etag) return new Response(null, { status: 304, headers: { etag: O.etag } });
      const V = { "content-type": O.type, etag: O.etag, "cache-control": O.type.includes("html") ? "no-store" : "public, max-age=300", "x-content-type-options": "nosniff", "referrer-policy": "same-origin" };
      if (O.type.includes("html")) {
        const r = d === "/compare74.html";
        V["content-security-policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:" + (r ? " https://cdn.prod.website-files.com" : "") + "; connect-src 'self'; media-src 'self' blob:; " + (r ? "frame-src 'self' https://*.ssgportal.com https://*.smartsoftgaming.com; " : "") + "object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
      }
      return new Response(o.method === "HEAD" ? null : O.body, { headers: V });
    } catch (d) {
      return d instanceof J ? w({ error: { code: d.code, message: d.message }, retryable: d.status >= 500 && !["GAME_RELEASE_NOT_READY", "GAME_HISTORY_NOT_AVAILABLE"].includes(d.code) }, d.status) : (console.error(JSON.stringify({ event: "independent74_gateway_error", name: d?.name || "Error" })), w({ error: { code: "SERVICE_UNAVAILABLE", message: "The game service is temporarily unavailable." }, retryable: true }, 503));
    }
  };
}
export {
  createGateway,
  csrfGuard,
  hash,
  validateNativeAction
};
