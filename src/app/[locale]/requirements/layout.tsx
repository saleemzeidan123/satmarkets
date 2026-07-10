import type { ReactNode } from "react";
import { pageMeta } from "@/lib/meta";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(
    params.locale,
    "/requirements",
    "Requirements | SAT Markets",
    "الطلبات | سات ماركتس",
    "Post what you need and let verified owners and licensed brokers come to you. The demand board for Riyadh commercial space.",
    "انشر ما تحتاجه ودع الملّاك الموثّقين والوسطاء المرخّصين يصلونك. لوحة الطلب للمساحات التجارية في الرياض.",
  );
}

export default function RequirementsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
