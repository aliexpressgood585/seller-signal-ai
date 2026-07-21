// src/lib/data.js
const MONTHS_HE = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יונ׳","יול׳","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

export function getPriceHistory(signal) {
  const now = new Date();
  const count = Math.max(3, Math.min(6, Math.ceil(signal.daysOnMarket / 20)));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (count - 1 - i));
    const label = MONTHS_HE[d.getMonth()];
    let price;
    if (i === count - 1) {
      price = signal.price;
    } else if (signal.prevPrice) {
      price = i < count - 2 ? signal.prevPrice : Math.round((signal.prevPrice + signal.price) / 2);
    } else {
      const wave = 1 + Math.sin(i * 1.1) * 0.018;
      price = Math.round(signal.price * wave);
    }
    return { label, price };
  });
}

export const fmt     = (n) => n >= 1e6 ? `₪${(n / 1e6).toFixed(1)}M` : `₪${(n / 1000).toFixed(0)}K`;
export const fmtFull = (n) => `₪${Number(n).toLocaleString("he-IL")}`;
export const sColor  = (s) => s >= 85 ? "#F44336" : s >= 70 ? "#FFA000" : "#2979FF";
export const stColor = (s) => ({ lead:"#2979FF", contact:"#7C4DFF", visit:"#FFA000", offer:"#FF5722", exclusive:"#00BFA5", contract:"#00BFA5" }[s] || "#fff");
export const stLabel = (s) => ({ lead:"ליד", contact:"קשר", visit:"ביקור", offer:"הצעה", exclusive:"בלעדיות", contract:"חוזה" }[s] || s);
export const waLink  = (p) => `https://wa.me/972${(p || "").replace(/^0/, "").replace(/-/g, "")}`;
export const STAGES  = ["lead", "contact", "visit", "offer", "exclusive", "contract"];

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

const TAG    = { price_drop:"ירידת מחיר", long_market:"זמן רב", motivated_seller:"חם מאוד", new_listing:"חדש", hot_area:"אזור חם" };
const REASON = {
  price_drop:       (p) => `ירידת מחיר של ${p.prevPrice ? Math.round((p.prevPrice - p.price) / p.prevPrice * 100) : 6}% — בעל נכס בלחץ`,
  long_market:      (p) => `${p.days} יום בשוק — ממוצע האזור 42 יום`,
  motivated_seller: ()  => 'שינוי תיאור מודעה — "סיבות אישיות", ירידת מחיר',
  new_listing:      ()  => "מודעה חדשה — מתחת למחיר שוק ב-8%",
  hot_area:         ()  => "אזור חם — 7 עסקאות נסגרו ב-30 יום האחרונים",
};

