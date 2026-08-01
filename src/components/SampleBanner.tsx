import { getDictionary } from "@/i18n/getDictionary";
export default function SampleBanner({ ar }: { ar: boolean }) {
  const t = getDictionary(ar ? "ar" : "en").chrome;
  return (
    <div className="mb-4 rounded-lg border border-amber-line/60 bg-amber-wash px-3 py-2 text-[0.75rem] text-amber-d">
      {t.sampleData}
    </div>
  );
}
