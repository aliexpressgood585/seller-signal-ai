// scripts/fetchNadlan.mjs
// שולף עסקאות נדל"ן אמיתיות מ-nadlan.gov.il (רשות המסים) בזמן ה-build,
// ושומר אותן ל-src/lib/realDeals.json שנארז לתוך האפליקציה.
//
// הזרימה של ה-API (ידועה מהקהילה, אין API רשמי):
//   1. POST /Nadlan.REST/Main/GetDataByQuery  { query: "<עיר>" }  → מתאר מיקום
//   2. POST /Nadlan.REST/Main/GetAssestAndDeals  <מתאר המיקום>     → עסקאות
//
// הסקריפט תמיד יוצא בקוד 0 וכותב JSON תקין (אולי ריק) — כדי שכשל שליפה
// לא ישבור את ה-deploy. האפליקציה פשוט תציג עסקאות היכן שיש.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../src/lib/realDeals.json", import.meta.url));
const BASE = "https://www.nadlan.gov.il/Nadlan.REST/Main";

// הערים שמופיעות באפליקציה
const CITIES = [
  "תל אביב יפו",
  "גבעתיים",
  "רמת גן",
  "הרצליה",
  "פתח תקווה",
  "חולון",
];

const MAX_PER_CITY = 20;   // כמה עסקאות אחרונות לשמור לכל עיר
const MAX_PAGES = 2;       // כמה עמודים למשוך מ-nadlan לכל עיר

const HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  "Accept": "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Referer": "https://www.nadlan.gov.il/",
  "Origin": "https://www.nadlan.gov.il",
};

async function postJSON(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response on ${path}: ${text.slice(0, 120)}`);
  }
}

// מנקה מספר ("1,234,567" → 1234567)
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

async function fetchCity(city) {
  console.log(`\n▶ ${city}`);
  const loc = await postJSON("GetDataByQuery", { query: city });
  if (!loc || (loc.DescLayerID == null && loc.X == null)) {
    console.log(`  ⚠ no location descriptor for "${city}"`);
    return [];
  }
  console.log(`  location: DescLayerID=${loc.DescLayerID} X=${loc.X} Y=${loc.Y}`);

  const deals = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const req = { ...loc, PageNo: page };
    const data = await postJSON("GetAssestAndDeals", req);
    const results = data?.AllResults || data?.dealDetails || [];
    console.log(`  page ${page}: ${results.length} raw results`);
    if (!results.length) break;
    for (const r of results) {
      const nd = normalizeDeal(r, city);
      if (nd) deals.push(nd);
    }
  }

  // ממיין מהחדש לישן ומגביל
  deals.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const trimmed = deals.slice(0, MAX_PER_CITY);
  console.log(`  ✓ kept ${trimmed.length} deals`);
  return trimmed;
}

async function main() {
  const byCity = {};
  let total = 0;

  for (const city of CITIES) {
    try {
      const deals = await fetchCity(city);
      if (deals.length) {
        byCity[city] = deals;
        total += deals.length;
      }
    } catch (e) {
      console.log(`  ✗ ${city}: ${e.message}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "nadlan.gov.il (רשות המסים)",
    total,
    byCity,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\n═══ wrote ${total} deals across ${Object.keys(byCity).length} cities → ${OUT}`);
}

main().catch((e) => {
  // לעולם לא נכשיל את ה-build בגלל שליפה
  console.error("fetchNadlan failed (non-fatal):", e.message);
  process.exit(0);
});
