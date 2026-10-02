// Owner decision 2026-10-02: no analytics for European visitors. Each page's
// analytics bootstrap is executed in a sandbox per time zone; in Europe (or
// when the zone is unreadable, or GPC / Do Not Track is set) nothing may reach
// Google: no script element, no dataLayer entry, no cookie.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));
const PAGES = [
  "translations/index.html",
  "translations/guide/index.html",
  "mosaic/index.html",
  "translators/index.html",
];
const GENERATORS = ["docs/build-translators-page.mjs"];

function bootstrapOf(file) {
  const source = readFileSync(join(root, file), "utf8");
  const id = source.match(/const GA_ID=("[^"]*"|null);/);
  const start = source.indexOf("window.dataLayer=window.dataLayer||[];");
  const endMatch = source.slice(start).match(/function track\(name,params\)\{[^\n]*\}\n/);
  assert.ok(id && start > 0 && endMatch, `${file}: analytics bootstrap not found`);
  const body = source.slice(start, start + endMatch.index + endMatch[0].length);
  return `const GA_ID=${id[1]};\n${body}`;
}

function run(file, { timeZone, intl, navigator = {}, windowProps = {} }) {
  const created = [];
  const appended = [];
  const cookies = [];
  const document = {
    createElement: (tag) => {
      const el = { tagName: tag };
      created.push(el);
      return el;
    },
    head: { appendChild: (el) => appended.push(el) },
    body: { appendChild: (el) => appended.push(el) },
    getElementById: () => null,
    addEventListener: () => {},
    readyState: "complete",
    documentElement: { lang: "en" },
  };
  Object.defineProperty(document, "cookie", {
    get: () => "",
    set: (value) => cookies.push(value),
  });
  const sandbox = { document, navigator, ...windowProps };
  // A fresh vm context has its own built-in Intl, so "missing" must be explicit.
  sandbox.Intl =
    intl === "missing"
      ? undefined
      : (intl ?? { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) });
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(bootstrapOf(file), sandbox);
  vm.runInContext("track('probe_event',{probe:1})", sandbox);
  const toGoogle = appended.filter((el) => /google/i.test(String(el.src ?? "")));
  // JSON round-trip: values built inside the vm realm fail deepStrictEqual otherwise.
  const dataLayer = JSON.parse(
    JSON.stringify(Array.from(sandbox.dataLayer, (entry) => Array.from(entry))),
  );
  return { created, toGoogle, cookies, dataLayer };
}

const BLOCKED = {
  "Europe/Paris": { timeZone: "Europe/Paris" },
  "Europe/London": { timeZone: "Europe/London" },
  "Asia/Nicosia": { timeZone: "Asia/Nicosia" },
  "Asia/Famagusta": { timeZone: "Asia/Famagusta" },
  "Indian/Reunion": { timeZone: "Indian/Reunion" },
  "Indian/Mayotte": { timeZone: "Indian/Mayotte" },
  "America/Cayenne": { timeZone: "America/Cayenne" },
  "America/Guadeloupe": { timeZone: "America/Guadeloupe" },
  "America/Martinique": { timeZone: "America/Martinique" },
  "America/Marigot": { timeZone: "America/Marigot" },
  "Atlantic/Canary": { timeZone: "Atlantic/Canary" },
  "Atlantic/Madeira": { timeZone: "Atlantic/Madeira" },
  "Atlantic/Azores": { timeZone: "Atlantic/Azores" },
  "Atlantic/Reykjavik": { timeZone: "Atlantic/Reykjavik" },
  "Africa/Ceuta": { timeZone: "Africa/Ceuta" },
  "lower-case europe/berlin": { timeZone: "europe/berlin" },
  "UTC (no location)": { timeZone: "UTC" },
  "Etc/UTC (no location)": { timeZone: "Etc/UTC" },
  "legacy alias Poland": { timeZone: "Poland" },
  "undefined time zone": { timeZone: undefined },
  "empty time zone": { timeZone: "" },
  "Intl throws": {
    intl: {
      DateTimeFormat: () => {
        throw new Error("blocked");
      },
    },
  },
  "Intl missing": { intl: "missing" },
  "New York with Global Privacy Control": {
    timeZone: "America/New_York",
    navigator: { globalPrivacyControl: true },
  },
  "New York with Do Not Track": { timeZone: "America/New_York", navigator: { doNotTrack: "1" } },
  "New York with legacy window.doNotTrack": {
    timeZone: "America/New_York",
    windowProps: { doNotTrack: "1" },
  },
};
const ALLOWED = ["America/New_York", "Asia/Tokyo", "Australia/Sydney", "America/Sao_Paulo"];

for (const page of PAGES) {
  for (const [label, options] of Object.entries(BLOCKED)) {
    test(`${page}: nothing reaches Google — ${label}`, () => {
      const result = run(page, options);
      assert.deepEqual(result.created, [], "no element may be created");
      assert.deepEqual(result.dataLayer, [], "dataLayer must stay empty, track() a no-op");
      assert.deepEqual(result.cookies, [], "no cookie may be written");
    });
  }
  for (const timeZone of ALLOWED) {
    test(`${page}: tag loads outside Europe — ${timeZone}`, () => {
      const result = run(page, { timeZone });
      assert.equal(result.toGoogle.length, 1);
      assert.equal(
        result.toGoogle[0].src,
        "https://www.googletagmanager.com/gtag/js?id=G-K0V3J9TLBF",
      );
      const consent = result.dataLayer.filter((e) => e[0] === "consent");
      assert.deepEqual(consent, [
        [
          "consent",
          "default",
          {
            analytics_storage: "granted",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
          },
        ],
      ]);
      const config = result.dataLayer.find((e) => e[0] === "config");
      assert.equal(config[1], "G-K0V3J9TLBF");
      assert.equal(config[2].cookie_prefix, "skm");
      assert.deepEqual(result.dataLayer.at(-1), ["event", "probe_event", { probe: 1 }]);
    });
  }
}

test("every page and generator carries the same rule", () => {
  const rule = (file) => {
    const source = readFileSync(join(root, file), "utf8");
    const start = source.indexOf("const EUROPEAN_ZONES_OUTSIDE_EUROPE=");
    const end = source.indexOf("const ANALYTICS_ON=");
    assert.ok(start > 0 && end > start, `${file}: shared rule not found`);
    return source.slice(start, end).replace(/^[ \t]+/gm, "");
  };
  const [first, ...rest] = [...PAGES, ...GENERATORS];
  for (const file of rest) assert.equal(rule(file), rule(first), `${file} drifted from ${first}`);
});

test("the consent banner is gone and Google's tag appears on no other page", () => {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      if (name === ".git" || name === "node_modules") return [];
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [relative(root, full)];
    });
  const files = walk(root).filter((f) => /\.(html|js)$/.test(f) && !f.startsWith("docs/"));
  assert.ok(!files.includes("assets/consent.js"), "assets/consent.js must be removed");
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /consent\.js|skm-consent/, `${file} still references the banner`);
    assert.doesNotMatch(source, /region:\s*\[/, `${file} still ships a region-scoped default`);
    if (!PAGES.includes(file)) {
      assert.doesNotMatch(
        source,
        /googletagmanager|google-analytics|\bgtag\b|\bG-[A-Z0-9]{8,}\b/,
        `${file} must not load analytics`,
      );
    }
  }
});
