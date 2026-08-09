"use client";
import { useRouter } from "next/navigation";

// PKG-DISCOVERY-1 slice C. The same "Try again" affordance MarketingHome wires
// inline (it is already a Client Component, so it can call `router.refresh()`
// directly). `/listings` is a Server Component and cannot hold that handler
// itself, so the one behaviour lives here instead of a second inline copy:
// re-run the current route's data fetch in place, without discarding the
// filters already in the URL.
export default function RetryButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className ?? "btn ghost"} onClick={() => router.refresh()}>
      {label}
    </button>
  );
}
