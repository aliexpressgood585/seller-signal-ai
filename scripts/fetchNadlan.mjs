// scripts/fetchNadlan.mjs
// שולף עסקאות נדל"ן אמיתיות מ-nadlan.gov.il (רשות המסים) בזמן ה-build,
// ושומר אותן ל-src/lib/realDeals.json שנארז לתוך האפליקציה.
//
// nadlan.gov.il מגן על עצמו ב-WAF שחוסם בקשות שאינן דפדפן אמיתי (מחזיר דף
// HTML של challenge במקום JSON). לכן אנחנו טוענים את האתר בדפדפן Headless
// (Playwright), עוברים את ה-challenge, ומריצים את קריאות ה-API מתוך הדף
// עצמו (same-origin, עם ה-cookies של ה-WAF).
//
// זרימת ה-API:
//   1. POST /Nadlan.REST/Main/GetDataByQuery  { query: "<עיר>" }  → מתאר מיקום
//   2. POST /Nadlan.REST/Main/GetAssestAndDeals  <מתאר + PageNo>   → עסקאות
//
// הסקריפט תמיד יוצא בקוד 0 וכותב JSON תקין (אולי ריק) — כשל שליפה לא ישבור deploy.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const OUT = fileURLToPath(new URL("../src/lib/realDeals.json", import.meta.url));
const SITE = "https://www.nadlan.gov.il/";

const CITIES = [
  "תל אביב יפו",
  "גבעתיים",
  "רמת גן",
  "הרצליה",
  "פתח תקווה",
  "חולון",
];

const MAX_PER_CITY = 20;
const MAX_PAGES = 2;

function toNum(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeDeal(d, city) {
  const price = toNum(d.DEALAMOUNT);
  if (!price) return null;
  return {
    city,
    address: (d.FULLADRESS || "").trim() || null,
    price,
    date: (d.DEALDATETIME || d.DEALDATE || "").slice(0, 10) || null,
    rooms: toNum(d.ASSETROOMNUM),
    size: toNum(d.DEALNATURE),
    floor: d.FLOORNO != null ? String(d.FLOORNO).trim() : null,
    type: (d.DEALNATUREDESCRIPTION || "").trim() || null,
    yearBuilt: toNum(d.BUILDINGYEAR || d.YEARBUILT),
  };
}

// רץ בתוך הדפדפן: קורא ל-2 ה-endpoints ומחזיר את העסקאות הגולמיות של עיר אחת
async function fetchCityInPage(page, city, maxPages) {
  return page.evaluate(
    async ({ city, maxPages }) => {
      const BASE = "/Nadlan.REST/Main";
      const post = async (path, body) => {
        const res = await fetch(`${BASE}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        try {
          return { ok: res.ok, data: JSON.parse(text) };
        } catch {
          return { ok: false, data: null, snippet: text.slice(0, 100) };
        }
      };

      const loc = await post("GetDataByQuery", { query: city });
      if (!loc.ok || !loc.data) {
        return { error: `GetDataByQuery: ${loc.snippet || "no data"}` };
      }
      if (loc.data.DescLayerID == null && loc.data.X == null) {
        return { error: "no location descriptor", loc: loc.data };
      }

      const all = [];
      for (let page = 1; page <= maxPages; page++) {
        const d = await post("GetAssestAndDeals", { ...loc.data, PageNo: page });
        if (!d.ok || !d.data) break;
        const results = d.data.AllResults || d.data.dealDetails || [];
        if (!results.length) break;
        all.push(...results);
      }
      return { results: all };
    },
    { city, maxPages }
  );
}

async function main() {
  const byCity = {};
  let total = 0;

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "he-IL",
  });
  const page = await context.newPage();

  console.log("▶ loading nadlan.gov.il (passing WAF challenge)…");
  await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Imperva Incapsula מגיש דף challenge שמריץ JS (~5-8ש') ואז עושה reload.
  // ממתינים עד שהתוכן כבר אינו דף ה-challenge (או עד timeout), עם reload בין הניסיונות.
  const isChallenge = async () => {
    const html = await page.content();
    return /Incapsula|_Incapsula_Resource|Request unsuccessful|"Cache-Control" content="no-cache, no-store/i.test(html)
      || html.length < 2000;
  };
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(4000);
    if (!(await isChallenge())) {
      console.log(`  ✓ challenge cleared after ~${(i + 1) * 4}s`);
      break;
    }
    console.log(`  … still on challenge page, reloading (${i + 1})`);
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {}
  }
  await page.waitForTimeout(1500);
  console.log("  running API queries from browser context\n");

  for (const city of CITIES) {
    console.log(`▶ ${city}`);
    try {
      const out = await fetchCityInPage(page, city, MAX_PAGES);
      if (out.error) {
        console.log(`  ⚠ ${out.error}`);
        continue;
      }
      const deals = [];
      for (const r of out.results || []) {
        const nd = normalizeDeal(r, city);
        if (nd) deals.push(nd);
      }
      deals.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const trimmed = deals.slice(0, MAX_PER_CITY);
      if (trimmed.length) {
        byCity[city] = trimmed;
        total += trimmed.length;
      }
      console.log(`  ✓ ${trimmed.length} deals`);
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
    }
  }

  await browser.close();

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "nadlan.gov.il (רשות המסים)",
    total,
    byCity,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `\n═══ wrote ${total} deals across ${Object.keys(byCity).length} cities → ${OUT}`
  );
}

main().catch((e) => {
  console.error("fetchNadlan failed (non-fatal):", e.message);
  process.exit(0);
});
