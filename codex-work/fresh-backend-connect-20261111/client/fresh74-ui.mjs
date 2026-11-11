import { freshSymbol as Z } from "./fresh74-art.mjs?v=r18";
import {
  FreshAccountClient,
  minor as m,
  money as T,
  validateReceipt,
} from "./fresh74-account.mjs?v=r18";
const account = new FreshAccountClient();
const collected = new Set();
const a = (e) => document.getElementById(e);
let p = [];
let n = null,
  b = 10,
  h = !1,
  g = null,
  l = 0,
  d = null,
  L = !1,
  E = !0,
  M = null,
  V = 2;
const y = (text, error = false) => {
  a("status").textContent = text;
  a("status").classList.toggle("error", error);
};
function f(e) {
  if (E || M?.state !== "running") return;
  const t = {
    tap: [620],
    spin: [180, 240],
    stop: [410],
    win: [523, 659, 784],
    bonus: [523, 784, 1047],
    error: [196, 147],
  }[e] ?? [440];
  try {
    t.forEach((r, o) => {
      const i = M.createOscillator(),
        s = M.createGain(),
        u = M.currentTime + o * 0.08;
      ((i.type = "triangle"),
        (i.frequency.value = r),
        s.gain.setValueAtTime(0.045, u),
        s.gain.exponentialRampToValueAtTime(0.001, u + 0.16),
        i.connect(s),
        s.connect(M.destination),
        i.start(u),
        i.stop(u + 0.17),
        (i.onended = () => {
          (i.disconnect(), s.disconnect());
        }));
    });
  } catch {}
}
function c() {
  d = account.pending;
  const e = n?.round?.gambleAvailable === true,
    t =
      h ||
      !n ||
      !!d ||
      account.needsRefresh ||
      n.game.enabled !== true ||
      n.game.freshReleaseReady !== true ||
      !!account.snapshot?.blockedByActiveGame;
  ((a("spin").disabled = t),
    (a("less").disabled = t || l > 0 || b === p[0]),
    (a("more").disabled = t || l > 0 || b === p.at(-1)),
    (a("collect").disabled = t || !e),
    (a("gamble").disabled = t || !e),
    (a("red").disabled = t || !e),
    (a("black").disabled = t || !e),
    (a("take").disabled = t || !e),
    (a("spin").hidden = !!g),
    (a("stop").hidden = !g),
    (a("retry").hidden = !d && !!n && !account.needsRefresh),
    (a("retry").disabled = h),
    (a("auto").disabled = !l && t),
    (a("auto").textContent = l ? "JOOJI AUTO \xB7 " + l : "AUTO"),
    (a("balance").textContent = n ? T(n.balanceMinor) : "\u2014"),
    (a("bet-label").textContent = T(b)),
    (a("held").textContent = T(n?.round?.paidMinor ?? 0) + " ETB"));
}
function S(e = 2) {
  const t = [1, 3, 5, 2, 4],
    r = t.indexOf(e);
  document.querySelector(".fresh-arc").innerHTML = Array.from(
    { length: 5 },
    (o, i) =>
      "<span" +
      (i === 2 ? ' class="selected"' : "") +
      ">" +
      t[(r + i - 2 + 5) % 5] +
      "\xD7</span>",
  ).join("");
}
const _ = (e, t = !1) =>
  '<div class="fresh-cell' + (t ? " won" : "") + '">' + Z(e) + "</div>";
