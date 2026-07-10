import type { ReactNode } from "react";
import { pageMeta } from "@/lib/meta";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(
    params.locale,
    "/advisor",
    "AI Advisor | SAT Markets",
    "المستشار الذكي | سات ماركتس",
    "Ask about any Riyadh commercial space and get an answer grounded in the verified Rent Index, never a figure from a model.",
    "اسأل عن أي مساحة تجارية في الرياض واحصل على إجابة مبنية على مؤشر الإيجارات الموثّق، لا رقماً من نموذج.",
  );
}

export default function AdvisorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
