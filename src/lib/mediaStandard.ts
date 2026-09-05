// The professional media standard: what a listing of this asset type has to show,
// and what the platform can honestly say about whether it shows it.
//
// ADV-2 asks for professional media requirements. The temptation is to write a
// checker that says "this listing has good photographs", and the platform cannot
// say that. It holds a count of files, a recorded plan type and a video link. It
// does not know what a photograph is a photograph OF. A model that scored the
// content of an image would be asserting a fact nobody established, which is the
// same defect as inventing a rent.
//
// So this module is deliberately two things that never merge.
//
// 1. A BRIEF. Per asset type, the views a professional listing carries, each with
//    the reason it matters to the person deciding. It is addressed to the lister,
//    it is guidance, and it is never scored, never rendered as a check, and never
//    turned into a claim about a listing on a public surface. A warehouse without
//    a photograph of its loading doors is under-shown; the platform states that
//    the view is expected, not that the listing failed it.
// 2. A STATUS, over the three things the record actually holds: how many
//    photographs are attached, whether a floor plan of a type this asset uses is
//    attached, and whether a video is attached. Countable, checkable, and nothing
//    else is claimed.
//
// The photograph minimum is derived rather than chosen: a set that cannot show
// every required view is short by construction. The generic floor from the
// completeness model (PHOTO_SET_MIN) still applies underneath, so the brief can
// raise the minimum for an asset type with more to show and can never lower it
// below the level at which any space is adequately shown.
//
// Quality is not verification (D24). Nothing here produces a colour, and no
// statement here may read as a check of a fact against an outside authority.
//
// Pure: no I/O, no React, no clock. No em dashes (Law 2). Western numerals in
// both locales (Law 7).

import { PHOTO_SET_MIN } from "./listingQuality";
import { planTypesFor, isPlanType, type PlanType } from "./planTypes";

// `required` a listing of this type is under-shown without it.
// `expected`  a professional listing carries it.
// `optional`  it helps, and its absence is not a gap.
export type ShotWeight = "required" | "expected" | "optional";

export interface MediaShot {
  key: string;
  weight: ShotWeight;
  label_en: string;
  label_ar: string;
  // Addressed to the lister, in the terms of the person who will look at it.
  why_en: string;
  why_ar: string;
}

const SHOT = (
  key: string,
  weight: ShotWeight,
  label_en: string,
  label_ar: string,
  why_en: string,
  why_ar: string,
): MediaShot => ({ key, weight, label_en, label_ar, why_en, why_ar });

// The views every commercial space is under-shown without, whatever it is.
const BASE: MediaShot[] = [
  SHOT(
    "approach", "required",
    "The approach from the street", "الوصول من الشارع",
    "How a visitor arrives, and what the building looks like from outside it. A space photographed only from within tells a viewer nothing about reaching it.",
    "كيف يصل الزائر، وكيف يبدو المبنى من الخارج. المساحة المصوّرة من الداخل فقط لا تخبر الزائر شيئاً عن الوصول إليها.",
  ),
  SHOT(
    "entrance", "required",
    "The entrance and the way in", "المدخل وطريق الدخول",
    "The door a visitor uses and what stands between the street and the space. Entry is the first thing an occupier asks about and the last thing most listings show.",
    "الباب الذي يستخدمه الزائر وما يفصل الشارع عن المساحة. الدخول أول ما يسأل عنه المستأجر وآخر ما تعرضه معظم العروض.",
  ),
  SHOT(
    "interior_wide", "required",
    "The space itself, corner to corner", "المساحة نفسها من زاوية إلى زاوية",
    "At least one frame that holds the whole span rather than a detail. A close photograph of a good corner is not evidence of the space around it.",
    "لقطة واحدة على الأقل تضم كامل الامتداد بدلاً من تفصيل. صورة قريبة لزاوية جيدة ليست دليلاً على المساحة حولها.",
  ),
  SHOT(
    "ceiling_services", "required",
    "Ceiling, lighting and visible services", "السقف والإنارة والخدمات الظاهرة",
    "What is above the head decides what a fit out costs. A viewer who cannot see the ceiling is guessing at the cost of changing it.",
    "ما يعلو الرأس يحدّد كلفة التجهيز. الزائر الذي لا يرى السقف يخمّن كلفة تغييره.",
  ),
  SHOT(
    "floor_condition", "expected",
    "The floor as it stands today", "الأرضية كما هي اليوم",
    "The condition handed over, not the condition after work. The difference is money, and a photograph settles it before a viewing.",
    "الحالة المسلّمة، لا الحالة بعد الأعمال. الفرق مبالغ حقيقية، والصورة تحسمه قبل المعاينة.",
  ),
  SHOT(
    "parking_access", "expected",
    "Parking and vehicle access", "المواقف ودخول المركبات",
    "Where a car goes and how it gets there. It decides more occupier decisions than any figure on the offer.",
    "أين تقف السيارة وكيف تصل. يحسم قرارات مستأجرين أكثر من أي رقم في العرض.",
  ),
];

