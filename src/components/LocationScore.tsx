import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

// SAT Location Score v2: per-asset intelligence templates plus an investor
// overlay on sale listings. Owner-directed redesign (2026-07-02): each asset
// class answers ITS occupier's decision question, per
// work/plans/intelligence-by-asset-2026-07-02.md. Law 3 discipline throughout:
// every figure is a labelled representative sample until its named Saudi data
// source is live; ratings are transparent (five lenses per type, one-line
// reasons); anything without sufficient data routes to the advisor.

type Pair = [string, string];
type Hero = [string, string, string, string, string]; // labelEn, labelAr, value, subEn, subAr
type Use = [string, string, number, string, string]; // en, ar, stars, whyEn, whyAr

interface Tpl { hero: Hero[]; uses: Use[]; usesTitle: Pair; lenses: Pair[]; note?: Pair }

const INTEL: Record<string, Tpl> = {
  office: {
    hero: [
      ["Metro access", "الوصول للمترو", "8 min", "walk to nearest station", "مشياً إلى أقرب محطة"],
      ["Amenity within 500m", "الخدمات ضمن 500م", "24", "F&B and retail units", "مطاعم ومقاهٍ وتجزئة"],
      ["RHQ firms in the area", "شركات المقرات الإقليمية بالمنطقة", "46", "MISA-licensed presence", "مرخّصة لدى وزارة الاستثمار"],
      ["Working-age reach", "الوصول للقوى العاملة", "2.1M", "30-min drive-time", "ضمن 30 دقيقة قيادة"],
    ],
    uses: [
      ["Regional HQ", "مقر إقليمي", 5, "Grade, cluster and metro access fit the RHQ profile", "الفئة والتجمّع والمترو تناسب المقرات الإقليمية"],
      ["Professional services", "خدمات مهنية", 5, "Client-proximate location with strong amenity", "موقع قريب من العملاء بخدمات قوية"],
      ["Tech and fintech", "تقنية وتقنية مالية", 4, "Talent reach is strong, cluster still forming", "وصول جيد للكفاءات والتجمّع في تشكّل"],
      ["Government-adjacent", "قريب من الجهات الحكومية", 3, "Depends on ministry proximity for this location", "يعتمد على قرب الجهات لهذا الموقع"],
      ["Back office", "مكاتب مساندة", 2, "Rent level suits front-of-house functions better", "مستوى الإيجار يناسب الوظائف الأمامية أكثر"],
    ],
    usesTitle: ["Best-fit occupiers", "أنسب الشاغلين"],
    lenses: [["Talent access", "الوصول للكفاءات"], ["Amenity", "الخدمات المحيطة"], ["Cluster", "التجمّع"], ["Transit", "النقل"], ["Market", "السوق"]],
  },
  retail: {
    hero: [
      ["Footfall index", "مؤشر حركة المشاة", "138", "city = 100", "المدينة = 100"],
      ["Daytime population", "السكان نهاراً", "412k", "10-min catchment", "نطاق 10 دقائق"],
      ["Household income index", "مؤشر دخل الأسرة", "124", "top quartile", "الربع الأعلى"],
      ["Top visitors", "أبرز الزوّار", "", "Office workers, 62% aged 25 to 44", "موظفو المكاتب، 62% بعمر 25 إلى 44"],
    ],
    uses: [
      ["Café", "مقهى", 5, "High daytime population and an office-worker visitor profile", "كثافة نهارية عالية وزوّار من موظفي المكاتب"],
      ["Pharmacy", "صيدلية", 4, "Steady weekday footfall, low direct saturation", "حركة منتظمة أيام الأسبوع وتشبّع منخفض"],
      ["Quick-service F&B", "مطاعم خدمة سريعة", 4, "Lunch peak is strong, evening dwell moderate", "ذروة غداء قوية وبقاء مسائي متوسط"],
      ["Fashion retail", "أزياء وتجزئة", 3, "Footfall peaks midday, weekend pull is limited", "الذروة منتصف النهار وجذب نهاية الأسبوع محدود"],
      ["Luxury retail", "تجزئة فاخرة", 2, "Top-quartile income, but a work-led visit pattern", "دخل مرتفع لكن نمط الزيارة مرتبط بالعمل"],
    ],
    usesTitle: ["What this location wants", "ماذا يريد هذا الموقع"],
    lenses: [["Foot traffic", "حركة المشاة"], ["Demographics fit", "ملاءمة الديموغرافيا"], ["Market potential", "إمكانات السوق"], ["Competition", "المنافسة"], ["Visibility", "الظهور"]],
  },
  medical: {
    hero: [
      ["Resident population", "السكان المقيمون", "168k", "10-min catchment", "نطاق 10 دقائق"],
      ["Children in catchment", "نسبة الأطفال", "27%", "under 15, GASTAT basis", "دون 15 سنة، أساس الهيئة العامة للإحصاء"],
      ["Clinics per 10k", "عيادات لكل 10 آلاف", "3.1", "below city average", "أقل من متوسط المدينة"],
      ["Nearest hospital", "أقرب مستشفى", "7 min", "referral ecosystem", "منظومة الإحالة"],
    ],
    uses: [
      ["Dental", "أسنان", 5, "Family catchment with low dental saturation", "نطاق عائلي وتشبّع منخفض في الأسنان"],
      ["Pediatrics", "أطفال", 4, "High child share in the resident mix", "نسبة أطفال مرتفعة بين المقيمين"],
      ["Dermatology and cosmetic", "جلدية وتجميل", 4, "Income level supports private-pay demand", "مستوى الدخل يدعم الطلب الخاص"],
      ["General practice", "طب عام", 4, "Underserved per-capita clinic ratio", "نسبة عيادات أقل من الحاجة"],
      ["Physio and rehab", "علاج طبيعي", 3, "Demand present, referral links matter most", "طلب قائم وتعتمد على روابط الإحالة"],
    ],
    usesTitle: ["Best-fit specialties", "أنسب التخصصات"],
    lenses: [["Patient catchment", "نطاق المرضى"], ["Demographic fit", "الملاءمة الديموغرافية"], ["Referral ecosystem", "منظومة الإحالة"], ["Competition", "المنافسة"], ["Access and parking", "الوصول والمواقف"]],
  },
  warehouse: {
    hero: [
      ["Ring-road access", "الوصول للطريق الدائري", "6 min", "to nearest interchange", "إلى أقرب تقاطع"],
      ["Last-mile reach", "التغطية النهائية", "4.2M", "population in 30-min drive", "سكان ضمن 30 دقيقة"],
      ["Labor districts nearby", "أحياء العمالة القريبة", "3", "within 15-min", "ضمن 15 دقيقة"],
      ["Zone", "النطاق", "", "Urban infill (sample), MODON check pending", "نطاق حضري (عيّنة)، والتحقق من مدن لاحقاً"],
    ],
    uses: [
      ["Last-mile depot", "مستودع توزيع نهائي", 5, "Dense population reach at short drive-times", "تغطية سكانية كثيفة بأزمنة قيادة قصيرة"],
      ["3PL operations", "خدمات لوجستية 3PL", 4, "Connectivity fits multi-client distribution", "الربط يناسب التوزيع متعدد العملاء"],
      ["E-commerce fulfilment", "تنفيذ التجارة الإلكترونية", 4, "Reach is strong, clear height decides scale", "التغطية قوية والارتفاع يحدد الحجم"],
      ["Light industrial", "صناعات خفيفة", 3, "Depends on power capacity and zone rules", "يعتمد على القدرة الكهربائية وأنظمة النطاق"],
      ["Cold chain", "سلسلة تبريد", 2, "Power and spec dependent, verify capacity", "يعتمد على الكهرباء والمواصفات، تحقق من القدرة"],
    ],
    usesTitle: ["Best-fit operations", "أنسب التشغيل"],
    lenses: [["Connectivity", "الربط"], ["Site spec", "مواصفات الموقع"], ["Labor", "العمالة"], ["Zone", "النطاق"], ["Market", "السوق"]],
  },
  showroom: {
    hero: [
      ["Vehicles per day", "مركبات يومياً", "38k", "fronting road, municipal counts", "الطريق الأمامي، عدّادات البلدية"],
      ["Directional split", "توزيع الاتجاهين", "55 / 45", "evening-heavy side", "الجانب الأكثر مساءً"],
      ["Frontage", "الواجهة", "42m", "signalized corner", "زاوية بإشارة"],
      ["Corridor fit", "ملاءمة المحور", "", "Established showroom corridor", "محور معارض قائم"],
    ],
    uses: [
      ["Auto showroom", "معرض سيارات", 5, "Drive-by exposure and corridor co-location", "ظهور للمركبات وتجاور مع محور المعارض"],
      ["Electronics and appliances", "إلكترونيات وأجهزة", 4, "Destination trips with easy parking", "زيارات مقصودة ومواقف سهلة"],
      ["Furniture and home", "أثاث ومفروشات", 4, "Catchment wealth supports big-ticket trips", "ثراء النطاق يدعم المشتريات الكبيرة"],
      ["Building materials", "مواد بناء", 3, "Works if yard and loading exist", "يصلح مع وجود ساحة وتحميل"],
    ],
    usesTitle: ["Best-fit showrooms", "أنسب المعارض"],
    lenses: [["Road exposure", "الظهور على الطريق"], ["Access geometry", "هندسة الوصول"], ["Corridor fit", "ملاءمة المحور"], ["Catchment wealth", "ثراء النطاق"], ["Market", "السوق"]],
  },
  serviced: {
    hero: [
      ["Metro access", "الوصول للمترو", "8 min", "walk to nearest station", "مشياً إلى أقرب محطة"],
      ["Hotels within 1km", "فنادق ضمن كيلومتر", "6", "visiting-team demand", "طلب الفرق الزائرة"],
      ["RHQ soft-landing demand", "طلب الهبوط الناعم للمقرات", "High", "RHQ activity around the location", "نشاط المقرات حول الموقع"],
      ["Amenity within 500m", "الخدمات ضمن 500م", "24", "F&B and retail units", "مطاعم وتجزئة"],
    ],
    uses: [
      ["RHQ landing teams", "فرق تأسيس المقرات", 5, "Short-cycle demand from new entrants", "طلب قصير الدورة من الداخلين الجدد"],
      ["Project teams", "فرق المشاريع", 5, "Flexible terms fit project cycles", "المرونة تناسب دورات المشاريع"],
      ["Startups", "شركات ناشئة", 4, "Amenity and address value at low commitment", "قيمة العنوان والخدمات بالتزام منخفض"],
      ["Solo professionals", "مهنيون مستقلون", 4, "Walk-in visibility supports memberships", "الظهور يدعم العضويات"],
    ],
    usesTitle: ["Best-fit members", "أنسب الأعضاء"],
    lenses: [["Talent access", "الوصول للكفاءات"], ["Amenity", "الخدمات"], ["Hotels and visits", "الفنادق والزيارات"], ["Transit", "النقل"], ["Market", "السوق"]],
  },
  education: {
    hero: [
      ["School-age population", "السكان بعمر الدراسة", "41k", "10-min catchment", "نطاق 10 دقائق"],
      ["Catchment growth", "نمو النطاق", "+6%/yr", "new-suburb expansion", "توسّع ضواحٍ جديدة"],
      ["Schools per 10k children", "مدارس لكل 10 آلاف طفل", "4.8", "capacity pressure signal", "مؤشر ضغط السعة"],
      ["Drop-off capacity", "سعة النزول والصعود", "Good", "site traffic assessment", "تقييم حركة الموقع"],
    ],
    uses: [
      ["Nursery", "حضانة", 5, "Young-family growth and underserved ratio", "نمو أسر شابة ونسبة خدمات منخفضة"],
      ["K-12 international", "مدرسة عالمية", 4, "Fee capacity in the income mix", "قدرة على الرسوم في مزيج الدخل"],
      ["K-12 national", "مدرسة أهلية", 4, "Volume demand from catchment scale", "طلب حجمي من اتساع النطاق"],
      ["Training institute", "معهد تدريب", 3, "Works if evening access is easy", "يصلح مع سهولة الوصول مساءً"],
    ],
    usesTitle: ["Best-fit operators", "أنسب المشغّلين"],
    lenses: [["Family catchment", "النطاق العائلي"], ["Growth", "النمو"], ["Competition", "المنافسة"], ["Site and drop-off", "الموقع والحركة"], ["Licensing", "الترخيص"]],
  },
  land: {
    hero: [
      ["Planning envelope", "الغلاف التخطيطي", "FAR 2.5", "per owner-supplied documents", "بحسب مستندات المالك"],
      ["Frontages", "الواجهات", "2", "corner plot", "قطعة زاوية"],
      ["Utilities at plot", "الخدمات عند القطعة", "3 of 4", "power, water, fiber; sewer nearby", "كهرباء وماء وألياف؛ صرف قريب"],
      ["White land fee tier", "شريحة رسوم الأراضي البيضاء", "Tier 2", "7.5%/yr under the 2025 tiers (MOMRAH)", "7.5% سنوياً وفق شرائح 2025 (وزارة البلديات والإسكان)"],
    ],
    uses: [
      ["Residential compound", "مجمع سكني", 5, "Catchment growth and plot scale fit residential", "نمو النطاق وحجم القطعة يناسبان السكني"],
      ["Mixed-use", "متعدد الاستخدامات", 4, "Corner frontage supports podium retail", "الزاوية تدعم تجزئة الدور الأرضي"],
      ["Commercial strip", "شريط تجاري", 4, "Road exposure carries convenience retail", "الظهور على الطريق يحمل تجزئة يومية"],
      ["Office", "مكاتب", 3, "Depends on corridor office demand", "يعتمد على طلب المكاتب في المحور"],
      ["Hotel", "فندق", 2, "Demand generators are limited here", "مولدات الطلب محدودة هنا"],
    ],
    usesTitle: ["Highest and best use", "الاستخدام الأعلى والأفضل"],
    lenses: [["Planning envelope", "الغلاف التخطيطي"], ["Holding cost", "تكلفة الاحتفاظ"], ["Infrastructure", "البنية التحتية"], ["Development context", "سياق التطوير"], ["Market", "السوق"]],
    note: ["Land benchmarks come from Ministry of Justice transaction records when shown; white land fee context per the 2025 MOMRAH tiers. Develop-or-sell economics change materially under the fee tiers.", "تُستمد معايير الأراضي من سجلات وزارة العدل عند عرضها، وسياق رسوم الأراضي البيضاء وفق شرائح 2025. اقتصاديات التطوير أو البيع تتغير جوهرياً مع الشرائح."],
  },
  gas_station: {
    hero: [
      ["Vehicles per day", "مركبات يومياً", "34k", "fronting road", "الطريق الأمامي"],
      ["Bidirectional access", "وصول من الاتجاهين", "Yes", "signalized corner, no U-turn needed", "زاوية بإشارة دون التفاف"],
      ["Nearest competing station", "أقرب محطة منافسة", "2.4 km", "same traffic flow", "على التدفق نفسه"],
      ["Retail engine potential", "إمكانات المتجر", "High", "C-store and drive-thru pad", "متجر وممر سيارات"],
    ],
    uses: [
      ["Fuel + C-store", "وقود ومتجر", 5, "Traffic volume with strong convenience capture", "حجم مرور مع التقاط قوي للمتجر"],
      ["Fuel + drive-thru F&B", "وقود ومطعم سيارات", 4, "Commuter flow suits morning F&B", "تدفق الموظفين يناسب فطور السيارات"],
      ["Urban compact + EV", "حضري مدمج + شحن كهربائي", 4, "Forward-fit for the EV transition", "جاهزية لتحول المركبات الكهربائية"],
      ["Highway travel plaza", "محطة طريق سريع", 2, "Plot depth suits urban format better", "عمق القطعة يناسب النمط الحضري"],
    ],
    usesTitle: ["Best-fit formats", "أنسب الصيغ"],
    lenses: [["Traffic flow", "تدفق المرور"], ["Access geometry", "هندسة الوصول"], ["Network spacing", "تباعد الشبكة"], ["Retail engine", "محرك التجزئة"], ["Compliance", "الاشتراطات"]],
  },
  entertainment: {
    hero: [
      ["Families in 15-min", "أسر ضمن 15 دقيقة", "96k", "GASTAT basis", "أساس الهيئة العامة للإحصاء"],
      ["Youth share", "نسبة الشباب", "38%", "under 30", "دون 30 سنة"],
      ["Anchor co-tenancy", "تجاور المراسي", "1 mall", "within 5-min", "ضمن 5 دقائق"],
      ["Venues per 100k", "مرافق لكل 100 ألف", "1.8", "below city average", "أقل من متوسط المدينة"],
    ],
    uses: [
      ["Family entertainment", "ترفيه عائلي", 5, "Family density with low venue saturation", "كثافة أسر وتشبّع منخفض"],
      ["Cinema", "سينما", 4, "Youth share supports evening demand", "نسبة الشباب تدعم الطلب المسائي"],
      ["Fitness", "لياقة", 4, "Working-age catchment fits memberships", "نطاق بعمر العمل يناسب العضويات"],
      ["Edutainment", "ترفيه تعليمي", 3, "Family fit, school partnerships decide scale", "ملاءمة عائلية وتحدد الشراكات المدرسية الحجم"],
    ],
    usesTitle: ["Best-fit concepts", "أنسب المفاهيم"],
    lenses: [["Family catchment", "النطاق العائلي"], ["Youth demand", "طلب الشباب"], ["Anchors", "المراسي"], ["Competition", "المنافسة"], ["Licensing", "الترخيص"]],
  },
  wedding_hall: {
    hero: [
      ["Catchment in 20-min", "النطاق ضمن 20 دقيقة", "1.1M", "resident population", "سكان مقيمون"],
      ["Parking capacity", "سعة المواقف", "220", "on-site bays", "مواقف داخل الموقع"],
      ["Zoning suitability", "ملاءمة النطاق", "OK", "noise and access rules", "أنظمة الضوضاء والوصول"],
      ["Seasonality", "الموسمية", "Peak", "wedding-season demand curve", "منحنى مواسم الزواج"],
    ],
    uses: [
      ["Weddings", "أفراح", 5, "Catchment scale and parking fit the format", "اتساع النطاق والمواقف يناسبان الصيغة"],
      ["Istiraha and private events", "استراحات ومناسبات خاصة", 4, "Weekday utilization between peaks", "استغلال أيام الأسبوع بين الذروات"],
      ["Corporate events", "فعاليات شركات", 3, "Depends on finish level and AV", "يعتمد على التشطيب والتجهيزات"],
      ["Conferences", "مؤتمرات", 2, "Format competes with hotel ballrooms", "الصيغة تنافس قاعات الفنادق"],
    ],
    usesTitle: ["Best-fit events", "أنسب المناسبات"],
    lenses: [["Catchment", "النطاق"], ["Parking", "المواقف"], ["Zoning and noise", "النطاق والضوضاء"], ["Seasonality", "الموسمية"], ["Competition", "المنافسة"]],
  },
  worker_housing: {
    hero: [
      ["Industrial zone", "المنطقة الصناعية", "9 min", "drive to nearest zone", "قيادة لأقرب منطقة"],
      ["Active projects nearby", "مشاريع نشطة قريبة", "4", "construction and logistics", "إنشاءات ولوجستيات"],
      ["Transport routes", "خطوط النقل", "Good", "bus-route accessibility", "سهولة خطوط الحافلات"],
      ["Compliance status", "حالة الاشتراطات", "Check", "municipal labor-housing rules", "اشتراطات إسكان العمالة البلدية"],
    ],
    uses: [
      ["Contractor housing", "إسكان مقاولين", 5, "Project pipeline drives block demand", "خط المشاريع يقود طلب الوحدات"],
      ["Industrial operators", "مشغلون صناعيون", 4, "Zone proximity cuts transport cost", "قرب المنطقة يخفض كلفة النقل"],
      ["Logistics staff", "كوادر اللوجستيات", 4, "Warehouse corridors within reach", "محاور المستودعات في المتناول"],
      ["Hospitality staff", "كوادر الضيافة", 2, "Distance to hotel districts limits fit", "البعد عن أحياء الفنادق يحد الملاءمة"],
    ],
    usesTitle: ["Best-fit occupiers", "أنسب الشاغلين"],
    lenses: [["Zone proximity", "قرب المناطق"], ["Transport", "النقل"], ["Compliance", "الاشتراطات"], ["Capacity economics", "اقتصاديات السعة"], ["Demand", "الطلب"]],
  },
  self_storage: {
    hero: [
      ["Apartment share", "نسبة الشقق", "64%", "housing mix in 10-min", "مزيج السكن ضمن 10 دقائق"],
      ["Resident density", "الكثافة السكانية", "High", "10-min catchment", "نطاق 10 دقائق"],
      ["Access road", "طريق الوصول", "Good", "van and pickup friendly", "مناسب للفانات"],
      ["Competitors in 10-min", "منافسون ضمن 10 دقائق", "0", "first-mover catchment", "نطاق بلا منافس"],
    ],
    uses: [
      ["Household storage", "تخزين منزلي", 5, "Apartment-heavy mix drives demand", "غلبة الشقق تقود الطلب"],
      ["SME inventory", "مخزون منشآت صغيرة", 4, "Access suits small-business restock", "الوصول يناسب تموين الأعمال الصغيرة"],
      ["E-commerce micro-fulfilment", "تنفيذ مصغّر للتجارة الإلكترونية", 3, "Works at small scale, ceiling limits racking", "يصلح بحجم صغير وسقف الارتفاع يحد الرفوف"],
      ["Archives", "أرشفة", 3, "Steady but price-sensitive demand", "طلب مستقر لكنه حساس للسعر"],
    ],
    usesTitle: ["Best-fit demand", "أنسب الطلب"],
    lenses: [["Density", "الكثافة"], ["Housing mix", "مزيج السكن"], ["Access", "الوصول"], ["Competition", "المنافسة"], ["Awareness", "الظهور"]],
  },
  hospitality: {
    hero: [
      ["Corporate demand base", "قاعدة الطلب المؤسسي", "320k m²", "offices within 5-min", "مكاتب ضمن 5 دقائق"],
      ["Event venues in 10-min", "قاعات فعاليات ضمن 10 دقائق", "8", "demand generators", "مولدات الطلب"],
      ["Supply pipeline", "خط الإمداد", "2 hotels", "announced nearby", "معلنة قريباً"],
      ["Seasonality", "الموسمية", "Business-led", "weekday-weighted demand", "طلب مرجّح لأيام الأسبوع"],
    ],
    uses: [
      ["Serviced apartments", "شقق مخدومة", 5, "Long-stay corporate and relocation demand", "طلب إقامات طويلة للشركات والانتقال"],
      ["Business hotel", "فندق أعمال", 4, "Office base fills weekdays", "قاعدة المكاتب تملأ أيام الأسبوع"],
      ["Boutique", "بوتيك", 3, "Depends on the area character", "يعتمد على طابع المنطقة"],
      ["Economy", "اقتصادي", 3, "Rate positioning against supply pipeline", "تموضع سعري مقابل الإمداد القادم"],
    ],
    usesTitle: ["Best-fit formats", "أنسب الصيغ"],
    lenses: [["Demand generators", "مولدات الطلب"], ["Supply pipeline", "خط الإمداد"], ["Access", "الوصول"], ["Seasonality", "الموسمية"], ["Market", "السوق"]],
    note: ["For Makkah and Madinah listings, pilgrim-flow seasonality and Haram walking distance become the lead metrics (GASTAT tourism basis).", "لقوائم مكة والمدينة تصبح موسمية الحجاج والمعتمرين ومسافة المشي للحرم المقياسين الرئيسيين (أساس إحصاءات السياحة)."],
  },
  mixed_use: {
    hero: [
      ["Footfall index", "مؤشر حركة المشاة", "138", "podium retail basis", "أساس تجزئة الدور الأرضي"],
      ["Daytime population", "السكان نهاراً", "412k", "10-min catchment", "نطاق 10 دقائق"],
      ["Metro access", "الوصول للمترو", "8 min", "upper-floor office basis", "أساس مكاتب الأدوار العليا"],
      ["Amenity within 500m", "الخدمات ضمن 500م", "24", "F&B and retail units", "مطاعم وتجزئة"],
    ],
    uses: [
      ["Retail podium", "تجزئة الدور الأرضي", 5, "Footfall carries convenience and F&B", "حركة المشاة تحمل التجزئة اليومية والمطاعم"],
      ["Offices above", "مكاتب علوية", 4, "Transit and amenity fit office floors", "النقل والخدمات يناسبان الأدوار المكتبية"],
      ["Serviced floors", "أدوار مخدومة", 4, "Flex demand from the surrounding cluster", "طلب مرن من التجمّع المحيط"],
      ["Residential upper floors", "سكني علوي", 4, "Amenity-rich living for professionals", "سكن غني بالخدمات للمهنيين"],
    ],
    usesTitle: ["Best-fit stack", "أنسب التوزيع الرأسي"],
    lenses: [["Foot traffic", "حركة المشاة"], ["Talent access", "الوصول للكفاءات"], ["Amenity", "الخدمات"], ["Transit", "النقل"], ["Market", "السوق"]],
  },
};

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <span aria-label={`${n} / 5`} style={{ letterSpacing: 2, fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(n) ? "var(--harbor)" : "var(--silver-2)" }}>★</span>
      ))}
    </span>
  );
}

