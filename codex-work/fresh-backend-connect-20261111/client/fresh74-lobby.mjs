import { freshSymbol as u } from "./fresh74-art.mjs?v=r18";
let y;
try {
  const e = await fetch("/api/slots/games/fresh_multihot10", {
    credentials: "same-origin",
    cache: "no-store",
  });
  e.ok && (y = await e.json());
} catch {}
if (y?.id === "fresh_multihot10") {
  const releaseReady = y.freshReleaseReady === true && y.enabled === true;
  const e = document.createElement("article");
  ((e.className = "portal-r9-card fresh74-card"),
    (e.dataset.fresh74 = "multihot10"));
  const n = document.createElement("button");
  ((n.type = "button"),
    n.setAttribute("aria-label", "Open Fresh Multi Hot 10"),
    (n.innerHTML =
      '<span class="fresh74-badge">CUSUB \xB7 DHISME GOONI AH</span><strong>MULTI HOT <b>10</b></strong><div class="fresh74-card-symbols">' +
      u("seven") +
      u("bell") +
      u("watermelon") +
      "</div><span>" + (releaseReady ? "PLAY · ETB" : "FUR · WALLET ETB") + "</span>"),
    e.append(n));
  const a = document.createElement("dialog");
  ((a.className = "fresh74-sheet"),
    a.setAttribute("aria-label", "Fresh Multi Hot 10"));
  const m = document.createElement("header"),
    h = document.createElement("h2"),
    s = document.createElement("button");
  ((h.textContent = "Multi Hot 10 \xB7 Dhisme cusub"),
    (s.textContent = "\xD7"),
    s.setAttribute("aria-label", "Close fresh machine"),
    m.append(h, s));
  const r = document.createElement("div");
  r.className = "fresh74-intro";
  const p = document.createElement("p");
  p.textContent = releaseReady
    ? "Mashiinkan wuxuu isticmaalaa backend-ka iyo wallet-ka ETB ee akoonkaaga jira."
    : "Wallet-ka iyo taariikhda waxay ku xiran yihiin akoonkaaga ETB ee jira. Sharadka mashiinkan cusub weli waa xiran yahay.";
  const c = document.createElement("button");
  c.textContent = releaseReady ? "PLAY · CUSUB" : "FUR AKOONKA · ETB";
  const o = document.createElement("a");
  ((o.href = "https://www.smartsoftgaming.com/games/multi-hot-10-2"),
    (o.textContent = "Demo-ga rasmiga ah"),
    (o.target = "_blank"),
    (o.rel = "noopener noreferrer"),
    r.append(p, c, o));
  const t = document.createElement("iframe");
  ((t.title = "Fresh Multi Hot 10 · ETB"),
    (t.hidden = !0),
    (t.allow = "autoplay"),
    a.append(m, r, t),
    (n.onclick = () => {
      (a.isConnected || document.body.append(a), a.showModal());
    }),
    (s.onclick = () => a.close()),
    (c.onclick = () => {
      ((t.src = "/independent74/fresh74.html"),
        (t.hidden = !1),
        (r.hidden = !0),
        t.focus());
    }),
    a.addEventListener("close", () => {
      (t.removeAttribute("src"), (t.hidden = !0), (r.hidden = !1), n.focus());
    }));
  let l = !1;
  const f = () => {
      l = !1;
      const d = document.querySelector(
        "main.player-main #portal-r9-gallery .portal-r9-grid",
      );
      if (!d) return;
      const b = (document.querySelector("#portal-r9-search")?.value ?? "")
        .trim()
        .toLowerCase();
      (e.parentElement !== d && d.append(e),
        (e.hidden = !!b && !"multi hot 10 fresh cusub".includes(b)));
    },
    i = () => {
      l || ((l = !0), requestAnimationFrame(f));
    };
  (new MutationObserver(i).observe(document.body, {
    childList: !0,
    subtree: !0,
  }),
    document.addEventListener("input", i),
    document.addEventListener("click", i),
    f());
}
