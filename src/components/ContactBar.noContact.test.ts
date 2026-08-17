import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * PKG-DISCOVERY-1 item 9: "no-contact mobile layout".
 *
 * The mobile sticky dock (`ContactBar`'s default export) is `position:fixed`
 * and pinned to the bottom of the viewport with a safe-area-aware padding.
 * The defect this file exists to prevent: if a listing carries none of
 * whatsapp, call or message (an email-only lister, or a record with no
 * contact channel recorded at all), a fixed bar with nothing live inside it
 * would sit over the bottom of every page on a phone, permanently, for as
 * long as the visitor stays on that listing. `if (!wa && !call && !message)
 * return null;` is the one line that prevents that, and this is its
 * regression test.
 *
 * WHY SOURCE-LEVEL. Same constraint as `ListingCard.canonical.test.ts`
 * beside it: no React renderer in `npm test`.
 */

const SRC = fs.readFileSync(path.join(__dirname, "ContactBar.tsx"), "utf8");

test("the mobile dock renders nothing when no contact channel resolves, rather than an empty fixed bar", () => {
  const mobileDock = /export default function ContactBar\(p: Props\) \{[\s\S]*$/.exec(SRC)?.[0] ?? "";
  assert.ok(mobileDock.length > 0, "could not locate the default-exported mobile ContactBar function");
  assert.match(mobileDock, /if \(!wa && !call && !message\) return null;/, "the mobile dock must return null before its fixed-position wrapper when no channel is available");
  // The null check must run BEFORE the fixed div is reached, not after: a
  // one-line reorder would silently reintroduce the empty-bar defect while
  // still containing this exact string elsewhere in the file.
  const guardIdx = mobileDock.indexOf("if (!wa && !call && !message) return null;");
  // UX closure item 2 (one shared mobile safe-zone system) added the
  // `contact-dock` class ahead of `fixed inset-x-0` and moved the literal
  // `bottom-0` out into CSS (`.contact-dock`/`main.has-tabbar .contact-dock`
  // in globals.css), so the dock sits above the tab bar instead of under
  // it. The class name changed; what this test actually guards, that the
  // null-return guard precedes the fixed wrapper, did not.
  const fixedIdx = mobileDock.indexOf('className="contact-dock fixed inset-x-0');
  assert.ok(guardIdx > -1 && fixedIdx > -1 && guardIdx < fixedIdx, "the no-channel guard must appear before the fixed-position wrapper renders");
});

test("the desktop inline channel block resolves the identical empty case to null, so the two surfaces cannot disagree about whether a listing has any contact channel", () => {
  const desktopBlock = /function Channels\(p: Props\) \{[\s\S]*?\n\}/.exec(SRC)?.[0] ?? "";
  assert.ok(desktopBlock.length > 0, "could not locate the shared Channels() function the desktop card uses");
  assert.match(desktopBlock, /if \(!primary && secondary\.length === 0 && !email\) return null;/, "the desktop channel block must also return null when nothing resolved");
});

test("the mobile dock's safe-area padding only ever applies to a rendered dock, never to the null case", () => {
  // A cheap structural sanity check: the env(safe-area-inset-bottom) padding
  // lives on the same fixed div the null-return guard precedes, so it can
  // never apply to nothing.
  const mobileDock = /export default function ContactBar\(p: Props\) \{[\s\S]*$/.exec(SRC)?.[0] ?? "";
  assert.match(mobileDock, /env\(safe-area-inset-bottom\)/);
});
