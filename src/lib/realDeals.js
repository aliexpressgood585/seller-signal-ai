// src/lib/realDeals.js
// גישה לנתוני עסקאות אמיתיים שנשלפו מ-nadlan.gov.il בזמן ה-build.
import data from "./realDeals.json";

const CITY_ALIASES = {
  "יפו": "תל אביב יפו",
  "תל אביב": "תל אביב יפו",
  "פלורנטין": "תל אביב יפו",
  "הרצליה פיתוח": "הרצליה",
};

// מחלץ שם עיר מכתובת מלאה ("רחוב אחד העם 12, תל אביב" → "תל אביב יפו")
export function cityFromAddress(address = "") {
  const raw = address.split(",").pop().trim();
  return CITY_ALIASES[raw] || raw;
}

// עסקאות אמיתיות אחרונות בעיר של הכתובת
export function getRealDeals(address, limit = 6) {
  const city = cityFromAddress(address);
  const deals = data.byCity?.[city] || [];
  return deals.slice(0, limit);
}

// האם יש בכלל נתונים אמיתיים שנטענו
export const hasRealData = (data.total || 0) > 0;

export const realDataMeta = {
  generatedAt: data.generatedAt,
  source: data.source,
  total: data.total || 0,
};

export function fmtDealDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y) return iso;
  return d ? `${d}/${m}/${y}` : `${m}/${y}`;
}
