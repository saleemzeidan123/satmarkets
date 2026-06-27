// src/lib/translate/glossary.ts
//
// Domain term base and do-not-translate list for SAT Markets Arabic translation.
// The glossary nudges the model toward consistent, professional Saudi MSA for
// real-estate vocabulary. The DNT list is enforced deterministically by the
// protect-and-restore layer, NOT by the prompt, so those strings can never drift.

/** English to Arabic term base for commercial real estate (matched case-insensitively). */
export const RE_GLOSSARY: Record<string, string> = {
  "office": "مكتب",
  "office space": "مساحة مكتبية",
  "office floor": "طابق مكتبي",
  "retail": "تجزئة",
  "retail space": "مساحة تجارية",
  "showroom": "صالة عرض",
  "warehouse": "مستودع",
  "logistics": "خدمات لوجستية",
  "industrial": "صناعي",
  "clinic": "عيادة",
  "medical clinic": "عيادة طبية",
  "shop": "محل",
  "building": "مبنى",
  "whole building": "مبنى كامل",
  "tower": "برج",
  "land": "أرض",
  "plot": "قطعة أرض",
  "mixed use": "متعدد الاستخدامات",
  "grade a": "الفئة A",
  "grade a+": "الفئة A+",
  "grade b": "الفئة B",
  "shell and core": "هيكل وأساس",
  "fitted": "مجهّز",
  "fully fitted": "مجهّز بالكامل",
  "furnished": "مفروش",
  "unfurnished": "غير مفروش",
  "for rent": "للإيجار",
  "for lease": "للإيجار",
  "for sale": "للبيع",
  "rent": "إيجار",
  "lease": "عقد إيجار",
  "annual rent": "الإيجار السنوي",
  "service charge": "رسوم الخدمات",
  "tenant": "مستأجر",
  "landlord": "مالك",
  "owner": "مالك",
  "broker": "وسيط",
  "verified owner": "موثّق من المالك",
  "available now": "متاح الآن",
  "immediate": "فوري",
  "negotiable": "قابل للتفاوض",
  "covered parking": "مواقف مغطاة",
  "parking": "مواقف",
  "central air conditioning": "تكييف مركزي",
  "central a/c": "تكييف مركزي",
  "air conditioning": "تكييف",
  "elevator": "مصعد",
  "lift": "مصعد",
  "reception": "استقبال",
  "meeting room": "غرفة اجتماعات",
  "meeting rooms": "غرف اجتماعات",
  "pantry": "مطبخ صغير",
  "loading bay": "رصيف تحميل",
  "high ceiling": "سقف مرتفع",
  "main road": "شارع رئيسي",
  "corner": "زاوية",
  "ground floor": "الطابق الأرضي",
  "mezzanine": "ميزانين",
  "fiber internet": "إنترنت بالألياف",
  "24/7 security": "أمن على مدار الساعة",
  "facade": "واجهة",
  "frontage": "واجهة",
  "square meter": "متر مربع",
  "square meters": "متر مربع",
  "sqm": "م²",
  "per year": "سنوياً",
  "per month": "شهرياً",
};

/**
 * Do-not-translate literals. Masked before translation, restored exactly after.
 * Order matters: longer / more specific strings first (mask "SAT Markets" before "SAT").
 */
export const DNT_LITERALS: string[] = [
  "1200025510",
  "SAT Markets",
  "SAT Real Estate",
  "satmarkets.sa",
  "satestate.com",
  "SAT",
];

/** Saudi proper nouns kept in their established Latin form. Extend as needed. */
export const PROPER_NOUNS: string[] = [
  "Al Olaya",
  "Olaya",
  "Al Malqa",
  "Al Malaz",
  "Hittin",
  "KAFD",
  "King Abdullah Financial District",
  "Al Nakheel",
  "King Fahd Road",
  "Olaya Street",
  "Riyadh",
  "Jeddah",
  "Dammam",
];