function x(e = n?.round) {
  const t = e?.grid ?? [
      ["seven", "bell", "grape", "watermelon", "lemon"],
      ["orange", "plum", "cherry", "seven", "bell"],
      ["lemon", "orange", "bell", "grape", "plum"],
    ],
    r = new Set(
      (e?.wins ?? []).flatMap((s) =>
        s.positions.map((u) => u.row + ":" + u.col),
      ),
    );
  ((a("reels").innerHTML = Array.from(
    { length: 5 },
    (s, u) =>
      '<div class="fresh-reel"><div class="fresh-track">' +
      t.map((I, w) => _(I[u], r.has(w + ":" + u))).join("") +
      "</div></div>",
  ).join("")),
    S(e?.reelMultiplier ?? 2),
    (V = e?.reelMultiplier ?? 2));
  const o = e?.paidMinor ?? e?.winMinor ?? 0;
  a("win").textContent = e
    ? o > 0
      ? (o / e.betMinor >= 20
          ? "FANTASTIC WIN \xB7 "
          : o / e.betMinor >= 10
            ? "BIG WIN \xB7 "
            : "WIN \xB7 ") +
        T(o) +
        " ETB"
      : "WAREEG DHAMMAADAY"
    : n?.game?.freshReleaseReady
      ? "DIYAAR"
      : "WELI MA FURNA";
  const i = e?.gamble?.at(-1)?.revealed?.toLowerCase();
  ((a("card").className = "fresh-card" + (i ? " " + i : "")),
    (a("card").textContent =
      i === "red" ? "\u2665" : i === "black" ? "\u2660" : "?"));
}
const v = (path) => account.request(path);
function W(e) {
  validateReceipt(e);
  if (
    e.gameId !== "fresh_multihot10" ||
    e.mathVersion !== "fresh-mh10-20261111-v1" ||
    e.currency !== "ETB" ||
    !e.walletReceipt ||
    e.walletReceipt.currency !== "ETB"
  )
    throw Error("INVALID_ACCOUNT_ROUND");
  const t = e.walletReceipt,
    r = m(t.balanceBefore),
    o = m(t.chargedStake),
    i = m(t.finalWin),
    s = m(t.balanceAfter);
  if (r - o + i !== s) throw Error("INVALID_SETTLEMENT_RECEIPT");
  return {
    id: e.roundId,
    grid: e.grid,
    reelMultiplier: e.wheelMultiplier,
    wins: e.winLines ?? [],
    winMinor: i,
    paidMinor: i,
    betMinor: m(e.bet),
    status: "settled",
    gambleAvailable: false,
    gamble: [],
    at: Date.now(),
  };
}
async function K(e, t) {
  let r,
    o = !1;
  const i = [],
    s = [],
    u = new Promise((k) => (r = k)),
    I = t.round,
    w = () => {
      if (!o) {
        o = !0;
        try {
          for (const k of s) clearTimeout(k);
          for (const k of i)
            try {
              k.cancel();
            } catch {}
          (x(I), f(I.winMinor ? "win" : "stop"));
        } catch {
          y("Muuqaalka ayaa khaldamay. Dib u hubi.", !0);
        } finally {
          r();
        }
      }
    };
  if (
    ((g = { stop: w }),
    c(),
    s.push(setTimeout(w, a("turbo").checked ? 1200 : 4e3)),
    matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    (w(), await u, (g = null));
    return;
  }
  try {
    const k = I.grid,
      H = e?.grid ?? k,
      j = t.game.symbols,
      Y = [...a("reels").children],
      D = [1, 3, 5, 2, 4],
      J = D.indexOf(V);
    for (let A = 1; A < 8; A++)
      s.push(
        setTimeout(
          () => {
            o || S(D[(J + A) % 5]);
          },
          A * (a("turbo").checked ? 17 : 100),
        ),
      );
    s.push(
      setTimeout(
        () => {
          o || S(I.reelMultiplier);
        },
        a("turbo").checked ? 150 : 820,
      ),
    );
    const z = Y.map((A, O) => {
      const G = A.firstElementChild,
        F = A.getBoundingClientRect().height / 3;
      G.innerHTML =
        H.map((C) => _(C[O])).join("") +
        j.map((C) => _(C)).join("") +
        k.map((C) => _(C[O])).join("");
      const $ = F * (3 + j.length),
        Q = a("turbo").checked ? 160 + O * 22 : 850 + O * 140,
        U = G.animate(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(-" + $ + "px)" },
          ],
          {
            duration: Q,
            fill: "forwards",
            easing: "cubic-bezier(.15,.63,.25,1)",
          },
        );
      return (
        i.push(U),
        U.finished
          .then(() => {
            o || f("stop");
          })
          .catch(() => {})
      );
    });
    Promise.all(z).then(w, w);
  } catch {
    w();
  }
  (await u, (g = null));
}
function present(state) {
  let round = state.round ? W(state.round.result) : null;
  if (round) {
    const gamble = state.round.gamble;
    round.paidMinor = m(gamble.stake);
    round.winMinor = m(gamble.stake);
    round.gambleAvailable = gamble.available && !collected.has(round.id);
    round.gamble = gamble.lastResult ? [gamble.lastResult] : [];
    round.at = new Date(state.round.createdAt).getTime();
  }
  n = {
    currency: "ETB",
    balanceMinor: m(state.balance),
    game: state.game,
    round,
    history: n?.history ?? [],
  };
  p = state.game.betLevels.map(m).sort((a, b) => a - b);
  if (!p.includes(b)) b = p[0] ?? 0;
  a("bets").innerHTML = p
    .map(
      (amount) =>
        '<button data-bet="' + amount + '">' + T(amount) + "</button>",
    )
    .join("");
  document.querySelector(".fresh-notice").textContent =
    state.game.enabled && state.game.freshReleaseReady
      ? "WALLET ETB · Backend-ka jira"
      : "WALLET ETB · Furitaanka ciyaarta weli waa la hubinayaa";
  a("login").hidden = true;
}

