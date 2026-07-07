// Live smoke run: fetch key routes EN and AR and assert brand and engine markers
// are present in the server-rendered HTML. Usage: node scripts/smoke.mjs [baseUrl]
const BASE = process.argv[2] || "https://satmarkets-sat-markets.vercel.app";
const checks = [
  { path: "/en", must: ["SAT Markets", "1200025510"] },
  { path: "/ar", must: ["1200025510"] },
  { path: "/en/rent-index", must: ["Rent Index", "Dataset", "Indicative"] },
  { path: "/en/market", must: ["market pulse", "Dataset", "BreadcrumbList"] },
  { path: "/ar/market", must: ["1200025510", "Dataset"] },
  { path: "/en/locations", must: ["BreadcrumbList", "Locations"] },
  { path: "/en/listings?district=d2222222-2222-2222-2222-222222222222", must: ["Al Olaya", "BreadcrumbList"] },
];
let failed = 0;
for (const c of checks) {
  try {
    const r = await fetch(BASE + c.path, { headers: { "user-agent": "sat-smoke" } });
    const html = await r.text();
    const miss = c.must.filter((m) => !html.includes(m));
    if (r.ok && miss.length === 0) console.log(`ok   ${c.path}`);
    else { failed++; console.log(`FAIL ${c.path} status=${r.status} missing=${JSON.stringify(miss)}`); }
  } catch (e) { failed++; console.log(`FAIL ${c.path} error=${e.message}`); }
}
console.log(failed ? `\n${failed} route(s) failed` : "\nAll routes passed");
process.exit(failed ? 1 : 0);