// What each asset type needs beyond the base, because the fact that decides the
// deal is not the same fact for a warehouse and a clinic.
const EXTRA: Record<string, MediaShot[]> = {
  office: [
    SHOT("floorplate", "required", "The open floorplate", "المسطح المفتوح",
      "The usable span before partitions. A plan states the area; a photograph states whether it is one room or many.",
      "الامتداد القابل للاستخدام قبل القواطع. المخطط يذكر المساحة، والصورة تبيّن إن كانت غرفة واحدة أو عدة غرف."),
    SHOT("core", "expected", "The core: lifts, stairs and washrooms", "النواة: المصاعد والسلالم ودورات المياه",
      "Shared services a tenant inherits and cannot change. Their state is read as the state of the building.",
      "خدمات مشتركة يرثها المستأجر ولا يستطيع تغييرها. حالتها تُقرأ كحالة المبنى."),
    SHOT("view_out", "optional", "The view from the windows", "المنظر من النوافذ",
      "Daylight and outlook, which a plan cannot carry.",
      "الضوء الطبيعي والإطلالة، وهو ما لا يحمله المخطط."),
  ],
  serviced: [
    SHOT("workstations", "required", "The workstations as delivered", "محطات العمل كما تُسلّم",
      "A serviced offer is priced on what is already installed, so what is installed has to be visible.",
      "العرض المجهّز يُسعَّر على ما هو مركّب فعلاً، ولذلك يجب أن يكون المركّب مرئياً."),
    SHOT("shared_amenity", "expected", "Shared meeting rooms and amenity", "قاعات الاجتماعات والمرافق المشتركة",
      "What the rate includes beyond the desk, which is most of what separates one serviced offer from another.",
      "ما يشمله السعر إضافة إلى المكتب، وهو أكثر ما يفرّق عرضاً مجهّزاً عن آخر."),
  ],
  retail: [
    SHOT("frontage", "required", "The shopfront and its full width", "الواجهة وكامل عرضها",
      "Frontage is what a retail tenant is buying. One frame showing it end to end is worth more than the interior set.",
      "الواجهة هي ما يشتريه مستأجر التجزئة. لقطة واحدة تُظهرها من طرف إلى طرف أثمن من مجموعة صور داخلية."),
    SHOT("street_context", "required", "The unit in its row, both directions", "الوحدة ضمن صفّها في الاتجاهين",
      "What sits either side. Neighbouring trade is a fact a viewer needs and a plan never shows.",
      "ما يقع على الجانبين. النشاط المجاور حقيقة يحتاجها الزائر ولا يُظهرها المخطط أبداً."),
    SHOT("back_of_house", "expected", "Storage and back of house", "المخزن والمناطق الخلفية",
      "Stock space and staff access, which decide whether the shop can trade at the volume it was taken for.",
      "مساحة البضاعة ودخول العاملين، وهما يحدّدان قدرة المحل على العمل بالحجم المطلوب."),
    // PKG-LISTING-CREATION-1B, added on Fable review: an F&B tenant is
    // priced into "retail" (labels.ts) with no shot naming what actually
    // decides whether the unit can be fitted out as a restaurant or cafe.
    SHOT("fnb_services", "expected", "Kitchen extraction, grease trap and gas provision", "شفط المطبخ ومصيدة الدهون وتمديد الغاز",
      "For a food and beverage tenant these decide whether the unit can be fitted out at all, and an extraction route to the roof is often the one thing that cannot be added later.",
      "بالنسبة لمستأجر مطعم أو مقهى، تحدّد هذه العناصر إمكانية تجهيز الوحدة أصلاً، ومسار الشفط إلى السطح غالباً ما يكون العنصر الوحيد الذي يتعذّر إضافته لاحقاً."),
    SHOT("outdoor_seating", "optional", "Outdoor seating area and its frontage", "منطقة الجلسات الخارجية وواجهتها",
      "A real driver of value for a cafe or restaurant tenant, and a fact a plan does not carry.",
      "عامل مهم في قيمة الوحدة لمستأجري المقاهي والمطاعم، وهو ما لا يُظهره المخطط."),
  ],
  showroom: [
    SHOT("frontage", "required", "The display frontage", "واجهة العرض",
      "Glazing and visibility from the road, which is the whole basis of a showroom rent.",
      "الزجاج والوضوح من الطريق، وهو أساس إيجار المعرض كله."),
    SHOT("clear_span", "expected", "The clear span and column positions", "الامتداد الصافي ومواقع الأعمدة",
      "Columns decide what can be displayed and where. A stated area does not.",
      "الأعمدة تحدّد ما يمكن عرضه وأين. المساحة المذكورة لا تفعل ذلك."),
    // PKG-LISTING-CREATION-1B, added on Fable review.
    SHOT("mezzanine", "expected", "The mezzanine, where one exists", "الميزانين، إن وُجد",
      "Saudi showrooms very often carry one, and it is extra area a stated ground-floor size does not capture.",
      "كثيراً ما تضم المعارض التجارية في السعودية ميزانيناً، وهو مساحة إضافية لا يعكسها المقاس المذكور للدور الأرضي."),
  ],
  medical: [
    SHOT("services_provision", "required", "Drainage, water and power provision", "تصريف المياه والتغذية بالماء والكهرباء",
      "A clinic fit out lives or dies on services already in the slab. Their absence is the single largest hidden cost.",
      "تجهيز العيادة يتوقف على الخدمات الموجودة أصلاً في الأرضية. غيابها أكبر كلفة خفية على الإطلاق."),
    SHOT("layout_rooms", "expected", "Existing room divisions", "التقسيمات القائمة للغرف",
      "What can be reused as consulting rooms, and what has to come down.",
      "ما يمكن إعادة استخدامه كغرف كشف، وما يجب إزالته."),
  ],
  warehouse: [
    SHOT("loading", "required", "Loading doors and dock arrangement", "أبواب التحميل وترتيب الأرصفة",
      "Door count, height and type decide what vehicle can serve the building. No figure on the offer replaces seeing them.",
      "عدد الأبواب وارتفاعها ونوعها تحدّد المركبة التي تخدم المبنى. لا رقم في العرض يغني عن رؤيتها."),
    SHOT("clear_height", "required", "Internal height with a reference in frame", "الارتفاع الداخلي مع مرجع في الصورة",
      "A stated clear height and a photograph of the roof structure are two different facts. Photograph both, with something of known size in shot.",
      "الارتفاع الصافي المذكور وصورة هيكل السقف حقيقتان مختلفتان. صوّر الاثنين مع جسم معروف الحجم في الإطار."),
    SHOT("yard", "required", "The yard and turning area", "الساحة ومنطقة الدوران",
      "Whether a trailer can turn is a yes or a no, and it ends more warehouse searches than rent does.",
      "قدرة المقطورة على الدوران إجابة نعم أو لا، وهي تُنهي عمليات بحث عن المستودعات أكثر مما يفعل الإيجار."),
    SHOT("power", "expected", "The power supply and distribution board", "التغذية الكهربائية ولوحة التوزيع",
      "Available load decides which operations can take the building at all.",
      "الحمل المتاح يحدّد العمليات التي يمكنها استخدام المبنى أصلاً."),
    // PKG-LISTING-CREATION-1B, added on Fable review: assetFields.ts already
    // records sprinkler_type and civil_defense_approved for this asset type
    // with no shot asking for evidence of either.
    SHOT("fire_protection", "expected", "Fire protection: sprinklers, pump room and hydrants", "أنظمة الحماية من الحريق: الرشاشات وغرفة المضخات والحنفيات",
      "Civil Defense approval decides whether a tenant can be licensed in the building at all, and it is usually the first thing a logistics tenant's safety officer asks to see.",
      "تحدّد موافقة الدفاع المدني إمكانية ترخيص المستأجر في المبنى أصلاً، وغالباً ما تكون أول ما يطلب مسؤول السلامة لدى مستأجر لوجستي رؤيته."),
  ],
  self_storage: [
    SHOT("unit_range", "required", "The range of unit sizes", "نطاق أحجام الوحدات",
      "The offer is a set of sizes, not one space, so the set is what has to be shown.",
      "العرض مجموعة أحجام لا مساحة واحدة، ولذلك يجب عرض المجموعة."),
    SHOT("corridor_access", "expected", "Corridors, lifts and loading access", "الممرات والمصاعد ومداخل التحميل",
      "How a customer moves goods in, which is the service being sold.",
      "كيف ينقل العميل بضاعته إلى الداخل، وهي الخدمة المباعة."),
  ],
  education: [
    SHOT("teaching_space", "required", "A teaching space as it stands", "مساحة تعليمية كما هي",
      "Room size and daylight against the standard the operator has to meet.",
      "حجم الغرفة والإضاءة الطبيعية مقابل المعيار الذي يلتزم به المشغّل."),
    SHOT("outdoor", "required", "Outdoor and assembly area", "المساحة الخارجية ومنطقة التجمّع",
      "Open area is a licensing input, not an amenity, and it is rarely stated in figures.",
      "المساحة المفتوحة مدخل ترخيصي لا رفاهية، ونادراً ما تُذكر بالأرقام."),
    SHOT("drop_off", "expected", "The drop off and gate arrangement", "ترتيب الإنزال والبوابة",
      "Arrival at the start of a school day is the constraint an operator plans around.",
      "الوصول في بداية اليوم الدراسي هو القيد الذي يخطط المشغّل حوله."),
  ],
  hospitality: [
    SHOT("guest_facing", "required", "Guest facing spaces", "المساحات المواجهة للنزلاء",
      "Reception, lobby and the first room a guest sees, which set the grade of the offer.",
      "الاستقبال والبهو وأول غرفة يراها النزيل، وهي التي تحدّد مستوى العرض."),
    SHOT("back_of_house", "required", "Back of house and service route", "المناطق الخلفية ومسار الخدمة",
      "Kitchens, stores and staff circulation, which decide whether the operation runs at all.",
      "المطابخ والمخازن وحركة العاملين، وهي التي تحدّد إمكانية تشغيل المنشأة."),
    SHOT("room_typical", "expected", "A typical key, unstaged", "غرفة نموذجية دون تهيئة",
      "The room as it is on an ordinary day, because that is what the operator inherits.",
      "الغرفة كما هي في يوم عادي، لأن ذلك ما يرثه المشغّل."),
  ],
  land: [
    SHOT("boundaries", "required", "The boundaries, from each corner", "الحدود من كل ركن",
      "Where the plot stops. A survey states it and a photograph shows what is standing on the line today.",
      "أين تنتهي القطعة. الكروكي يذكر الحد والصورة تُظهر ما يقف عليه اليوم."),
    SHOT("road_frontage", "required", "Road frontage and access point", "واجهة الطريق ونقطة الدخول",
      "Frontage width and the road it faces carry most of the value of a plot.",
      "عرض الواجهة والطريق الذي تطل عليه يحملان معظم قيمة الأرض."),
    SHOT("adjacent_use", "expected", "What adjoins the plot on each side", "ما يجاور الأرض من كل جهة",
      "Neighbouring use is a fact about the plot, and it is the fact most often left out.",
      "الاستخدام المجاور حقيقة تخص الأرض، وهي أكثر حقيقة تُترك دون ذكر."),
    SHOT("levels", "optional", "Ground levels and existing works", "مناسيب الأرض والأعمال القائمة",
      "Cut and fill is a cost that arrives after the purchase.",
      "أعمال القطع والردم كلفة تظهر بعد الشراء."),
  ],
  mixed_use: [
    SHOT("component_split", "required", "Each component, shown separately", "كل مكوّن معروضاً على حدة",
      "A mixed use offer is several offers. Photographed as one, it reads as none of them.",
      "العرض متعدد الاستخدامات عدة عروض. تصويره كعرض واحد يجعله لا يمثل أياً منها."),
    SHOT("shared_circulation", "expected", "Shared circulation and separation", "الحركة المشتركة والفصل بين الاستخدامات",
      "How the uses meet, and whether they are separated where they must be.",
      "كيف تلتقي الاستخدامات، وهل تُفصل حيث يجب الفصل."),
  ],
  gas_station: [
    SHOT("forecourt", "required", "The forecourt and pump layout", "الساحة الأمامية وتوزيع المضخات",
      "Vehicle movement across the site is the operation, and it is only legible from an elevated viewpoint.",
      "حركة المركبات عبر الموقع هي التشغيل نفسه، ولا تُقرأ بوضوح إلا من نقطة مرتفعة تُظهر الموقع بالكامل."),
    SHOT("canopy_signage", "expected", "Canopy, signage and lighting", "المظلة واللوحات والإنارة",
      "What a driver sees at speed, which decides whether they stop.",
      "ما يراه السائق مسرعاً، وهو ما يحدّد توقفه من عدمه."),
    // PKG-LISTING-CREATION-1B, added on Fable review: the kingdom's
    // fuel-station regulations make the prayer room, restrooms and store
    // mandatory (assetFields.ts already records them), and sub-tenancy
    // income from ancillary units is often a large part of what the site is
    // actually worth.
    SHOT("service_block", "expected", "Service block: mosque, restrooms and store", "مبنى الخدمات: المسجد ودورات المياه والمحل",
      "Required under the kingdom's fuel-station regulations and, in practice, what decides whether a station passes inspection.",
      "مطلوبة بموجب أنظمة محطات الوقود في المملكة، وهي عملياً ما يحدّد اجتياز المحطة للتفتيش."),
    SHOT("ancillary_units", "expected", "Ancillary income units (quick service, tyre and oil service)", "الوحدات التأجيرية الإضافية (مطاعم سريعة، خدمة الإطارات والزيوت)",
      "Sub-tenancy income from these units is often a large part of what the offer is actually worth.",
      "غالباً ما يشكّل دخل التأجير من الباطن لهذه الوحدات جزءاً كبيراً من القيمة الفعلية للعرض."),
  ],
  wedding_hall: [
    SHOT("main_hall", "required", "The main hall at full width", "الصالة الرئيسية بكامل عرضها",
      "Capacity is read from the volume, and a stated seat count is not the same claim.",
      "السعة تُقرأ من الحجم، وعدد المقاعد المذكور ليس الادعاء نفسه."),
    SHOT("service_kitchen", "expected", "Catering kitchen and service route", "مطبخ الضيافة ومسار الخدمة",
      "Whether the hall can serve the number it seats.",
      "هل تستطيع الصالة خدمة العدد الذي تتسع له."),
    // PKG-LISTING-CREATION-1B, added on Fable review: Saudi wedding halls
    // are almost always run as two separate sections, and "the main hall"
    // alone does not say whether or how well they are separated.
    SHOT("sections_separate", "expected", "Each section shown separately, with its own entrance", "كل قسم معروضاً على حدة، بمدخله الخاص",
      "Saudi wedding halls are almost always run as two separate sections, men's and women's, each with its own entrance and often its own parking. A buyer or operator prices on both sections and how well they are separated.",
      "تُدار قاعات الأفراح في السعودية غالباً كقسمين منفصلين للرجال والنساء، لكل منهما مدخله الخاص وغالباً موقفه الخاص. يقيّم المشتري أو المشغّل القسمين معاً ومدى الفصل بينهما."),
    SHOT("bride_suite", "expected", "Bride's suite and preparation rooms", "جناح العروسة وغرف التجهيز",
      "A standard expectation for this asset type and part of what a booking is priced against.",
      "توقّع معتاد لهذا النوع من الأصول، وجزء مما يُسعَّر الحجز بناءً عليه."),
  ],
  worker_housing: [
    SHOT("room_typical", "required", "A typical room with its occupancy", "غرفة نموذجية مع عدد شاغليها",
      "Occupancy per room is the compliance question, and it is answered by the photograph or not at all.",
      "عدد شاغلي الغرفة هو سؤال الالتزام، ويُجاب عنه بالصورة أو لا يُجاب."),
    SHOT("amenity_block", "required", "Washrooms, kitchen, dining and prayer room", "دورات المياه والمطبخ وصالة الطعام والمصلى",
      "Shared facilities against the head count they serve.",
      "المرافق المشتركة مقابل عدد الأشخاص الذين تخدمهم."),
    // PKG-LISTING-CREATION-1B, added on Fable review: this asset type is
    // bought and licensed on compliance and utilities more than on the room
    // itself, and assetFields.ts already records perimeter_security and
    // bus_parking with no shot asking for evidence of either.
    SHOT("fire_safety", "expected", "Fire exits and extinguishers", "مخارج الطوارئ وطفايات الحريق",
      "The Civil Defense approval a labor camp needs to operate turns on this, and it is the first thing an inspection checks.",
      "عليها تتوقف موافقة الدفاع المدني اللازمة لتشغيل السكن العمالي، وهي أول ما يُراجَع في أي تفتيش."),
    SHOT("compound_perimeter", "expected", "Compound gate, perimeter and bus bay", "بوابة المجمّع والسور وموقف الحافلات",
      "Security and worker transport are both licensing questions for this asset type, not amenities.",
      "الأمن ونقل العمال كلاهما مسألة ترخيص لهذا النوع من الأصول، لا رفاهية إضافية."),
    SHOT("utilities_provision", "expected", "Water tanks, sewage and backup power provision", "خزانات المياه والصرف الصحي ومصدر الطاقة الاحتياطي",
      "Many camps run on tankered water and a generator rather than a network connection, and which one decides real operating cost.",
      "يعتمد كثير من المجمعات على تعبئة المياه بالصهاريج ومولد كهربائي بدل التوصيل بالشبكة، ومعرفة ذلك تحدّد التكلفة التشغيلية الفعلية."),
  ],
  entertainment: [
    SHOT("main_volume", "required", "The main volume, including height", "الحجم الرئيسي بما فيه الارتفاع",
      "Attractions are constrained by height before they are constrained by area.",
      "الألعاب والفعاليات مقيّدة بالارتفاع قبل أن تُقيَّد بالمساحة."),
    SHOT("visitor_flow", "expected", "Entry, queuing and exit route", "الدخول والانتظار ومسار الخروج",
      "Where visitors gather, which is a safety input and a design input at once.",
      "أين يتجمع الزوار، وهو مدخل للسلامة ومدخل للتصميم في آن واحد."),
  ],
};