async function B(kind, options = {}) {
  if (h || !n || L || account.pending) return false;
  return q(kind, options);
}

async function q(kind = null, options = {}) {
  if (h || L || (!kind && !account.pending)) return false;
  h = true;
  y("Xaqiijinaya wareegga…");
  c();
  f("spin");
  const previous = n?.round;
  try {
    const outcome =
      kind === "spin"
        ? await account.start(options.betMinor)
        : kind === "gamble"
          ? await account.gamble(options.color.toUpperCase())
          : await account.retry();
    if (!outcome.needsRefresh) present(outcome.state);
    else if (outcome.kind === "spin") {
      n = {
        ...n,
        balanceMinor: m(outcome.result.walletReceipt.balanceAfter),
        round: W(outcome.result),
      };
    } else if (n?.round) {
      n = {
        ...n,
        balanceMinor: m(outcome.result.balanceAfter),
        round: {
          ...n.round,
          paidMinor: m(outcome.result.payout),
          winMinor: m(outcome.result.payout),
          gambleAvailable: false,
          gamble: [outcome.result],
        },
      };
    }
    if (outcome.kind === "spin") {
      const accepted = W(outcome.result);
      await K(previous, { ...n, round: accepted });
      x();
    } else {
      x();
      f(m(outcome.result.payout) ? "bonus" : "stop");
    }
    y(
      outcome.needsRefresh
        ? "Wareegga waa la xaqiijiyey. Riix Dib u xaqiiji si hadhaaga hadda loo cusboonaysiiyo."
        : "Wareegga iyo hadhaaga ETB waxaa xaqiijiyey backend-ka jira.",
    );
    if (outcome.needsRefresh) l = 0;
    return !outcome.needsRefresh;
  } catch (error) {
    l = 0;
    if (!error.ambiguous) {
      try {
        present(await account.refresh());
        x();
      } catch {}
    }
    const message =
      {
        INSUFFICIENT_FUNDS: "Hadhaaga ETB kuma filna bet-kan.",
        OTHER_GAME_ACTIVE: "Dhammaystir wareegga ciyaarta kale marka hore.",
        FINISH_ACTIVE_ROUND: "Dhammaystir wareegga ciyaarta kale marka hore.",
        ROUND_NOT_CONFIRMED:
          "Backend-ku ma aqbalin codsigii hore. Lacag cusub lama jarin; waad bilaabi kartaa wareeg cusub.",
        GAMBLE_STATE_CHANGED:
          "X2-ga wuu isbeddelay. Xogta ugu dambaysa ayaa dib loo hubiyey.",
        PLAYER_SESSION_CHANGED:
          "Fadhiga akoonka wuu isbeddelay. Dib u gal akoonkaaga.",
        GAME_RULES_UPDATED_RELOAD:
          "Xeerarka ciyaarta waa la cusboonaysiiyey. Dib u fur ciyaarta.",
      }[String(error.code).split(":")[0]] ??
      "Codsigii lama xaqiijin: " + error.message + ". Riix Dib u xaqiiji.";
    y(message, true);
    f("error");
    return false;
  } finally {
    h = false;
    g = null;
    c();
  }
}

async function P() {
  if (h) return;
  h = true;
  c();
  try {
    present(await account.refresh());
    x();
    y(
      account.pending
        ? "Codsi hore ayaa sugaya xaqiijin. Riix Dib u xaqiiji; sharad cusub lama bilaabayo."
        : account.snapshot.blockedByActiveGame
          ? "Dhammaystir wareegga ciyaarta kale marka hore."
          : n.game.enabled && n.game.freshReleaseReady
            ? "Mashiinka iyo wallet-ka ETB ee jira waa diyaar."
            : "Wallet-ka waa ku xidhan yahay; furitaanka ciyaarta weli waa la hubinayaa.",
    );
  } catch (error) {
    n = null;
    account.needsRefresh = true;
    x();
    a("login").hidden = error.status !== 401;
    y(
      error.status === 401
        ? "Gal akoonkaaga ZPLAY si aad u isticmaasho wallet-ka ETB."
        : "Xidhiidhka akoonka lama xaqiijin: " +
            error.message +
            ". Riix Dib u xaqiiji.",
      true,
    );
  } finally {
    h = false;
    c();
  }
}
const N = (e) => {
  (f("tap"), a(e).open || a(e).showModal());
};
for (const e of document.querySelectorAll("[data-close]"))
  e.addEventListener("click", () => a(e.dataset.close).close());
