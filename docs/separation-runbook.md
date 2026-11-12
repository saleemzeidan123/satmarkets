# Separation runbook

One page. What it takes to hand SAT Markets to a different operator (its own company, registration and licence), and what the repository already does to keep that cheap. Owner decision, 2026-11-12: the platform runs today under SAT Real Estate's registration and FAL 1200025510, and must stay easy to separate later.

## What is already in place (PKG-SEPARABILITY-1)

- `src/lib/operator.ts` is the single place the operator is defined: trading name in both scripts, licence number, website. The default is SAT Real Estate.
- Every dictionary string and every component string that names the operator passes through `rebrand` or `rebrandDeep`. With the default operator nothing changes, byte for byte.
- `src/lib/operator.test.ts` is the separation drill. It runs on every gate and fails if a second operator's configuration leaves any trace of the default operator in either dictionary, or if any source file names the default operator outside a `rebrand` call.

## Switching operator

Set all four, in the hosting environment, then redeploy. Setting only some of them fails the build on purpose.

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_OPERATOR_NAME_EN` | Trading name, Latin script |
| `NEXT_PUBLIC_OPERATOR_NAME_AR` | Trading name, Arabic script |
| `NEXT_PUBLIC_OPERATOR_LICENCE` | The new operator's FAL licence number, ten digits |
| `NEXT_PUBLIC_OPERATOR_URL` | The new operator's website, `https://host`, no path |

## What the switch does not do (the named residue)

1. **`public/llms.txt`** is a static file and names the operator and the licence. Rewrite it by hand.
2. **The operator called "SAT" for short.** The dictionaries use the bare word about 50 times in each language ("checked by SAT", "the SAT team"). `rebrand` leaves it alone because the platform's own name starts with the same word. A person rewords these. The drill pins the counts so they can fall but not rise.
3. **Sentences that are only true of the current arrangement**, for example the neutrality page's account of SAT Real Estate operating the platform and also listing on it. These are claims, not names. They are rewritten and re-entered in the claims ledger, not find-and-replaced.
4. **The legal drafts** (`src/lib/legalContent.ts`) are rebranded mechanically, and still need counsel's review under the new operator.

## Outside the repository, in order

1. New operator's registration and FAL licence in hand. The public text must not change before this, because until then the current licence is the one that covers the platform.
2. Counsel: operator disclosure wording, terms, privacy notice, complaints page, and assignment of lister agreements and supplier licences.
3. Accounts moved to the new operator: hosting, database, domain, email sending, analytics. Join this to any move of hosting into the Kingdom so that the platform moves once.
4. Domain: if the platform leaves `markets.satestate.com`, set `NEXT_PUBLIC_SITE_URL`, add the new host to the authentication redirect list, and keep a permanent redirect from every old address to its new one.
5. Set the four operator variables, rewrite the residue above, run the full gate, deploy.
6. Live check in both languages: footer, neutrality page, lister badge, structured data, legal pages.

## Keeping it cheap

- Listing and building identifiers do not encode the operator or the domain.
- New copy that names the operator goes in the dictionaries, written for the default operator, like the rest. The drill takes care of the remainder.
- New copy should say "the operator" or name SAT Real Estate in full instead of the bare word "SAT", so that the pinned short-form counts only go down.