export function InvestorPanel({ ar, price, areaSqm }: { ar: boolean; price: number | null; areaSqm: number | null }) {
  const psm = price != null && areaSqm ? Math.round(price / areaSqm) : null;
  const L = getDictionary(ar ? "ar" : "en").locationScore;
  return (
    <div className="card pad" style={{ marginTop: 18, boxShadow: "none" }}>
      <div className="modhead">
        <Icon.coins size={18} />
        <span className="ttl">{L.investorView}</span>
        <span className="grow" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginTop: 4 }}>
        <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", padding: 14 }}>
          <div className="muted" style={{ fontSize: 11 }}>{L.askingPrice}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>{price != null ? `${Number(price).toLocaleString("en-US")} ${L.sar}` : L.onRequest}</div>
        </div>
        <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", padding: 14 }}>
          <div className="muted" style={{ fontSize: 11 }}>{L.pricePerSqm}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>{psm != null ? `${psm.toLocaleString("en-US")}` : L.na}</div>
        </div>
        <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", padding: 14 }}>
          <div className="muted" style={{ fontSize: 11 }}>{L.yieldTitle}</div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>{L.yieldBody}</div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginTop: 14, marginBottom: 0 }}>
        {L.rentCapNote}
      </p>
    </div>
  );
}

