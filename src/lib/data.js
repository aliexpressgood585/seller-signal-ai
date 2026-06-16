// src/lib/data.js

export const fmt = (n) => n >= 1e6 ? `₪${(n / 1e6).toFixed(1)}M` : `₪${(n / 1000).toFixed(0)}K`;
export const fmtFull = (n) => `₪${n.toLocaleString("he-IL")}`;
export const sColor = (s) => s >= 85 ? "#F44336" : s >= 70 ? "#FFA000" : "#2979FF";
export const stColor = (s) => ({ lead:"#2979FF", contact:"#7C4DFF", visit:"#FFA000", offer:"#FF5722", exclusive:"#00BFA5", contract:"#00BFA5" }[s] || "#fff");
export const stLabel = (s) => ({ lead:"ליד", contact:"קשר", visit:"ביקור", offer:"הצעה", exclusive:"בלעדיות", contract:"חוזה" }[s] || s);
export const waLink = (p) => `https://wa.me/972${p.replace(/^0/, "").replace(/-/g, "")}`;
export const STAGES = ["lead", "contact", "visit", "offer", "exclusive", "contract"];

function makeScore(p, avgPrice) {
  let score = 50;
  if (p.price < avgPrice * 0.92) score += 22;
  else if (p.price < avgPrice * 0.97) score += 11;
  if (p.daysOnMarket > 80) score += 25;
  else if (p.daysOnMarket > 50) score += 14;
  else if (p.daysOnMarket < 3) score += 8;
  if (p.prevPrice) score += 18;
  if (p.type === "motivated_seller") score += 10;
  return Math.min(97, Math.round(score));
}

const RAW = [
  { address:"שדרות רוטשילד 53, תל אביב",       area:"רוטשילד",       rooms:4,   floor:6,  size:118, price:5450000, prevPrice:5900000, days:73, type:"price_drop"       },
  { address:"רחוב הצרפתית 11, נווה צדק",        area:"נווה צדק",      rooms:2.5, floor:2,  size:62,  price:3950000, prevPrice:4200000, days:41, type:"price_drop"       },
  { address:"רחוב שינקין 7, תל אביב",           area:"שינקין",        rooms:3,   floor:3,  size:78,  price:3290000, prevPrice:null,    days:2,  type:"new_listing"      },
  { address:"רחוב אבן גבירול 100, תל אביב",     area:"הצפון הישן",    rooms:4.5, floor:4,  size:120, price:4950000, prevPrice:null,    days:61, type:"long_market"      },
  { address:"רחוב פינסקר 6, תל אביב",           area:"לב העיר",       rooms:3,   floor:3,  size:80,  price:3050000, prevPrice:3350000, days:44, type:"price_drop"       },
  { address:"שדרות בן גוריון 67, תל אביב",      area:"צפון ת\"א",     rooms:3.5, floor:5,  size:95,  price:4100000, prevPrice:null,    days:1,  type:"new_listing"      },
  { address:"רחוב לילינבלום 15, תל אביב",       area:"לב העיר",       rooms:2,   floor:1,  size:52,  price:2280000, prevPrice:2520000, days:61, type:"motivated_seller" },
  { address:"רחוב קינג ג׳ורג׳ 44, תל אביב",    area:"מרכז העיר",     rooms:3,   floor:4,  size:85,  price:3480000, prevPrice:null,    days:18, type:"hot_area"         },
  { address:"רחוב יוספטל 8, גבעתיים",           area:"גבעתיים",       rooms:4,   floor:2,  size:105, price:3850000, prevPrice:4150000, days:55, type:"price_drop"       },
  { address:"רחוב הרב קוק 12, נווה צדק",        area:"נווה צדק",      rooms:2.5, floor:3,  size:70,  price:4490000, prevPrice:null,    days:88, type:"long_market"      },
  { address:"רחוב פלורנטין 8, תל אביב",         area:"פלורנטין",      rooms:4,   floor:2,  size:102, price:3600000, prevPrice:null,    days:6,  type:"new_listing"      },
  { address:"רחוב הארבעה 14, תל אביב",          area:"הצפון החדש",    rooms:5,   floor:8,  size:148, price:7800000, prevPrice:null,    days:97, type:"long_market"      },
];

const PHONES = ["052-3847591","054-6128374","050-9274836","053-7461829","054-2938475","052-8374619","050-3719284","054-9183726","053-2847365","050-7394821","052-4719283","054-8372946"];
const NAMES  = ["אורי שמש","רוני לבנשטיין","מיכל פרידמן","ציון בן-עמי","שני הרשקוביץ","אלעד קמחי","דנה זיו","ניר אלמוג","ליאת שפירא","יונתן מימון","תמי כהן-לוי","ברק אלוני"];
const AGES   = ["לפני 20 דק׳","לפני שעה","לפני 45 דק׳","לפני 2 שעות","לפני שעה","לפני 30 דק׳","לפני 3 שעות","לפני שעה","לפני 4 שעות","לפני 5 שעות","לפני 2 שעות","לפני 90 דק׳"];
const BUYERS_CNT = [6,4,3,5,3,7,2,4,3,2,5,2];

const TAG = { price_drop:"ירידת מחיר", long_market:"זמן רב", motivated_seller:"חם מאוד", new_listing:"חדש", hot_area:"אזור חם" };
const REASON = {
  price_drop:       (p) => `ירידת מחיר של ${p.prevPrice ? Math.round((p.prevPrice-p.price)/p.prevPrice*100) : 6}% — בעל נכס בלחץ`,
  long_market:      (p) => `${p.days} יום בשוק — ממוצע האזור 42 יום`,
  motivated_seller: ()  => 'שינוי תיאור מודעה — "סיבות אישיות", ירידת מחיר',
  new_listing:      ()  => "מודעה חדשה — מתחת למחיר שוק ב-8%",
  hot_area:         ()  => "אזור חם — 7 עסקאות נסגרו ב-30 יום האחרונים",
};

