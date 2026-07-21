// src/hooks/useGemini.js  — backed by Claude API
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

export function getGeminiKey() {
  return localStorage.getItem("seller_claude_key") || import.meta.env.VITE_CLAUDE_KEY || "";
}

export function setGeminiKey(key) {
  if (key) localStorage.setItem("seller_claude_key", key.trim());
  else localStorage.removeItem("seller_claude_key");
}

export async function askGemini(prompt) {
  const key = getGeminiKey();
  if (!key) throw new Error("NO_KEY");

  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || "";
}

export const PROMPTS = {
  signalInsight: (s) => `אתה יועץ נדל"ן מומחה בישראל. נתח בעברית — 3 משפטים קצרים וישירים:
נכס: ${s.address}
מחיר: ₪${s.price.toLocaleString("he-IL")}${s.prevPrice ? ` (היה ₪${s.prevPrice.toLocaleString("he-IL")})` : ""}
ימים בשוק: ${s.daysOnMarket} | חדרים: ${s.rooms} | שטח: ${s.size}מ"ר
סיגנל: ${s.reason} | ציון: ${s.score}/100
תן: (1) מה קורה כאן, (2) למה זו הזדמנות, (3) מה לעשות עכשיו.`,

  pitch: (address, owner, days, price) =>
    `אתה מאמן מכירות נדל"ן ישראלי. כתוב הודעת פנייה ראשונית בעברית:
כתובת: ${address} | שם: ${owner || "שלום"} | ימים בשוק: ${days} | מחיר: ₪${Number(price).toLocaleString("he-IL")}
4-5 משפטים. אישי, לא מכירתי, ממוקד בערך ספציפי.`,

  valuation: (address, rooms, size, floor, price) =>
    `אתה שמאי מקרקעין בישראל. כתוב דוח הערכת שווי קצר ומקצועי בעברית:
כתובת: ${address} | ${rooms} חדרים | ${size}מ"ר | קומה ${floor}
מחיר מבוקש: ₪${Number(price).toLocaleString("he-IL")}
כלול: טווח שווי, נימוק, מגמת שוק. 8-10 שורות.`,

  analyze: (address, rooms, size, price, days) =>
    `אתה יועץ נדל"ן מומחה. נתח בעברית:
${address} | ${rooms} חד׳ | ${size}מ"ר | ₪${Number(price).toLocaleString("he-IL")} | ${days} ימים בשוק
(1) הערכת תמחור, (2) חוזקות, (3) חולשות, (4) המלצה למתווך.`,

  whatsapp: (owner, address, days) =>
    `כתוב הודעת WhatsApp קצרה (3-4 שורות, עברית) ממתווך לבעל נכס:
שם: ${owner || "שלום"} | כתובת: ${address} | ימים בשוק: ${days}
לא ספאמי. מטרה: לקבוע שיחה.`,

  buyerMatch: (buyer, signal) =>
    `כתוב הודעת WhatsApp קצרה (עברית) ממתווך לקונה על נכס שמתאים לו:
קונה: ${buyer.name} | תקציב: ₪${buyer.bMin.toLocaleString("he-IL")}–₪${buyer.bMax.toLocaleString("he-IL")}
נכס: ${signal.address} | ${signal.rooms} חד׳ | ₪${signal.price.toLocaleString("he-IL")}
הדגש למה זה מתאים לו ספציפית. 3-4 שורות.`,
};
