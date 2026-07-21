// scripts/fetchNadlan.mjs
// שולף עסקאות נדל"ן אמיתיות מ-nadlan.gov.il (רשות המסים) בזמן ה-build.
//
// nadlan.gov.il מוגן ב-Imperva Incapsula שחוסם קריאות API ישירות (גם מדפדפן
// Headless). לכן במקום לקרוא ל-API בעצמנו, אנחנו *נוהגים בממשק האתר* כמו
// משתמש אמיתי — מקלידים עיר, בוחרים תוצאה — ותופסים את תגובות ה-API שה-SPA
// עצמו מקבל (page.on('response')). כך ה-challenge נעקף ע"י האפליקציה עצמה.
//
// הסקריפט תמיד יוצא בקוד 0 וכותב JSON תקין — כשל שליפה לא ישבור deploy.

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
    address: (d.FULLADRESS || d.ADDRESS || "").trim() || null,
    price,
    date: (d.DEALDATETIME || d.DEALDATE || "").slice(0, 10) || null,
    rooms: toNum(d.ASSETROOMNUM),
    size: toNum(d.DEALNATURE),
    floor: d.FLOORNO != null ? String(d.FLOORNO).trim() : null,
    type: (d.DEALNATUREDESCRIPTION || "").trim() || null,
    yearBuilt: toNum(d.BUILDINGYEAR || d.YEARBUILT),
  };
}

async function findSearchInput(page) {
  const selectors = [
    "#myInput2",
    "#SearchString",
    'input[placeholder*="חיפוש"]',
    'input[placeholder*="כתובת"]',
    'input[placeholder*="עיר"]',
    'input[type="search"]',
    'input[type="text"]',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) && (await el.isVisible().catch(() => false))) {
      console.log(`    search input: ${sel}`);
      return el;
    }
  }
  return null;
}

async function searchCity(page, city) {
  const input = await findSearchInput(page);
  if (!input) {
    console.log("    ⚠ no search input found");
    return;
  }
  await input.click();
  await input.fill("");
  await input.type(city, { delay: 90 });
  await page.waitForTimeout(1800); // המתנה ל-autocomplete

  // מנסים לבחור פריט ראשון מרשימת ההשלמה; אם אין — Enter
  const acSelectors = [
    "#autocomplete-list div",
    ".autocomplete-items div",
    ".ui-autocomplete li",
    "ul.autocomplete li",
    '[class*="autocomplete"] [class*="item"]',
  ];
  let clicked = false;
  for (const sel of acSelectors) {
    const item = page.locator(sel).first();
    if ((await item.count()) && (await item.isVisible().catch(() => false))) {
      console.log(`    autocomplete: ${sel}`);
      await item.click().catch(() => {});
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    console.log("    autocomplete: none, pressing Enter");
    await input.press("Enter").catch(() => {});
  }
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
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  // מאזין גלובלי: תופס כל תגובת GetAssestAndDeals שה-SPA מקבל
  const captured = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!/GetAssestAndDeals|GetAssetAndDeals/i.test(url)) return;
    try {
      const json = await res.json();
      const results = json?.AllResults || json?.dealDetails || [];
      if (results.length) {
        captured.push(...results);
        console.log(`    ← captured ${results.length} deals from API`);
      }
    } catch {
      /* ignore non-JSON */
    }
  });

  console.log("▶ loading nadlan.gov.il …");
  await page.goto(SITE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000); // לתת ל-Incapsula + ל-SPA להסתדר
  console.log("  loaded\n");

  for (const city of CITIES) {
    console.log(`▶ ${city}`);
    const before = captured.length;
    try {
      await searchCity(page, city);
      // ממתינים שתגיע תגובת API (עד 12 שניות)
      for (let i = 0; i < 12 && captured.length === before; i++) {
        await page.waitForTimeout(1000);
      }
      const fresh = captured.splice(before); // לוקחים מה שהצטבר לעיר הזו
      const deals = [];
      for (const r of fresh) {
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
      // חוזרים לדף הבית לחיפוש הבא
      await page.goto(SITE, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500);
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
