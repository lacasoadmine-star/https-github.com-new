// Isolated smoke tests. Never call production APIs, databases, or wallets.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const portals = ["player", "agent", "admin"];
const read = (p) => readFileSync(path.join(process.cwd(), p), "utf8");

function startPortal(portal, pathname, startingToken = null) {
  const requests = [];
  const listeners = {};
  const state = new Map();
  if (startingToken) state.set("superwin." + portal + ".token", startingToken);

  const view = {
    innerHTML: "",
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const elements = new Map([
    ["view", view], ["who", { textContent: "" }], ["error", { textContent: "" }],
  ]);
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: "", value: "" });
      return elements.get(id);
    },
    querySelectorAll() { return []; },
    createElement() { return { textContent: "" }; },
  };
  const sessionStorage = {
    getItem(key) { return state.has(key) ? state.get(key) : null; },
    setItem(key, value) { state.set(key, String(value)); },
    removeItem(key) { state.delete(key); },
  };
  const location = { pathname, href: pathname, host: "example.test", protocol: "https:" };
  const window = {};
  class MockWebSocket { constructor(url) { this.url = url; } }
  class MockFormData {
    constructor(form) { this.values = Object.entries(form.fields || {}); }
    entries() { return this.values[Symbol.iterator](); }
  }
  async function fetch(url, options = {}) {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        if (url === "/api/auth/login") return { token: "fresh-test-token", tier: "master" };
        return {
          username: "sample", balance: "0", house_balance: "0", players: 0,
          open_bets: 0, unread: 0, commission_total: "0", pending_withdrawals: 0,
        };
      },
    };
  }
  runInNewContext(read("apps/" + portal + "/src/boot.ts"), {
    document, sessionStorage, location, window, WebSocket: MockWebSocket,
    FormData: MockFormData, fetch, console,
  }, { filename: "apps/" + portal + "/src/boot.ts" });
  return {
    requests, view, listeners, location, sessionStorage,
    flush: () => new Promise((resolve) => setImmediate(resolve)),
  };
}

for (const portal of portals) {
  test(portal + ": login uses scoped auth and redirects", async () => {
    const app = startPortal(portal, "/" + portal + "/login");
    await app.flush();
    assert.match(app.view.innerHTML, /data-action="login"/);
    const form = { dataset: { action: "login" }, fields: { username: "sample", password: "test-secret" } };
    let prevented = false;
    await app.listeners.submit({
      target: { closest: () => form },
      preventDefault() { prevented = true; },
    });
    assert.equal(prevented, true);
    const login = app.requests.find((request) => request.url === "/api/auth/login");
    assert.ok(login, "login API should be called");
    assert.equal(login.options.method, "POST");
    assert.deepEqual(JSON.parse(login.options.body), {
      username: "sample", password: "test-secret", portal,
    });
    assert.equal(app.sessionStorage.getItem("superwin." + portal + ".token"), "fresh-test-token");
    assert.equal(app.location.href, portal === "player" ? "/player" : "/" + portal + "/dashboard");
  });

  test(portal + ": dashboard sends bearer token to the correct API", async () => {
    const page = portal === "player" ? "/player" : "/" + portal + "/dashboard";
    const app = startPortal(portal, page, "existing-test-token");
    await app.flush();
    const dashboard = app.requests.filter((request) => request.url === "/api/" + portal + "/dashboard");
    assert.ok(dashboard.length >= 1, "dashboard API should be called");
    assert.ok(dashboard.every((request) => request.options.headers?.Authorization === "Bearer existing-test-token"),
      "dashboard requests must carry the scoped token");
    assert.match(app.view.innerHTML, /dashboard/i);
  });

  test(portal + ": navigation declarations and Vite base remain aligned", () => {
    const html = read("apps/" + portal + "/index.html");
    const routesSource = read("apps/" + portal + "/src/pages/routes.ts");
    const config = read("apps/" + portal + "/vite.config.ts");
    const routes = new Set([...routesSource.matchAll(/"\/(?:player|agent|admin)[^"]*"/g)].map(([s]) => s.slice(1, -1)));
    const hrefs = [...html.matchAll(/href="(\/(?:player|agent|admin)[^"]*)"/g)].map((match) => match[1]);
    assert.ok(hrefs.length >= 5, "portal should retain its navigation");
    for (const href of hrefs) {
      assert.ok(href.startsWith("/" + portal), "cross-portal navigation: " + href);
      assert.ok(routes.has(href), "missing route declaration: " + href);
    }
    assert.match(config, new RegExp("base:\\s*[\"']/" + portal + "/[\"']"));
  });
}

test("package manifests and lockfile match secure Vite/esbuild versions", () => {
  const lock = JSON.parse(read("package-lock.json"));
  const vite = lock.packages["node_modules/vite"];
  const esbuild = lock.packages["node_modules/esbuild"];
  assert.ok(vite && esbuild, "Vite and esbuild must be resolved in the lockfile");
  const [vm, vn, vp] = vite.version.split(".").map(Number);
  const [em, en] = esbuild.version.split(".").map(Number);
  assert.ok(vm > 6 || (vm === 6 && (vn > 4 || (vn === 4 && vp >= 5))),
    "Vite version below required baseline: " + vite.version);
  assert.ok(em > 0 || en >= 25, "esbuild version is vulnerable: " + esbuild.version);
  assert.match(vite.dependencies?.esbuild || "", /^\^0\.25\.0$|^\^0\.(2[6-9]|[3-9]\d)\./);
  for (const portal of portals) {
    const manifest = JSON.parse(read("apps/" + portal + "/package.json"));
    assert.equal(manifest.devDependencies.vite, "^6.4.5");
    assert.equal(lock.packages["apps/" + portal].devDependencies.vite, manifest.devDependencies.vite);
  }
});