// The asset types this module carries a specific brief for. A type outside the
// list still gets the base brief and the shared plan taxonomy fallback, which is
// the honest answer rather than an invented set of views.
export const MEDIA_ASSET_TYPES: string[] = Object.keys(EXTRA);

export interface MediaStandard {
  asset_type: string;
  shots: MediaShot[];
  // Every required view needs at least one frame, so the minimum cannot be lower
  // than the number of required views. The generic floor still applies, so a type
  // with little to show is not thereby adequately shown by two photographs.
  minPhotos: number;
  // The plan a listing of this type is expected to carry, from the shared plan
  // taxonomy rather than a second opinion held here.
  planType: PlanType;
  planAllowed: PlanType[];
}

export function mediaStandardFor(assetType: string): MediaStandard {
  const shots = [...BASE, ...(EXTRA[assetType] ?? [])];
  const required = shots.filter((s) => s.weight === "required").length;
  const plans = planTypesFor(assetType);
  return {
    asset_type: assetType,
    shots,
    minPhotos: Math.max(PHOTO_SET_MIN, required),
    planType: plans.def,
    planAllowed: plans.allowed,
  };
}

// What the record actually holds. Counts and recorded types only: nothing here
// describes the content of a file, because nothing knows it.
export interface MediaHeld {
  photos: number;
  // The plan_type recorded against each attached plan. A null entry is a plan
  // whose type was never recorded, which counts as a plan and not as the right
  // one, because an unrecorded type is unknown rather than correct.
  planTypes: (string | null)[];
  video: boolean;
}