const avgPrice = RAW.reduce((s, p) => s + p.price, 0) / RAW.length;

export const SIGNALS = RAW.map((p, i) => ({
  id:             String(i + 1),
  score:          makeScore({ ...p, daysOnMarket: p.days }, avgPrice),
  type:           p.type,
  tag:            TAG[p.type],
  address:        p.address,
  area:           p.area,
  rooms:          p.rooms,
  floor:          p.floor,
  size:           p.size,
  price:          p.price,
  prevPrice:      p.prevPrice,
  change:         p.prevPrice ? p.prevPrice - p.price : null,
  daysOnMarket:   p.days,
  source:         "יד2 / מדלן",
  reason:         REASON[p.type](p),
  ownerName:      NAMES[i],
  ownerPhone:     PHONES[i],
  lastActivity:   AGES[i],
  matchingBuyers: BUYERS_CNT[i],
})).sort((a, b) => b.score - a.score);

export const PIPELINE = [
  { id:"p1", stage:"lead",      title:"רוטשילד 53",   owner:"אורי שמש",       phone:"052-3847591", value:5450000, prob:20, next:"שיחת היכרות",    date:"היום 18:30"   },
  { id:"p2", stage:"contact",   title:"הצרפתית 11",   owner:"רוני לבנשטיין",  phone:"054-6128374", value:3950000, prob:35, next:"שליחת דוח שוק",  date:"מחר 09:30"    },
  { id:"p3", stage:"visit",     title:"שינקין 7",      owner:"מיכל פרידמן",    phone:"050-9274836", value:3290000, prob:50, next:"ביקור נכס",       date:"יום ג׳ 11:00" },
  { id:"p4", stage:"offer",     title:"פינסקר 6",      owner:"שני הרשקוביץ",   phone:"054-2938475", value:3050000, prob:65, next:"הגשת הצעה",       date:"מחר 16:00"    },
  { id:"p5", stage:"exclusive", title:"יוספטל 8",      owner:"ליאת שפירא",     phone:"053-2847365", value:3850000, prob:80, next:"חתימת בלעדיות",  date:"היום 20:00"   },
  { id:"p6", stage:"contract",  title:"קינג ג׳ורג׳ 44", owner:"ניר אלמוג",    phone:"054-9183726", value:3480000, prob:92, next:"סגירת חוזה",      date:"יום ה׳ 10:00" },
];

export const BUYERS = [
  { id:"b1", name:"אלון ואורית כספי",   phone:"054-7382910", bMin:3000000, bMax:4200000, rMin:3, rMax:4, status:"hot",    notes:"3+ חדרים, צפון ת\"א / רמת גן. חניה חובה. מימון מאושר מבנק הפועלים" },
  { id:"b2", name:"רן ביטון",           phone:"052-6194837", bMin:5000000, bMax:8000000, rMin:4, rMax:6, status:"hot",    notes:"משקיע נסיון — מחפש תשואה 3.5%+. נווה צדק / רוטשילד. גמיש מאוד"  },
  { id:"b3", name:"תמר ואריאל גולן",   phone:"050-4827361", bMin:2200000, bMax:3100000, rMin:2, rMax:3, status:"active", notes:"זוג צעיר, רוכשים ראשונים. עד קומה 3. אזור: לב העיר / פלורנטין"   },
  { id:"b4", name:"מוריה שלומי",        phone:"053-9281746", bMin:3500000, bMax:5000000, rMin:3, rMax:4.5, status:"active", notes:"משפחה עם 2 ילדים. מחפשת גינה / גג. אזור גבעתיים / רמת גן"     },
  { id:"b5", name:"יצחק ורחל אוחיון",  phone:"054-1836274", bMin:1800000, bMax:2500000, rMin:2, rMax:3, status:"active", notes:"גיל פרישה. קומה נמוכה בלי מדרגות. עם מעלית. יפו / פלורנטין"    },
];

export const INIT_TASKS = [
  { id:"t1", contact:"אורי שמש",       phone:"052-3847591", type:"call",     due:"היום 18:30",  today:true,  done:false, note:"מעקב ירידת מחיר — 450K ₪ ירד. לבדוק גמישות"    },
  { id:"t2", contact:"רוני לבנשטיין",  phone:"054-6128374", type:"whatsapp", due:"היום 20:00",  today:true,  done:false, note:"שליחת דוח שוק נווה צדק + ניתוח Gemini"         },
  { id:"t3", contact:"מיכל פרידמן",    phone:"050-9274836", type:"visit",    due:"מחר 11:00",   today:false, done:false, note:"ביקור שינקין 7 — לבדוק מצב הנכס + חניה"        },
  { id:"t4", contact:"ליאת שפירא",     phone:"053-2847365", type:"call",     due:"מחר 14:00",   today:false, done:false, note:"המשך בלעדיות — דורשת 3 חודשים, מציע 6"         },
  { id:"t5", contact:"אלון כספי",      phone:"054-7382910", type:"whatsapp", due:"היום 21:00",  today:true,  done:false, note:"שלח לינק רוטשילד 53 — מתאים לתקציב ולחדרים"    },
  { id:"t6", contact:"שני הרשקוביץ",   phone:"054-2938475", type:"call",     due:"לפני 2 ימים", today:false, done:true,  note:"ניהול מו\"מ — מחיר סופי 3.05M ✓"               },
];
