// @ts-nocheck
const TOKEN_KEY = "superwin.agent.token";

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
  if (response.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    if (location.pathname !== "/agent/login") location.href = "/agent/login";
  }
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request denied");
  return data;
}

function page() {
  const path = location.pathname.replace(/\/$/, "") || "/agent";
  if (path === "/agent") return "/agent/dashboard";
  return path;
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
    const data = await api("/api/agent/dashboard");
    who.textContent = `${data.username} · float ${data.balance}`;
  } catch (_error) {
    who.textContent = "Guest";
  }
}

function connectLive() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || window.__fieldSocket) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws/agent?token=${encodeURIComponent(token)}`);
  window.__fieldSocket = socket;
  socket.onmessage = (event) => {
    const list = document.getElementById("live");
    if (!list) return;
    const item = document.createElement("li");
    item.textContent = event.data;
    list.prepend(item);
  };
}

async function draw() {
  const current = page();
  document.querySelectorAll("nav a").forEach((link) => {
    const href = link.getAttribute("href");
    const active = href === location.pathname || (current === "/agent/dashboard" && (href === "/agent" || href === "/agent/dashboard"));
    link.setAttribute("aria-current", active ? "page" : "false");
  });
  let html = "";
  if (location.pathname === "/agent/login") {
    html = shell("Agent login", `<form data-action="login"><label>Username<input name="username"></label><label>Password<input type="password" name="password"></label><button>Open the desk</button></form><p>Demo account: agent / agent123</p>`);
  } else if (!sessionStorage.getItem(TOKEN_KEY)) {
    html = shell("Sign in required", `<p><a href="/agent/login">Open the agent login</a></p>`);
  } else if (current === "/agent/dashboard") {
    const data = await api("/api/agent/dashboard");
    html = shell("Agent dashboard", `<div class="cards"><article class="card"><h2>Players</h2><p>${esc(data.players)}</p></article><article class="card"><h2>Float</h2><p>${esc(data.balance)}</p></article><article class="card"><h2>Commission</h2><p>${esc(data.commission_total)}</p></article><article class="card"><h2>Pending</h2><p>${esc(data.pending_withdrawals)}</p></article></div>`);
  } else if (current === "/agent/players") {
    const data = await api("/api/agent/players");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.email)}</td><td>${esc(row.balance)}</td></tr>`).join("");
    html = shell("Players", `<table><tr><th>Name</th><th>Email</th><th>Balance</th></tr>${rows}</table>`);
  } else if (current === "/agent/players/create") {
    html = shell("Create player", `<form data-action="create-player"><label>Username<input name="username"></label><label>Email<input name="email"></label><label>Password<input name="password" type="password"></label><button>Create player</button></form>`);
  } else if (current === "/agent/balance") {
    const data = await api("/api/agent/balance");
    const rows = data.items.map((row) => `<tr><td>${esc(row.direction)}</td><td>${esc(row.reason)}</td><td>${esc(row.amount)}</td></tr>`).join("");
    html = shell("Agent float", `<p>${esc(data.balance)}</p><table>${rows}</table>`);
  } else if (current === "/agent/deposits") {
    const data = await api("/api/agent/deposits");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Player deposits", `<table>${rows}</table>`);
  } else if (current === "/agent/withdrawals") {
    const data = await api("/api/agent/withdrawals");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.amount)}</td><td>${esc(row.status)}</td></tr>`).join("");
    html = shell("Player withdrawals", `<table>${rows}</table>`);
  } else if (current === "/agent/transactions") {
    const data = await api("/api/agent/transactions");
    const rows = data.items.map((row) => `<tr><td>${esc(row.reason)}</td><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Transactions", `<table>${rows}</table>`);
  } else if (current === "/agent/commissions") {
    const data = await api("/api/agent/commissions");
    const rows = data.items.map((row) => `<tr><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Commissions", `<table>${rows}</table>`);
  } else if (current === "/agent/sub-agents") {
    const data = await api("/api/agent/sub-agents");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.email)}</td></tr>`).join("");
    html = shell("Sub-agents", `<table>${rows}</table><form data-action="create-sub"><label>Username<input name="username"></label><label>Email<input name="email"></label><label>Password<input name="password" type="password"></label><button>Add sub-agent</button></form>`);
  } else if (current === "/agent/reports") {
    const data = await api("/api/agent/reports");
    html = shell("Report", `<div class="cards"><article class="card">Players ${esc(data.players)}</article><article class="card">Deposits ${esc(data.deposits)}</article><article class="card">Stakes ${esc(data.stakes)}</article><article class="card">Commission ${esc(data.commission)}</article></div>`);
  } else if (current === "/agent/notifications") {
    const data = await api("/api/agent/notifications");
    const items = data.items.map((row) => `<li>${esc(row.title)} — ${esc(row.body)}</li>`).join("");
    html = shell("Notifications", `<ul>${items}</ul>`);
  } else if (current === "/agent/profile") {
    const data = await api("/api/agent/profile");
    html = shell("Profile", `<form data-action="profile"><label>Email<input name="email" value="${esc(data.email)}"></label><button>Save</button></form><p><button id="logout" type="button">Log out</button></p>`);
  } else {
    html = shell("Superwin Agents", `<p>Unknown desk page.</p>`);
  }
  document.getElementById("view").innerHTML = html;
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
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ ...body, portal: "agent" }) });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      location.href = "/agent/dashboard";
      return;
    }
    if (form.dataset.action === "create-player") {
      await api("/api/agent/players", { method: "POST", body: JSON.stringify(body) });
      location.href = "/agent/players";
      return;
    }
    if (form.dataset.action === "create-sub") {
      await api("/api/agent/sub-agents", { method: "POST", body: JSON.stringify(body) });
      await draw();
      return;
    }
    if (form.dataset.action === "profile") {
      await api("/api/agent/profile", { method: "POST", body: JSON.stringify({ email: body.email }) });
    }
    await refreshWho();
  } catch (err) {
    error.textContent = err.message;
  }
});

document.getElementById("view").addEventListener("click", (event) => {
  if (event.target.id === "logout") {
    sessionStorage.removeItem(TOKEN_KEY);
    location.href = "/agent/login";
  }
});

draw().then(refreshWho);