export type MediaRequirementKey = "photo_count" | "plan" | "plan_type" | "video";

export interface MediaRequirement {
  key: MediaRequirementKey;
  weight: "required" | "expected";
  met: boolean;
  statement_en: string;
  statement_ar: string;
}

export interface MediaStatus {
  standard: MediaStandard;
  requirements: MediaRequirement[];
  outstanding: MediaRequirement[];
  // True when nothing countable is outstanding. It is not a statement that the
  // listing is well photographed, and no surface may render it as one.
  countableComplete: boolean;
}

export function assessMedia(assetType: string, held: MediaHeld): MediaStatus {
  const standard = mediaStandardFor(assetType);
  const photos = Math.max(0, Math.floor(held.photos || 0));
  const plans = held.planTypes ?? [];
  const typed = plans.filter((p) => isPlanType(p)) as PlanType[];
  const rightType = typed.some((p) => standard.planAllowed.includes(p));

  const requirements: MediaRequirement[] = [
    {
      key: "photo_count",
      weight: "required",
      met: photos >= standard.minPhotos,
      statement_en: `${photos} of ${standard.minPhotos} photographs attached.`,
      statement_ar: `${photos} من ${standard.minPhotos} صور مرفقة.`,
    },
    {
      key: "plan",
      weight: "required",
      met: plans.length > 0,
      statement_en: plans.length > 0 ? `${plans.length} plan attached.` : "No plan attached.",
      statement_ar: plans.length > 0 ? `${plans.length} مخطط مرفق.` : "لا يوجد مخطط مرفق.",
    },
    {
      key: "video",
      weight: "expected",
      met: !!held.video,
      statement_en: held.video ? "A video walkthrough is attached." : "No video walkthrough attached.",
      statement_ar: held.video ? "يوجد فيديو للجولة." : "لا يوجد فيديو للجولة.",
    },
  ];

  // The plan type check only arises once a plan exists. Raising it against a
  // listing with no plan at all would report the same gap twice under two names.
  if (plans.length > 0) {
    requirements.splice(2, 0, {
      key: "plan_type",
      weight: "expected",
      met: rightType,
      statement_en: rightType
        ? "The attached plan is of a type this asset uses."
        : "The attached plan is not recorded as a type this asset uses.",
      statement_ar: rightType
        ? "المخطط المرفق من نوع يستخدمه هذا الأصل."
        : "المخطط المرفق غير مسجّل ضمن الأنواع التي يستخدمها هذا الأصل.",
    });
  }

  const outstanding = requirements.filter((r) => !r.met);
  return {
    standard,
    requirements,
    outstanding,
    countableComplete: outstanding.length === 0,
  };
}

