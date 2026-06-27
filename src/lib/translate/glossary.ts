// src/lib/translate/glossary.ts
//
// Domain term base + do-not-translate list for SAT Markets Arabic translation.
// Brand decision (owner, June 2026): the brand name MAY appear in Arabic in body
// text; only the visual logo stays Latin. So brand names are not hard-protected.
// Saudi districts are given Arabic equivalents in the glossary (not masked), so
// they read naturally in Arabic. Only the FAL number and URLs are hard-protected.

/** English to Arabic term base for commercial real estate (matched case-insensitively). */
export const RE_GLOSSARY: Record<string, string> = {
  // asset types
  "office": "مكتب",
  "office space": "مساحة مكتبية",
  "office floor": "طابق مكتبي",
  "retail": "تجزئة",
  "retail space": "مساحة تجارية",
  "retail unit": "وحدة تجارية",
  "high street retail": "محل تجاري على شارع رئيسي",
  "showroom": "صالة عرض",
  "warehouse": "مستودع",
  "logistics": "خدمات لوجستية",
  "logistics warehouse": "مستودع لوجستي",
  "logistics shed": "مستودع لوجستي",
  "industrial": "صناعي",
  "clinic": "عيادة",
  "medical clinic": "عيادة طبية",
  "clinic floor": "طابق عيادات",
  "clinic suite": "جناح عيادات",
  "shop": "محل",
  "building": "مبنى",
  "whole building": "مبنى كامل",
  "tower": "برج",
  "tower floor": "طابق في برج",
  "land": "أرض",
  "plot": "قطعة أرض",
  "mixed use": "متعدد الاستخدامات",
  "corniche": "الكورنيش",
  // grading / condition
  "grade a": "الفئة A",
  "grade a+": "الفئة A+",
  "grade b": "الفئة B",
  "shell and core": "هيكل وأساس",
  "fitted": "مجهّز",
  "fully fitted": "مجهّز بالكامل",
  "furnished": "مفروش",
  "unfurnished": "غير مفروش",
  // commercial
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
  // amenities
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
  "loading dock": "رصيف تحميل",
  "high ceiling": "سقف مرتفع",
  "clear height": "ارتفاع صافٍ",
  "main road": "شارع رئيسي",
  "corner": "زاوية",
  "ground floor": "الطابق الأرضي",
  "mezzanine": "ميزانين",
  "fiber internet": "إنترنت بالألياف",
  "24/7 security": "أمن على مدار الساعة",
  "facade": "واجهة",
  "frontage": "واجهة",
  // measurement words (the NUMBER stays Western via the protect layer)
  "square meter": "متر مربع",
  "square meters": "متر مربع",
  "sqm": "م²",
  "per year": "سنوياً",
  "per month": "شهرياً",
  // brand (allowed in Arabic text; logo stays Latin in the UI)
  "sat markets": "سات ماركتس",
  "sat real estate": "سات العقارية",
  // Saudi cities and Riyadh districts: natural Arabic forms
  "riyadh": "الرياض",
  "jeddah": "جدة",
  "dammam": "الدمام",
  "al khobar": "الخبر",
  "khobar": "الخبر",
  "dhahran": "الظهران",
  "makkah": "مكة المكرمة",
  "mecca": "مكة المكرمة",
  "madinah": "المدينة المنورة",
  "medina": "المدينة المنورة",
  "al olaya": "العليا",
  "olaya": "العليا",
  "al malqa": "الملقا",
  "al malaz": "الملز",
  "al hamra": "الحمراء",
  "ar rawdah": "الروضة",
  "al rawdah": "الروضة",
  "al sahafa": "الصحافة",
  "as sahafah": "الصحافة",
  "al yasmin": "الياسمين",
  "al wurud": "الورود",
  "al worood": "الورود",
  "granada": "غرناطة",
  "al faisaliyah": "الفيصلية",
  "qurtubah": "قرطبة",
  "an narjis": "النرجس",
  "al narjis": "النرجس",
  "al aqiq": "العقيق",
  "al murabba": "المربع",
  "al nakheel": "النخيل",
  "hittin": "حطين",
  "diplomatic quarter": "الحي الدبلوماسي",
  "king fahd road": "طريق الملك فهد",
  "king abdulaziz road": "طريق الملك عبدالعزيز",
  "olaya street": "شارع العليا",
  "tahlia street": "شارع التحلية",
};

/**
 * Hard do-not-translate literals. Masked before translation, restored exactly
 * after. Only the FAL licence number and product URLs qualify.
 */
export const DNT_LITERALS: string[] = [
  "1200025510",
  "satmarkets.sa",
  "satestate.com",
];

/**
 * Proper nouns to keep in Latin form on purpose (acronyms with no common Arabic
 * rendering). Districts are intentionally NOT here; they translate via glossary.
 */
export const PROPER_NOUNS: string[] = [
  "KAFD",
  "King Abdullah Financial District",
];
