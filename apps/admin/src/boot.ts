// @ts-nocheck
const TOKEN_KEY = "superwin.admin.token";

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
    if (location.pathname !== "/admin/login") location.href = "/admin/login";
  }
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request denied");
  return data;
}

function page() {
  const path = location.pathname.replace(/\/$/, "") || "/admin";
  if (path === "/admin") return "/admin/dashboard";
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
    const data = await api("/api/admin/dashboard");
    who.textContent = `${data.username} · house ${data.house_balance}`;
  } catch (_error) {
    who.textContent = "Guest";
  }
}

function connectLive() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || window.__signalSocket) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws/admin?token=${encodeURIComponent(token)}`);
  window.__signalSocket = socket;
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
  const tier = sessionStorage.getItem("superwin.admin.tier");
  document.querySelectorAll("nav a").forEach((link) => {
    const href = link.getAttribute("href");
    const active = href === location.pathname || (current === "/admin/dashboard" && (href === "/admin" || href === "/admin/dashboard"));
    link.setAttribute("aria-current", active ? "page" : "false");
    const desk = link.dataset.desk;
    if (desk === "financial") link.hidden = tier !== "financial" && tier !== "superadmin";
    if (desk === "support") link.hidden = tier !== "support" && tier !== "superadmin";
  });
  let html = "";
  if (location.pathname === "/admin/login") {
    html = shell("Admin login", `<form data-action="login"><label>Username<input name="username"></label><label>Password<input type="password" name="password"></label><button>Enter control room</button></form><p>Demo account: admin / admin123</p>`);
  } else if (!sessionStorage.getItem(TOKEN_KEY)) {
    html = shell("Sign in required", `<p><a href="/admin/login">Open the admin login</a></p>`);
  } else if (current === "/admin/dashboard") {
    const data = await api("/api/admin/dashboard");
    html = shell("Admin dashboard", `<div class="cards"><article class="card">Players ${esc(data.players)}</article><article class="card">Agents ${esc(data.agents)}</article><article class="card">Pending ${esc(data.pending_withdrawals)}</article><article class="card">House ${esc(data.house_balance)}</article><article class="card">Open events ${esc(data.open_events)}</article></div>`);
  } else if (current === "/admin/players") {
    const data = await api("/api/admin/players");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.email)}</td><td>${esc(row.balance)}</td><td>${esc(row.agent_id)}</td></tr>`).join("");
    html = shell("All players", `<table><tr><th>Name</th><th>Email</th><th>Balance</th><th>Agent</th></tr>${rows}</table>`);
  } else if (current === "/admin/agents") {
    const data = await api("/api/admin/agents");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.email)}</td><td>${esc(row.balance)}</td></tr>`).join("");
    html = shell("Agents", `<table>${rows}</table><form data-action="create-agent"><label>Username<input name="username"></label><label>Email<input name="email"></label><label>Password<input name="password" type="password"></label><button>Create agent</button></form>`);
  } else if (current === "/admin/transactions") {
    const data = await api("/api/admin/transactions");
    const rows = data.items.map((row) => `<tr><td>${esc(row.reason)}</td><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Ledger", `<table>${rows}</table>`);
  } else if (current === "/admin/deposits") {
    const data = await api("/api/admin/deposits");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Deposits", `<table>${rows}</table>`);
  } else if (current === "/admin/withdrawals") {
    const data = await api("/api/admin/withdrawals");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.amount)}</td><td>${esc(row.status)}</td><td>${row.status === "pending" ? `<button data-approve="${row.id}">Approve</button> <button data-reject="${row.id}">Reject</button>` : ""}</td></tr>`).join("");
    html = shell("Withdrawals", `<table>${rows}</table>`);
  } else if (current === "/admin/sports") {
    const data = await api("/api/admin/sports");
    const rows = data.items.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.status)}</td><td>${esc(row.result || "")}</td><td>${row.status === "open" ? `<button data-settle="${row.id}" data-result="home">Home</button> <button data-settle="${row.id}" data-result="away">Away</button> <button data-settle="${row.id}" data-result="draw">Draw</button>` : ""}</td></tr>`).join("");
    html = shell("Sports control", `<table>${rows}</table>`);
  } else if (current === "/admin/casino") {
    const data = await api("/api/admin/casino");
    const rows = data.items.map((row) => `<tr><td>${esc(row.code)}</td><td>${esc(row.name)}</td><td>${esc(row.kind)}</td></tr>`).join("");
    html = shell("Casino catalog", `<table>${rows}</table>`);
  } else if (current === "/admin/providers") {
    const data = await api("/api/admin/providers");
    const rows = data.items.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.kind)}</td><td>${esc(row.status)}</td></tr>`).join("");
    html = shell("Providers", `<table>${rows}</table><form data-action="provider"><label>Name<input name="name"></label><label>Kind<select name="kind"><option>sports</option><option>casino</option></select></label><button>Save inactive provider</button></form>`);
  } else if (current === "/admin/commissions") {
    const data = await api("/api/admin/commissions");
    const rows = data.items.map((row) => `<tr><td>${esc(row.amount)}</td><td>${esc(row.reference)}</td></tr>`).join("");
    html = shell("Commissions", `<table>${rows}</table>`);
  } else if (current === "/admin/reports") {
    const data = await api("/api/admin/reports");
    html = shell("Platform report", `<div class="cards"><article class="card">Players ${esc(data.players)}</article><article class="card">Agents ${esc(data.agents)}</article><article class="card">Deposits ${esc(data.deposits)}</article><article class="card">House ${esc(data.house_balance)}</article></div>`);
  } else if (current === "/admin/gateway") {
    const data = await api("/api/admin/gateway");
    const rows = data.providers.map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.kind)}</td><td>${esc(row.status)}</td></tr>`).join("");
    html = shell("Gateway status", `<p>Check.et ${esc(data.checket)}. Telegram ${esc(data.telegram)}. Casino webhook ${esc(data.casino_webhook)}.</p><table>${rows}</table>`);
  } else if (current === "/admin/bans") {
    const data = await api("/api/admin/players");
    const rows = data.items.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.status)}</td><td><button data-status="${esc(row.username)}" data-next="${row.status === "banned" ? "active" : "banned"}">${row.status === "banned" ? "Restore" : "Ban"}</button></td></tr>`).join("");
    html = shell("User status", `<table><tr><th>Player</th><th>Status</th><th></th></tr>${rows}</table>`);
  } else if (current === "/admin/bets") {
    const data = await api("/api/admin/bets");
    const sports = data.sports.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.selection)}</td><td>${esc(row.stake)}</td><td>${esc(row.status)}</td></tr>`).join("");
    const casino = data.casino.map((row) => `<tr><td>${esc(row.username)}</td><td>${esc(row.game)}</td><td>${esc(row.stake)}</td><td>${esc(row.payout)}</td></tr>`).join("");
    html = shell("Bet history", `<h2>Sports</h2><table>${sports}</table><h2>Casino</h2><table>${casino}</table>`);
  } else if (current === "/admin/audit-logs") {
    const data = await api("/api/admin/audit-logs");
    const rows = data.items.map((row) => `<tr><td>${esc(row.action)}</td><td>${esc(row.detail)}</td></tr>`).join("");
    html = shell("Audit log", `<table>${rows}</table>`);
  } else if (current === "/admin/settings") {
    const data = await api("/api/admin/settings");
    const currentRate = (data.items.find((item) => item.key === "commission_rate") || {}).value || "";
    html = shell("Settings", `<form data-action="setting"><label>Commission rate<input name="value" value="${esc(currentRate)}"></label><button>Update rate</button></form>`);
  } else if (current === "/admin/permissions") {
    const data = await api("/api/admin/permissions");
    const rows = data.items.map((row) => `<tr><td>${esc(row.role)}</td><td>${esc(row.action)}</td><td>${row.allowed ? "open" : "closed"}</td><td><button data-perm-role="${esc(row.role)}" data-perm-action="${esc(row.action)}" data-perm-allowed="${row.allowed ? "false" : "true"}">${row.allowed ? "Close" : "Open"}</button></td></tr>`).join("");
    html = shell("Permissions", `<table>${rows}</table>`);
  } else {
    html = shell("Superwin Control", `<p>Unknown control page.</p>`);
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
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ ...body, portal: "admin" }) });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem("superwin.admin.tier", data.tier);
      location.href = "/admin/dashboard";
      return;
    }
    if (form.dataset.action === "create-agent") {
      await api("/api/admin/agents", { method: "POST", body: JSON.stringify(body) });
      await draw();
      return;
    }
    if (form.dataset.action === "provider") {
      await api("/api/admin/providers", { method: "POST", body: JSON.stringify(body) });
      await draw();
      return;
    }
    if (form.dataset.action === "setting") {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ key: "commission_rate", value: body.value }) });
      await draw();
    }
  } catch (err) {
    error.textContent = err.message;
  }
});

