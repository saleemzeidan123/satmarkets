"use client";
export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn primary no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
