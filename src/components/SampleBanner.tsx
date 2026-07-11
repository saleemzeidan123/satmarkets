import { getDictionary } from "@/i18n/getDictionary";
export default function SampleBanner({ ar }: { ar: boolean }) {
  const t = getDictionary(ar ? "ar" : "en").chrome;
  return (
    <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
      {t.sampleData}
    </div>
  );
}