export default function LocationScore({ ar, district, assetType, dealType, price, areaSqm }: {
  ar: boolean; district: string; assetType: string; dealType?: string; price?: number | null; areaSqm?: number | null;
}) {
  const t = INTEL[assetType];
  const L = getDictionary(ar ? "ar" : "en").locationScore;
  const investor = dealType === "sale";
  if (!t && !investor) return null;
  return (
    <>
      {t && (
        <div className="card pad" style={{ marginTop: 18, boxShadow: "none" }}>
          <div className="modhead">
            <Icon.target size={18} />
            <span className="ttl">{L.scoreTitle}</span>
            <span className="grow" />
            <span className="tag">{L.sample}</span>
          </div>
          <div className="row gap16 wrap" style={{ alignItems: "center", marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 34, fontWeight: 500 }}>4.2</span>
            <div className="col" style={{ gap: 4 }}>
              <Stars n={4.2} size={17} />
              <span className="muted" style={{ fontSize: 12 }}>{`${L.ratingPre}${district}${L.ratingSuf}`}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginTop: 18 }}>
            {t.hero.map((k, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)", padding: 14 }}>
                <div className="muted" style={{ fontSize: 11 }}>{ar ? k[1] : k[0]}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 500, marginTop: 6 }}>{k[2] === "" ? (ar ? k[4] : k[3]) : k[2]}</div>
                {k[2] !== "" && <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>{ar ? k[4] : k[3]}</div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{ar ? t.usesTitle[1] : t.usesTitle[0]}</div>
            <div className="col" style={{ gap: 10, marginTop: 12 }}>
              {t.uses.map((u, i) => (
                <div key={i} className="row gap12 wrap" style={{ alignItems: "baseline" }}>
                  <span style={{ minWidth: 150, fontSize: 13.5, fontWeight: 600 }}>{ar ? u[1] : u[0]}</span>
                  <Stars n={u[2]} />
                  <span className="muted" style={{ fontSize: 12.5 }}>{ar ? u[4] : u[3]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="row gap8 wrap" style={{ marginTop: 18 }}>
            {t.lenses.map((l, i) => (<span key={i} className="chip" style={{ fontSize: 11.5 }}>{ar ? l[1] : l[0]}</span>))}
          </div>
          {t.note && <p className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>{ar ? t.note[1] : t.note[0]}</p>}
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginTop: t.note ? 8 : 12, marginBottom: 0 }}>
{L.scoreNote}
          </p>
        </div>
      )}
      {investor && <InvestorPanel ar={ar} price={price ?? null} areaSqm={areaSqm ?? null} />}
    </>
  );
}
