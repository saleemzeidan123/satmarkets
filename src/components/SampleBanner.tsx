export default function SampleBanner({ ar }: { ar: boolean }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
      {ar ? "بيانات تجريبية لأغراض الاختبار، ليست بيانات سوق حقيقية." : "Sample data for platform testing. Not real market activity."}
    </div>
  );
}