export function shotWeightLabel(w: ShotWeight, ar: boolean): string {
  if (w === "required") return ar ? "مطلوبة" : "Required";
  if (w === "expected") return ar ? "متوقعة" : "Expected";
  return ar ? "اختيارية" : "Optional";
}

// ---------------------------------------------------------------------------
// Law 8, property media integrity
// ---------------------------------------------------------------------------
//
// Codex ADV-1C boundary 9. The law is stated in `docs/LAWS.md`; this is its
// machine-readable half, and `mediaStandard.test.ts` holds the two in step.
//
// The list below is an ALLOW LIST, not a deny list, and the direction matters
// more than the contents. A deny list of forbidden edits is a list of the
// capabilities that existed on the day it was written. The next model release
// adds one that is not on it and the omission reads as permission. Here an
// unlisted transformation is forbidden by `isPermittedMediaTransform` returning
// false for anything it does not recognise, so a new capability has to be ruled
// on before it can be used rather than after it has shipped.
//
// The line is not manual versus automatic. It is whether a reasonable viewer
// would conclude something different about the physical property. Exposure
// correction on a dark frame does not change the room. Removing the damp patch
// does. So does a generative upscale, because invented detail is
// indistinguishable from recorded detail once it is in the frame, which is the
// same defect as an invented rent figure wearing the clothes of a sourced one.