const RAW = [
  // תל אביב — מרכז
  { address:"רחוב אחד העם 12, תל אביב",          area:"נווה צדק",       rooms:4,   floor:3,  size:108, price:4850000, prevPrice:5200000, days:38, type:"price_drop"       },
  { address:"רחוב נחמני 22, תל אביב",             area:"לב העיר",        rooms:2.5, floor:2,  size:64,  price:3100000, prevPrice:3420000, days:47, type:"price_drop"       },
  { address:"רחוב פרישמן 14, תל אביב",            area:"צפון ת\"א",      rooms:3,   floor:4,  size:75,  price:3850000, prevPrice:null,    days:2,  type:"new_listing"      },
  { address:"רחוב ברנר 17, תל אביב",              area:"לב העיר",        rooms:2,   floor:1,  size:52,  price:2050000, prevPrice:2280000, days:61, type:"motivated_seller" },
  { address:"רחוב ארלוזורוב 7, תל אביב",          area:"הצפון הישן",     rooms:4,   floor:5,  size:100, price:4500000, prevPrice:null,    days:67, type:"long_market"      },
  { address:"רחוב בלפור 3, תל אביב",              area:"צפון ת\"א",      rooms:5,   floor:6,  size:145, price:7400000, prevPrice:null,    days:1,  type:"new_listing"      },
  // תל אביב — צפון
  { address:"שדרות דוד המלך 5, תל אביב",          area:"הצפון החדש",     rooms:4.5, floor:9,  size:132, price:6200000, prevPrice:6700000, days:44, type:"price_drop"       },
  { address:"רחוב הירקון 62, תל אביב",            area:"צפון ת\"א",      rooms:3,   floor:5,  size:78,  price:4200000, prevPrice:null,    days:3,  type:"new_listing"      },
  { address:"רחוב בן יהודה 95, תל אביב",          area:"צפון ת\"א",      rooms:3,   floor:6,  size:80,  price:4050000, prevPrice:null,    days:5,  type:"hot_area"         },
  { address:"רחוב דיזנגוף 88, תל אביב",           area:"הצפון הישן",     rooms:3.5, floor:4,  size:92,  price:4650000, prevPrice:null,    days:4,  type:"hot_area"         },
  // תל אביב — דרום
  { address:"רחוב יפת 85, יפו",                  area:"יפו",             rooms:3,   floor:2,  size:82,  price:2350000, prevPrice:2600000, days:55, type:"motivated_seller" },
  { address:"רחוב שלמה 28, פלורנטין",            area:"פלורנטין",        rooms:4,   floor:2,  size:105, price:3400000, prevPrice:null,    days:6,  type:"new_listing"      },
  // גבעתיים
  { address:"שדרות ירושלים 45, גבעתיים",          area:"גבעתיים",        rooms:4,   floor:4,  size:110, price:3750000, prevPrice:null,    days:3,  type:"hot_area"         },
  { address:"רחוב העצמאות 33, גבעתיים",           area:"גבעתיים",        rooms:3.5, floor:5,  size:95,  price:3600000, prevPrice:3950000, days:52, type:"price_drop"       },
  // רמת גן
  { address:"שדרות בן גוריון 14, רמת גן",         area:"רמת גן",         rooms:4,   floor:3,  size:108, price:3450000, prevPrice:3800000, days:48, type:"price_drop"       },
  { address:"רחוב ביאליק 22, רמת גן",            area:"רמת גן",         rooms:5,   floor:2,  size:138, price:3950000, prevPrice:null,    days:82, type:"long_market"      },
  // הרצליה
  { address:"רחוב סוקולוב 88, הרצליה",            area:"הרצליה",         rooms:4.5, floor:8,  size:122, price:4200000, prevPrice:null,    days:7,  type:"new_listing"      },
  { address:"רחוב שנקר 5, הרצליה פיתוח",         area:"הרצליה פיתוח",   rooms:5,   floor:10, size:160, price:8500000, prevPrice:9100000, days:35, type:"price_drop"       },
  // פתח תקווה וחולון
  { address:"רחוב ויצמן 33, פתח תקווה",          area:"פתח תקווה",      rooms:5,   floor:2,  size:135, price:2450000, prevPrice:null,    days:78, type:"long_market"      },
  { address:"שדרות הרצל 22, חולון",              area:"חולון",           rooms:4,   floor:3,  size:112, price:2100000, prevPrice:2360000, days:63, type:"price_drop"       },
];

