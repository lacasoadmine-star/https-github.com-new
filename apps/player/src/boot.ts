// @ts-nocheck
const TOKEN_KEY = "superwin.player.token";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function headers() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const base = { "Content-Type": "application/json" };
  if (token) base.Authorization = "Bearer " + token;
  return base;
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) sessionStorage.removeItem(TOKEN_KEY);
    const message = typeof data.detail === "string" ? data.detail : "Request denied";
    if (response.status === 401 && location.pathname !== "/player/login") location.href = "/player/login";
    throw new Error(message);
  }
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
  }
  return data;
}

function page() {
  const path = location.pathname.replace(/\/$/, "") || "/player";
  return path === "/player" ? "/player" : path;
}

function shell(title, inner) {
  return `<h1>${esc(title)}</h1><p id="error" class="error"></p>${inner}<ul id="live"></ul>`;
}

async function refreshWho() {
  const who = document.getElementById("who");
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    who.textContent = "Guest";
    return;
  }
  try {
    const data = await api("/api/player/dashboard");
    who.textContent = `${data.username} · ${data.balance}`;
  } catch (_error) {
    who.textContent = "Guest";
  }
}

function connectLive() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || window.__superwinPlayerSocket) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws/player?token=${encodeURIComponent(token)}`);
  window.__superwinPlayerSocket = socket;
  socket.onmessage = (event) => {
    const list = document.getElementById("live");
    if (!list) return;
    const item = document.createElement("li");
    item.textContent = event.data;
    list.prepend(item);
  };
}

async function draw() {
  const view = document.getElementById("view");
  const current = page();
  document.querySelectorAll("nav a").forEach((link) => {
    link.setAttribute("aria-current", link.getAttribute("href") === current ? "page" : "false");
  });
  let html = "";
  if (current === "/player/login") {
    html = shell("Player login", `<form data-action="login"><label>Username<input name="username" autocomplete="username"></label><label>Password<input name="password" type="password" autocomplete="current-password"></label><button>Enter Superwin</button></form><p>Demo account: player / play123</p>`);
  } else if (current === "/player/register") {
    html = shell("Create player", `<form data-action="register"><label>Username<input name="username"></label><label>Email<input name="email"></label><label>Password<input name="password" type="password"></label><button>Register</button></form>`);
  } else if (!sessionStorage.getItem(TOKEN_KEY)) {
    html = shell("Sign in required", `<p><a href="/player/login">Open the player login</a></p>`);
  } else if (current === "/player") {
    const data = await api("/api/player/dashboard");
    html = shell("Player dashboard", `<div class="cards"><article class="card"><h2>Balance</h2><p id="balance">${esc(data.balance)}</p></article><article class="card"><h2>Open bets</h2><p>${esc(data.open_bets)}</p></article><article class="card"><h2>Unread</h2><p>${esc(data.unread)}</p></article></div>`);
  } else if (current === "/player/sports" || current === "/player/live") {
    const data = await api(current === "/player/live" ? "/api/player/sports?live=true" : "/api/player/sports?live=false");
    const rows = data.items.map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.league)}</td><td><button class="odds" data-bet="${item.id}" data-selection="home">${esc(item.odds.home)}</button> <button class="odds" data-bet="${item.id}" data-selection="away">${esc(item.odds.away)}</button> <button class="odds" data-bet="${item.id}" data-selection="draw">${esc(item.odds.draw)}</button></td></tr>`).join("");
    html = shell(current === "/player/live" ? "Live board" : "Sports", `<label>Stake<input id="stake" value="10"></label><table><tr><th>Event</th><th>League</th><th>Home / Away / Draw</th></tr>${rows}</table>`);
  } else if (current === "/player/bets") {
    const data = await api("/api/player/bets");
    const sports = data.sports.map((row) => `<tr><td>${esc(row.selection)}</td><td>${esc(row.stake)}</td><td>${esc(row.odds)}</td><td>${esc(row.status)}</td></tr>`).join("");
    const casino = data.casino.map((row) => `<tr><td>${esc(row.game)}</td><td>${esc(row.stake)}</td><td>${esc(row.payout)}</td></tr>`).join("");
    html = shell("My bets", `<h2>Sports</h2><table>${sports}</table><h2>Casino</h2><table>${casino}</table>`);
  } else if (current === "/player/casino") {
    const data = await api("/api/player/casino");
    const rows = data.items.map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.kind)}</td><td><button data-play="${esc(item.code)}">Play</button></td></tr>`).join("");
    html = shell("Casino", `<label>Stake<input id="stake" value="5"></label><table>${rows}</table>`);
  } else if (current === "/player/wallet") {
    const data = await api("/api/player/wallet");
    const rows = data.items.map((row) => `<tr><td>${esc(row.direction)}</td><td>${esc(row.reason)}</td><td>${esc(row.amount)}</td></tr>`).join("");
    html = shell("Wallet", `<p id="balance">${esc(data.balance)}</p><table>${rows}</table>`);
  } else if (current === "/player/deposit") {
    html = shell("Deposit", `<p>Send ETB to Telebirr <strong>0999999138</strong>, then enter the receipt reference.</p><form data-action="deposit"><label>Amount<input name="amount" value="100"></label><label>Transaction reference<input name="client_reference" autocomplete="off"></label><button>Verify deposit</button></form><p id="balance"></p>`);
  } else if (current === "/player/withdraw") {
    html = shell("Withdraw", `<form data-action="withdraw"><label>Amount<input name="amount" value="25"></label><button>Request withdrawal</button></form><p id="balance"></p>`);
  } else if (current === "/player/history") {
    const data = await api("/api/player/history");
    const deposits = data.deposits.map((row) => `<li>${esc(row.amount)} ${esc(row.reference)}</li>`).join("");
    const withdrawals = data.withdrawals.map((row) => `<li>${esc(row.amount)} ${esc(row.status)}</li>`).join("");
    html = shell("History", `<h2>Deposits</h2><ul>${deposits}</ul><h2>Withdrawals</h2><ul>${withdrawals}</ul>`);
  } else if (current === "/player/notifications") {
    const data = await api("/api/player/notifications");
    const items = data.items.map((row) => `<li>${esc(row.title)} — ${esc(row.body)}</li>`).join("");
    html = shell("Notifications", `<button id="mark-read">Mark read</button><ul>${items}</ul>`);
  } else if (current === "/player/profile") {
    const data = await api("/api/player/profile");
    html = shell("Profile", `<form data-action="profile"><label>Email<input name="email" value="${esc(data.email)}"></label><button>Save</button></form><p><button id="logout" type="button">Log out</button></p>`);
  } else {
    html = shell("Superwin", `<p>This page is not on the player board.</p>`);
  }
  view.innerHTML = html;
  connectLive();
}

document.getElementById("view").addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form).entries());
  const error = document.getElementById("error");
  try {
    if (form.dataset.action === "login") {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ ...body, portal: "player" }) });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      location.href = "/player";
      return;
    }
    if (form.dataset.action === "register") {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
      location.href = "/player/login";
      return;
    }
    if (form.dataset.action === "deposit") {
      const data = await api("/api/player/deposit", { method: "POST", body: JSON.stringify({ amount: body.amount, client_reference: body.client_reference, channel: body.client_reference ? "telebirr" : "local" }) });
      document.getElementById("balance").textContent = data.balance;
    }
    if (form.dataset.action === "withdraw") {
      const data = await api("/api/player/withdraw", { method: "POST", body: JSON.stringify({ amount: body.amount }) });
      document.getElementById("balance").textContent = data.balance + " " + data.status;
    }
    if (form.dataset.action === "profile") {
      await api("/api/player/profile", { method: "POST", body: JSON.stringify({ email: body.email }) });
    }
    await refreshWho();
  } catch (err) {
    error.textContent = err.message;
  }
});

document.getElementById("view").addEventListener("click", async (event) => {
  const error = document.getElementById("error");
  try {
    const bet = event.target.closest("[data-bet]");
    if (bet) {
      const stake = document.getElementById("stake").value;
      const data = await api("/api/player/sports/bets", { method: "POST", body: JSON.stringify({ event_id: Number(bet.dataset.bet), selection: bet.dataset.selection, stake }) });
      error.textContent = "Bet accepted. Balance " + data.balance;
      await refreshWho();
    }
    const play = event.target.closest("[data-play]");
    if (play) {
      const stake = document.getElementById("stake").value;
      const data = await api("/api/player/casino/play", { method: "POST", body: JSON.stringify({ game_code: play.dataset.play, stake }) });
      error.textContent = "Payout " + data.payout + ". Balance " + data.balance;
      await refreshWho();
    }
    if (event.target.id === "mark-read") {
      await api("/api/player/notifications/read", { method: "POST" });
      await draw();
    }
    if (event.target.id === "logout") {
      sessionStorage.removeItem(TOKEN_KEY);
      location.href = "/player/login";
    }
  } catch (err) {
    if (error) error.textContent = err.message;
  }
});

draw().then(refreshWho);
