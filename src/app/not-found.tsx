import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="font-display text-6xl text-charcoal">404</div>
      <p className="mt-2 text-charcoal/60">This page could not be found.</p>
      <Link href="/en" className="btn-gold mt-5 px-5 py-2.5 text-sm">Back to SAT Markets</Link>
    </div>
  );
}