document.getElementById("view").addEventListener("click", async (event) => {
  const error = document.getElementById("error");
  try {
    const approve = event.target.closest("[data-approve]");
    if (approve) {
      await api(`/api/admin/withdrawals/${approve.dataset.approve}/approve`, { method: "POST" });
      await draw();
    }
    const reject = event.target.closest("[data-reject]");
    if (reject) {
      await api(`/api/admin/withdrawals/${reject.dataset.reject}/reject`, { method: "POST" });
      await draw();
    }
    const settle = event.target.closest("[data-settle]");
    if (settle) {
      await api(`/api/admin/sports/${settle.dataset.settle}/settle`, { method: "POST", body: JSON.stringify({ result: settle.dataset.result }) });
      await draw();
    }
    const perm = event.target.closest("[data-perm-action]");
    if (perm) {
      await api("/api/admin/permissions", { method: "POST", body: JSON.stringify({ role: perm.dataset.permRole, action: perm.dataset.permAction, allowed: perm.dataset.permAllowed === "true" }) });
      await draw();
    }
    const status = event.target.closest("[data-status]");
    if (status) {
      await api("/api/admin/users/status", { method: "POST", body: JSON.stringify({ username: status.dataset.status, status: status.dataset.next }) });
      await draw();
    }
    if (event.target.id === "logout") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem("superwin.admin.tier");
      location.href = "/admin/login";
    }
  } catch (err) {
    if (error) error.textContent = err.message;
  }
});

draw().then(refreshWho);