const PHONES = [
  "052-3847591","054-6128374","050-9274836","053-7461829","054-2938475",
  "052-8374619","050-3719284","054-9183726","053-2847365","050-7394821",
  "052-4719283","054-8372946","050-1234567","052-9876543","054-3456789",
  "050-6543210","052-1357924","054-8024681","050-2468013","052-7531902",
];
const NAMES = [
  "אורי כהן","שירי מזרחי","דוד ברוך","חיה לוי","ניצן פרנקל",
  "גלית צור","יגאל אמיר","רבקה שמיר","מאיר דהן","עדי רוזן",
  "נעמה שפר","אמיר חיון","רוית לבנת","בנימין טל","פנינה קרמר",
  "עוז שטרן","ליהי בן-שמש","אריה פלד","שלי כץ","נחום ורדי",
];
const AGES = [
  "לפני 20 דק׳","לפני שעה","לפני 45 דק׳","לפני 2 שעות","לפני שעה",
  "לפני 30 דק׳","לפני 3 שעות","לפני שעה","לפני 4 שעות","לפני 5 שעות",
  "לפני 2 שעות","לפני 90 דק׳","לפני 15 דק׳","לפני 6 שעות","לפני 3 שעות",
  "לפני שעתיים","לפני 40 דק׳","לפני 7 שעות","לפני 10 דק׳","לפני 4 שעות",
];
const BUYERS_CNT = [5,3,4,2,6,3,4,2,5,3,3,4,6,3,4,2,3,5,2,3];

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
  { id:"p1", stage:"lead",      title:"אחד העם 12, ת\"א",       owner:"אורי כהן",      phone:"052-3847591", value:4850000, prob:20, commissionRate:2,   next:"שיחת היכרות ראשונה",      date:"היום 18:00"    },
  { id:"p2", stage:"contact",   title:"הירקון 62, ת\"א",        owner:"שירי מזרחי",    phone:"054-6128374", value:4200000, prob:35, commissionRate:2,   next:"שליחת דוח שוק + ניתוח",  date:"מחר 10:00"     },
  { id:"p3", stage:"contact",   title:"נחמני 22, ת\"א",         owner:"דוד ברוך",      phone:"050-9274836", value:3100000, prob:35, commissionRate:1.5, next:"פגישה לתיאום בלעדיות",    date:"מחר 12:00"     },
  { id:"p4", stage:"visit",     title:"דיזנגוף 88, ת\"א",       owner:"חיה לוי",       phone:"053-7461829", value:4650000, prob:50, commissionRate:2,   next:"ביקור שני + שמאי",        date:"יום ג׳ 11:00"  },
  { id:"p5", stage:"visit",     title:"בן יהודה 95, ת\"א",      owner:"ניצן פרנקל",    phone:"054-2938475", value:4050000, prob:50, commissionRate:2,   next:"ביקור עם הקונה",          date:"יום ד׳ 15:00"  },
  { id:"p6", stage:"offer",     title:"ירושלים 45, גבעתיים",   owner:"רבקה שמיר",     phone:"050-3719284", value:3750000, prob:65, commissionRate:2,   next:"הגשת הצעה 3.6M",          date:"מחר 16:00"     },
  { id:"p7", stage:"exclusive", title:"שנקר 5, הרצליה פיתוח",  owner:"יגאל אמיר",     phone:"052-8374619", value:8500000, prob:80, commissionRate:1.5, next:"חתימת חוזה בלעדיות",      date:"היום 20:00"    },
  { id:"p8", stage:"contract",  title:"בלפור 3, ת\"א",          owner:"גלית צור",      phone:"054-9183726", value:7400000, prob:95, commissionRate:2,   next:"סגירת חוזה אצל עו\"ד",     date:"יום ה׳ 10:00"  },
];