export type MediaTransform =
  | "exposure"
  | "white_balance"
  | "straighten"
  | "lens_correction"
  | "noise_reduction"
  | "downscale"
  | "format_convert"
  | "object_removal"
  | "object_insertion"
  | "sky_replacement"
  | "relight"
  | "generative_fill"
  | "generative_upscale"
  | "geometry_change"
  | "virtual_staging";

export interface MediaTransformRule {
  permitted: boolean;
  /** Why, in the terms of the law: what a viewer would or would not conclude. */
  reason: string;
}

export const MEDIA_TRANSFORMS: Record<MediaTransform, MediaTransformRule> = {
  exposure: {
    permitted: true,
    reason:
      "Corrects the camera's reading of the light, not the light. A room photographed dark is the same room, and a viewer concludes nothing different about it.",
  },
  white_balance: {
    permitted: true,
    reason:
      "Restores the colour a viewer standing in the room would have seen. It does not change a finish, and it may not be pushed to make one read as a different material.",
  },
  straighten: {
    permitted: true,
    reason:
      "Levels the horizon within the recorded frame. It moves no wall and adds nothing, though it must not be used to crop a defect out of view.",
  },
  lens_correction: {
    permitted: true,
    reason:
      "Removes distortion the lens introduced. It brings the frame closer to the geometry of the space rather than further from it.",
  },
  noise_reduction: {
    permitted: true,
    reason:
      "Suppresses sensor noise. Permitted only at a strength that does not erase surface texture, because erased texture is erased condition.",
  },
  downscale: {
    permitted: true,
    reason:
      "Delivery sizing. It removes resolution and invents none, so nothing appears that the camera did not record.",
  },
  format_convert: {
    permitted: true,
    reason:
      "Container and codec only. Every pixel it keeps is a recorded pixel.",
  },
  object_removal: {
    permitted: false,
    reason:
      "Changes condition, contents and defects. A frame with the crack taken out is a claim that there is no crack.",
  },
  object_insertion: {
    permitted: false,
    reason:
      "Puts something in the property that is not in the property. Whether it flatters or not is beside the point: it is a fact nobody established.",
  },
  sky_replacement: {
    permitted: false,
    reason:
      "Changes aspect, weather and the light the building actually receives, all of which a viewer reads as facts about the site.",
  },
  relight: {
    permitted: false,
    reason:
      "Synthesises light the space did not receive. Natural light is one of the things a viewer is looking at the photograph to judge.",
  },
  generative_fill: {
    permitted: false,
    reason:
      "Produces surroundings, extensions or surfaces that were never photographed, and presents them at the same weight as the ones that were.",
  },
  generative_upscale: {
    permitted: false,
    reason:
      "Invents detail the camera never resolved. Once in the frame it is indistinguishable from recorded detail, which is precisely why it is forbidden.",
  },
  geometry_change: {
    permitted: false,
    reason:
      "Alters apparent dimensions or proportions. Size is a term of the deal, and stretching a room is misstating it in a medium that reads as a record.",
  },
  virtual_staging: {
    permitted: false,
    reason:
      "Depicts a state the property is not in. It may exist only as a clearly labelled separate image beside the unaltered original, never in its place, and that workflow belongs to Listing Studio.",
  },
};

