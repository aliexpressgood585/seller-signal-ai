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
  { address:"רחוב ויצמן 14, תל אביב",        area:"לב העיר",      rooms:3.5, floor:4, size:88,  price:3200000, prevPrice:3550000, days:67,  type:"price_drop"       },
  { address:"שדרות רוטשילד 45, תל אביב",      area:"רוטשילד",      rooms:4,   floor:7, size:115, price:5100000, prevPrice:null,    days:112, type:"long_market"      },
  { address:"רחוב דיזנגוף 122, תל אביב",      area:"דיזנגוף",      rooms:2.5, floor:3, size:65,  price:2450000, prevPrice:2600000, days:45,  type:"motivated_seller" },
  { address:"רחוב בן יהודה 88, תל אביב",      area:"הצפון הישן",   rooms:3,   floor:2, size:72,  price:2750000, prevPrice:null,    days:1,   type:"new_listing"      },
  { address:"רחוב אלנבי 88, תל אביב",          area:"לב העיר",      rooms:3,   floor:2, size:78,  price:2890000, prevPrice:3100000, days:54,  type:"price_drop"       },
  { address:"רחוב פלורנטין 22, תל אביב",       area:"פלורנטין",     rooms:4,   floor:1, size:98,  price:3800000, prevPrice:null,    days:23,  type:"hot_area"         },
  { address:"שדרות בן גוריון 18, תל אביב",    area:"צפון ת\"א",    rooms:5,   floor:5, size:140, price:7200000, prevPrice:null,    days:89,  type:"long_market"      },
  { address:"רחוב הרצל 56, נווה צדק",         area:"נווה צדק",     rooms:2,   floor:1, size:55,  price:2100000, prevPrice:2280000, days:38,  type:"price_drop"       },
  { address:"רחוב שינקין 4, תל אביב",          area:"שינקין",       rooms:3,   floor:3, size:82,  price:3350000, prevPrice:null,    days:8,   type:"new_listing"      },
  { address:"רחוב נחלת בנימין 31, תל אביב",   area:"נחלת בנימין",  rooms:2.5, floor:2, size:68,  price:2650000, prevPrice:2850000, days:71,  type:"price_drop"       },
];

const PHONES = ["054-1234567","052-9876543","053-4445566","050-1112233","050-7778889","054-7778899","052-3334455","054-5556667","050-2223334","052-1112223"];
const NAMES  = ["דוד כהן","רחל לוי","יוסי שפירו","משה אברהם","אמיר בן דוד","נועה גרין","גיל כהן","שרה לוינסקי","ירון מזרחי","תמר ברוך"];
const AGES   = ["לפני שעה","לפני 2 שעות","לפני 30 דק׳","לפני שעה","לפני שעה","לפני 3 שעות","לפני 4 שעות","לפני 6 שעות","לפני 2 שעות","לפני שעה"];
const BUYERS_CNT = [3,5,2,4,4,6,2,3,2,3];

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
  { id:"p1", stage:"lead",      title:"ויצמן 14",    owner:"דוד כהן",    phone:"054-1234567", value:3200000, prob:20, next:"שיחת היכרות",   date:"היום 18:00"   },
  { id:"p2", stage:"contact",   title:"רוטשילד 45",  owner:"רחל לוי",    phone:"052-9876543", value:5100000, prob:35, next:"שליחת דוח שוק", date:"מחר 10:00"    },
  { id:"p3", stage:"visit",     title:"בן יהודה 88", owner:"משה אברהם",  phone:"050-1112233", value:2750000, prob:50, next:"ביקור נכס",      date:"יום ג׳ 14:00" },
  { id:"p4", stage:"offer",     title:"דיזנגוף 122", owner:"יוסי שפירו", phone:"053-4445566", value:2450000, prob:65, next:"הגשת הצעה",      date:"מחר 16:00"    },
  { id:"p5", stage:"exclusive", title:"הרצל 33",     owner:"מיכל גולד",  phone:"052-3334455", value:4200000, prob:80, next:"חתימת בלעדיות", date:"היום 20:00"   },
  { id:"p6", stage:"contract",  title:"אלנבי 55",    owner:"נועה גרין",  phone:"054-7778899", value:3800000, prob:92, next:"סגירת חוזה",     date:"יום ה׳ 11:00" },
];

export const BUYERS = [
  { id:"b1", name:"אלון ואורית מזרחי", phone:"054-2223344", bMin:2500000, bMax:3500000, rMin:3, rMax:4, status:"active", notes:"3+ חדרים, קומה גבוהה, חניה חובה. מימון מאושר" },
  { id:"b2", name:"גיל כץ",            phone:"052-5556677", bMin:4500000, bMax:6500000, rMin:4, rMax:6, status:"hot",    notes:"משקיע — תשואה 3%+. גמיש בתנאים"             },
  { id:"b3", name:"שירה ודן ברק",      phone:"050-8889900", bMin:2000000, bMax:2800000, rMin:2, rMax:3, status:"active", notes:"זוג צעיר, רוכשים ראשונים, גמישים"           },
  { id:"b4", name:"יעל אשכנזי",        phone:"053-1112223", bMin:3000000, bMax:4200000, rMin:3, rMax:4, status:"hot",    notes:"מימון מאושר — סגירה תוך 60 יום"             },
];

export const INIT_TASKS = [
  { id:"t1", contact:"דוד כהן",    phone:"054-1234567", type:"call",     due:"היום 18:00",  today:true,  done:false, note:"שיחת מעקב לאחר ירידת מחיר"   },
  { id:"t2", contact:"רחל לוי",    phone:"052-9876543", type:"whatsapp", due:"היום 20:00",  today:true,  done:false, note:"שליחת דוח שוק מקצועי"         },
  { id:"t3", contact:"יוסי שפירו", phone:"053-4445566", type:"visit",    due:"מחר 10:00",   today:false, done:false, note:"ביקור נכס + שיחה על בלעדיות"  },
  { id:"t4", contact:"מיכל גולד",  phone:"052-3334455", type:"call",     due:"מחר 14:00",   today:false, done:false, note:"המשך שיחה — תנאי בלעדיות"     },
  { id:"t5", contact:"נועה גרין",  phone:"054-7778899", type:"whatsapp", due:"לפני 2 ימים", today:false, done:true,  note:"שיחה ראשונית — מעוניינת"       },
];