export const BUYERS = [
  { id:"b1", name:"אלון ואורית כספי",    phone:"054-7382910", bMin:3500000, bMax:4500000, rMin:3,   rMax:4,   status:"hot",    notes:"3+ חדרים, צפון ת\"א / גבעתיים. חניה חובה. מימון מאושר בנק הפועלים 3.2M. דד-ליין — חייבים לסגור ב-3 חודשים." },
  { id:"b2", name:"רן ביטון",            phone:"052-6194837", bMin:5500000, bMax:9000000, rMin:4,   rMax:6,   status:"hot",    notes:"משקיע נסיון — מחפש תשואה 3.5%+. נווה צדק / רוטשילד / הרצליה פיתוח. גמיש מאוד. רכש 4 נכסים בשנתיים." },
  { id:"b3", name:"תמר ואריאל גולן",    phone:"050-4827361", bMin:2200000, bMax:3200000, rMin:2,   rMax:3,   status:"active", notes:"זוג צעיר, רוכשים ראשונים. מעוניינים עד קומה 3. אזורים: לב העיר / פלורנטין / יפו. מאושר משכנתא 2M." },
  { id:"b4", name:"מוריה שלומי",         phone:"053-9281746", bMin:3500000, bMax:5200000, rMin:3,   rMax:4.5, status:"active", notes:"משפחה עם 2 ילדים. מחפשת גינה או גג. אזור גבעתיים / רמת גן. בית ספר טוב — חשוב מאוד." },
  { id:"b5", name:"יצחק ורחל אוחיון",   phone:"054-1836274", bMin:1800000, bMax:2600000, rMin:2,   rMax:3,   status:"active", notes:"גיל פרישה. קומה נמוכה עם מעלית. אין מדרגות. אזורים: יפו / חולון. רוצים להיות קרוב לים." },
  { id:"b6", name:"דני לוי",             phone:"052-5551234", bMin:4000000, bMax:6500000, rMin:4,   rMax:5,   status:"hot",    notes:"משקיע מניסיון, 7 נכסים בתיק. מחפש נכס להשכרת טווח קצר (Airbnb) באזור צפון ת\"א / הירקון. רוצה תשואה 4%+." },
  { id:"b7", name:"שרית ואמיר בן-דוד",  phone:"050-7778899", bMin:2800000, bMax:3800000, rMin:3,   rMax:4,   status:"active", notes:"הרחבה מדירה קטנה. עם ילד אחד, מצפים לשני. פתח תקווה / גבעתיים / רמת גן. גינה / חצר יתרון." },
  { id:"b8", name:"נועה קרן",            phone:"054-3334455", bMin:1500000, bMax:2200000, rMin:2,   rMax:3,   status:"active", notes:"רוכשת ראשונה, רווקה. עדיפות לפלורנטין / יפו. חשוב קרוב לתחב\"צ. אישור עקרוני משכנתא 1.6M." },
  { id:"b9", name:"יוסי ומיכל אדרי",    phone:"052-9990011", bMin:5000000, bMax:7500000, rMin:4,   rMax:5,   status:"hot",    notes:"שדרוג מדירת 4 חד. מחפשים קומה גבוהה עם נוף. אזור הצפון החדש / הרצליה פיתוח. בית ספר דוב הוז יתרון." },
  { id:"b10", name:"אבי שוורץ",          phone:"050-1112233", bMin:3000000, bMax:4200000, rMin:3,   rMax:4,   status:"active", notes:"רוכש אחרי גירושין. רוצה להתחיל מחדש. מחפש 3-4 חד מרווח. צפון ת\"א / גבעתיים. גמיש בתאריכי כניסה." },
];

export const INIT_TASKS = [
  { id:"t1", contact:"אורי כהן",       phone:"052-3847591", type:"call",     due:"היום 18:00",  today:true,  done:false, note:"ירידת מחיר 350K — לבדוק גמישות נוספת. מטרה: בלעדיות" },
  { id:"t2", contact:"שירי מזרחי",     phone:"054-6128374", type:"whatsapp", due:"היום 20:00",  today:true,  done:false, note:"שלח דוח שוק הירקון 62 + ניתוח Gemini" },
  { id:"t3", contact:"חיה לוי",        phone:"053-7461829", type:"visit",    due:"מחר 11:00",   today:false, done:false, note:"ביקור שני דיזנגוף 88 עם שמאי — לבדוק תשתיות" },
  { id:"t4", contact:"יגאל אמיר",      phone:"052-8374619", type:"call",     due:"היום 20:00",  today:true,  done:false, note:"חתימת בלעדיות שנקר 5 — דורש 4 חודשים, מציע 6" },
  { id:"t5", contact:"אלון כספי",      phone:"054-7382910", type:"whatsapp", due:"היום 21:00",  today:true,  done:false, note:"שלח אחד העם 12 — תואם בדיוק: תקציב + חדרים + אזור" },
  { id:"t6", contact:"רן ביטון",       phone:"052-6194837", type:"call",     due:"מחר 09:30",   today:false, done:false, note:"עדכן על שנקר 5 + בלפור 3 — שניהם בתקציב" },
  { id:"t7", contact:"רבקה שמיר",      phone:"050-3719284", type:"offer",    due:"מחר 16:00",   today:false, done:false, note:"הגש הצעה על ירושלים 45 — מחיר יעד 3.6M" },
  { id:"t8", contact:"גלית צור",       phone:"054-9183726", type:"call",     due:"לפני 2 ימים", today:false, done:true,  note:"חוזה בלפור 3 נחתם — 7.4M ✓ עמלה 148K" },
];