/**
 * An unrecognised transformation is forbidden, deliberately. The failure this
 * guards is a capability arriving and being used before anyone rules on it.
 */
export function isPermittedMediaTransform(t: string): boolean {
  return MEDIA_TRANSFORMS[t as MediaTransform]?.permitted === true;
}

export interface MediaDerivation {
  /** The retained, unmodified file as the lister delivered it. */
  originalRef: string | null;
  /** Every transformation applied to produce the derived file, in order. */
  transforms: string[];
  /** What applied them, and when. Traceability is a condition, not a note. */
  appliedBy: string | null;
  appliedAt: string | null;
}

export type MediaIntegrityFault =
  | "original_not_preserved"
  | "forbidden_transform"
  | "untraceable";

/**
 * The three obligations, checked. Returns every fault rather than the first,
 * because a derived file can fail all three and reporting one would hide two.
 *
 * An untraceable enhancement is treated as a forbidden one: a transformation
 * nobody can enumerate afterwards cannot be shown to be non-deceptive, and the
 * law puts the burden on the enhancement rather than on the reader.
 */
export function mediaIntegrityFaults(d: MediaDerivation): MediaIntegrityFault[] {
  const faults: MediaIntegrityFault[] = [];
  const derived = d.transforms.length > 0;
  if (derived && !d.originalRef) faults.push("original_not_preserved");
  if (d.transforms.some((t) => !isPermittedMediaTransform(t))) faults.push("forbidden_transform");
  if (derived && (!d.appliedBy || !d.appliedAt)) faults.push("untraceable");
  return faults;
}

/** A derived file may be published only when it commits no fault at all. */
export function mediaPublishable(d: MediaDerivation): boolean {
  return mediaIntegrityFaults(d).length === 0;
}
