import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";
import { fill, formatRange } from "@/lib/format";
import { knownValue } from "@/lib/search/canonical";
import { listListers, listersPageInfo, type ListerRole } from "@/lib/queries/listers";
import ListerCard from "@/components/ListerCard";
import DataState from "@/components/DataState";
import RetryButton from "@/components/RetryButton";
import JsonLd, { SITE } from "@/components/JsonLd";

// PKG-DISCOVERY-1, item 6. The public directory of owners and licensed
// brokers who currently have at least one commercial space live on the
// exchange.
//
// WHY THIS PAGE EXISTS. No route named `/listers` previously existed at all
// (verified: zero matches for "listers" across routePolicy.ts, sitemap.ts,
// Header.tsx and SatFooter.tsx before this package), so a directory of
// "every lister/broker" was a contradiction waiting to happen the moment the
// roster passed whatever row cap the first version of this page would have
// shipped with. This route is written so that never becomes true:
// `listListers` paginates and returns a real `count: "exact"` total, never a
// number derived from the page it also returns, so a filter that matches 900
// listers says 900, not "24 shown, silence about the rest".
//
// THE THREE STATES A CLAIM ABOUT AN EXTERNAL RECORD SET CAN BE WRONG IN.
// `dataOk: false` (the database could not be reached) is not the same
// sentence as `total === 0` (the filter genuinely matches nobody), and
// neither is the same sentence as a page number past the end of a real,
// non-empty result set. All three get their own state below, per item 6's
// "loading, empty, unavailable and continuation-failure states".
type SP = { page?: string; role?: string };

const ROLES: ListerRole[] = ["owner", "broker"];

function pageParam(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) return {};
  const dl = getDictionary(params.locale).listers;
  return localeMeta(params.locale, "/listers", dl.metaTitle, dl.metaDesc);
}

export default async function ListersPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const dl = dict.listers;
  const lp = dict.listerPage;

  // Only a role this platform actually has is a filter; anything else is
  // dropped rather than guessed at, the same rule `canonical.ts` states for
  // every other query parameter this codebase reads off a URL.
  const role = (knownValue(searchParams.role, ROLES) as ListerRole | null) ?? null;
  const page = pageParam(searchParams.page);

  const result = await listListers({ page, role });
  const pageInfo = listersPageInfo(result.total, page, result.pageSize);
  const { totalPages, from, to } = pageInfo;
  // A page number past the end of a real, non-empty result set is a distinct
  // condition from "nothing matched": the filter is not empty, the number in
  // the URL just outran it. Item 6 names this its own state. `dataOk` gates it
  // here rather than inside the pure helper, because "past the end" is only a
  // meaningful claim once the total itself is known to be real.
  const pastEnd = result.dataOk && pageInfo.pastEnd;

  const roleLabel = (r: ListerRole) => (r === "broker" ? lp.roleBroker : lp.roleOwner);
  const hrefFor = (p: number, r: ListerRole | null) => {
    const sp = new URLSearchParams();
    if (r) sp.set("role", r);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/${locale}/listers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <JsonLd
        data={{
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dl.crumbHome, item: `${SITE}/${locale}` },
            { "@type": "ListItem", position: 2, name: dl.crumbListers, item: `${SITE}/${locale}/listers` },
          ],
        }}
      />
      {/* ItemList structured data is emitted only for the rows actually on this
          page, never the honest-but-unbacked total: schema.org ItemList members
          are meant to be the enumerated items, and a 900-member list this
          response does not carry would be the exact overclaim item 7 exists to
          stop. */}
      {result.dataOk && result.rows.length > 0 && (
        <JsonLd
          data={{
            "@type": "ItemList",
            itemListElement: result.rows.map((r, i) => ({
              "@type": "ListItem",
              position: from + i,
              url: `${SITE}/${locale}/lister/${r.id}`,
            })),
          }}
        />
      )}
      <div className="eyebrow">
        <Link href={`/${locale}`} style={{ color: "inherit", textDecoration: "none" }}>{dl.crumbHome}</Link>
        {" / "}{dl.crumbListers}
      </div>
      <h1 className="serif" style={{ fontSize: "2rem", fontWeight: 500, letterSpacing: "-.02em", margin: "10px 0 0", color: "var(--ink)" }}>{dl.h1}</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640, fontSize: "0.9375rem", lineHeight: 1.7 }}>{dl.intro}</p>

      <form method="get" className="row gap10 wrap" style={{ marginTop: 20, alignItems: "center" }}>
        <label htmlFor="lister-role" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{dl.filterLabel}</label>
        <select
          id="lister-role"
          name="role"
          defaultValue={role ?? ""}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--silver)", fontSize: "0.8125rem", background: "#fff", color: "var(--ink)" }}
        >
          <option value="">{dl.roleAll}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </select>
        <button type="submit" className="btn primary" style={{ height: 34 }}>{dl.applyFilter}</button>
        {role && <Link href={`/${locale}/listers`} className="muted" style={{ fontSize: "0.78125rem", textDecoration: "none" }}>{dl.clearFilter}</Link>}
      </form>

      {result.dataOk && result.total > 0 && !pastEnd && (
        <div role="status" aria-live="polite" className="muted" style={{ marginTop: 14, fontSize: "0.8125rem" }}>
          {fill(dl.showingRange, { range: formatRange(from, to, ar ? "ar" : "en", 0), total: result.total })}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {!result.dataOk ? (
          <DataState kind="error" title={dl.unavailableTitle} body={dl.unavailableBody} action={<RetryButton label={dl.retryLabel} />} />
        ) : pastEnd ? (
          <DataState
            kind="empty"
            title={dl.pageUnavailableTitle}
            body={dl.pageUnavailableBody}
            action={<Link href={hrefFor(1, role)} className="btn" style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 14px", borderRadius: 999, textDecoration: "none" }}>{dl.backToStart}</Link>}
          />
        ) : result.rows.length === 0 ? (
          <DataState
            kind="empty"
            title={dl.emptyTitle}
            body={dl.emptyBody}
            action={role ? <Link href={`/${locale}/listers`} className="btn" style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 14px", borderRadius: 999, textDecoration: "none" }}>{dl.clearFilter}</Link> : undefined}
          />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 260px), 1fr))", gap: 16 }}>
              {result.rows.map((r) => (
                <ListerCard
                  key={r.id}
                  lister={r}
                  ar={ar}
                  locale={locale}
                  sinceLabel={lp.since}
                  roleLabel={roleLabel(r.lister_type === "broker" ? "broker" : "owner")}
                  unnamedLabel={dl.unnamed}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <nav aria-label={dl.pageOf} className="row between" style={{ marginTop: 24, alignItems: "center" }}>
                {page > 1
                  ? <Link href={hrefFor(page - 1, role)} className="btn ghost" style={{ textDecoration: "none" }}>{dl.prevPage}</Link>
                  : <span />}
                <span className="muted" style={{ fontSize: "0.8125rem" }}>{fill(dl.pageOf, { page, pages: totalPages })}</span>
                {page < totalPages
                  ? <Link href={hrefFor(page + 1, role)} className="btn ghost" style={{ textDecoration: "none" }}>{dl.nextPage}</Link>
                  : <span />}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