((a("spin").onclick = () => B("spin", { betMinor: b, autoCollect: !1 })),
  (a("stop").onclick = () => {
    ((l = 0), g?.stop(), c());
  }),
  (a("retry").onclick = () => (account.pending && n ? q() : P())),
  (a("less").onclick = () => {
    ((b = p[Math.max(0, p.indexOf(b) - 1)]), f("tap"), c());
  }),
  (a("more").onclick = () => {
    ((b = p[Math.min(p.length - 1, p.indexOf(b) + 1)]), f("tap"), c());
  }),
  (a("menu-bet").onclick = () => {
    !h && !l && N("bet-menu");
  }),
  (a("bets").innerHTML = p
    .map((e) => '<button data-bet="' + e + '">' + T(e) + "</button>")
    .join("")),
  (a("bets").onclick = (e) => {
    const t = Number(e.target.closest("[data-bet]")?.dataset.bet);
    !p.includes(t) || h || l || ((b = t), a("bet-menu").close(), f("tap"), c());
  }),
  (a("menu-rules").onclick = () => N("rules")),
  (a("collect").onclick = () => {
    (collected.add(n.round.id),
      (n.round.gambleAvailable = !1),
      c(),
      y("Guusha horey ayaa loogu shubay wallet-ka ETB."));
  }),
  (a("gamble").onclick = () => N("gamble-menu")),
  (a("red").onclick = () => B("gamble", { color: "red" })),
  (a("black").onclick = () => B("gamble", { color: "black" })),
  (a("take").onclick = () => {
    (collected.add(n.round.id),
      (n.round.gambleAvailable = !1),
      a("gamble-menu").close(),
      c(),
      y("Guusha waxaa hayaa wallet-ka ETB."));
  }),
  (a("menu-history").onclick = async () => {
    if (n)
      try {
        const e = await v("rounds");
        n.history = e.items
          .filter((t) => t.game_code === "fresh_multihot10")
          .slice(0, 30)
          .map((t) => ({
            ...W(t.result_json),
            at: new Date(t.created_at).getTime(),
          }));
      } catch {
        y("Taariikhda backend-ka lama helin.", !0);
      }
    a("history").replaceChildren();
    for (const e of n?.history ?? []) {
      const t = document.createElement("li");
      ((t.textContent =
        new Date(e.at).toLocaleTimeString() +
        " \xB7 BET " +
        T(e.betMinor) +
        " \xB7 " +
        ("SPIN WIN " + T(e.paidMinor ?? e.winMinor)) +
        " ETB"),
        a("history").append(t));
    }
    N("history-menu");
  }),
  (a("auto").onclick = () => {
    l ? ((l = 0), c()) : N("auto-menu");
  }),
  (a("start-auto").onclick = async () => {
    if (!(h || d)) {
      for (
        l = Number(a("auto-count").value), a("auto-menu").close();
        l > 0 &&
        !L &&
        !(
          document.hidden ||
          !(await B("spin", { betMinor: b, autoCollect: !0 }))
        );
      )
        (l--, c());
      ((l = 0), c());
    }
  }),
  (a("sound").onclick = () => {
    if (
      ((E = !E),
      a("sound").setAttribute("aria-pressed", String(!E)),
      (a("sound").textContent = E ? "\u266B COD" : "\u266B COD \xB7 ON"),
      !E)
    )
      try {
        ((M ??= new AudioContext()),
          M.resume()
            ?.then(() => f("tap"))
            .catch(() => {}));
      } catch {
        E = !0;
      }
  }),
  (a("paytable").innerHTML =
    "<table><thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>" +
    [
      ["Seven", 50, 200, 1e3],
      ["Bell", 20, 100, 200],
      ["Grapes / Melon", 10, 50, 100],
      ["Lemon / Plum / Orange / Cherry", 5, 10, 50],
    ]
      .map(
        (e) =>
          "<tr>" +
          e
            .map(
              (t, r) =>
                "<" +
                (r ? "td" : "th") +
                ">" +
                t +
                (r ? "\xD7" : "") +
                "</" +
                (r ? "td" : "th") +
                ">",
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody></table><p>Qiimayaashu waxay ku dhuftaan bet-ka hal khad.</p>"));
const X = setInterval(async () => {
  if (!(h || !n || L || account.pending))
    try {
      present(await account.refresh());
      x();
      c();
    } catch {}
}, 15e3);
(window.addEventListener(
  "pagehide",
  () => {
    (clearInterval(X),
      (L = !0),
      (l = 0),
      g?.stop(),
      M?.close().catch(() => {}));
  },
  { once: !0 },
),
  document.addEventListener("visibilitychange", () => {
    document.hidden && ((l = 0), g?.stop(), c());
  }),
  S(),
  x(null),
  await P());
