import { JSDOM } from "jsdom";

// Minimal, explicit jsdom globals for real-DOM interaction tests (click,
// keydown, focus) that node:test's runner does not provide on its own. This
// project deliberately has no testing-library/vitest/jest: everything else
// in the suite runs on plain node:test + assert, and this file is the
// smallest thing that lets DraftPreview.interaction.test.tsx mount the real
// component and dispatch real events rather than re-deriving props twice
// (Codex review of 9132714: a "both directions" test that renders the same
// component twice with different initial locale props proves initial
// selection, not that clicking the toggle works).
//
// Import this file FIRST, before react-dom/client or the component under
// test, in any file that needs it: ESM evaluates a module's static imports
// in source order, so these globals exist before react-dom/client's own
// module body runs its environment checks.

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://preview.test/",
  pretendToBeVisual: true,
});

const w = dom.window;

// Node 24 predefines some of these globals (navigator, at minimum) as a
// getter with no setter, so a plain `globalThis.x = ...` throws in ESM's
// always-strict mode. defineProperty overrides them regardless of how the
// existing descriptor was shaped.
function set(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true, enumerable: true });
}

set("window", w);
set("document", w.document);
set("navigator", w.navigator);
set("HTMLElement", w.HTMLElement);
set("Element", w.Element);
set("Node", w.Node);
set("Event", w.Event);
set("MouseEvent", w.MouseEvent);
set("KeyboardEvent", w.KeyboardEvent);
set("customElements", w.customElements);
set("getComputedStyle", w.getComputedStyle.bind(w));
set("requestAnimationFrame", w.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)));
set("cancelAnimationFrame", w.cancelAnimationFrame ?? ((id: number) => clearTimeout(id)));

// Tells React this is a real test environment so act() applies its usual
// synchronous-flush guarantees without a "not configured to support act"
// console warning on every call.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

export { dom };
