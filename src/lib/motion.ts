/**
 * RC12, finding 164. The motion a reduced-motion media query cannot reach.
 *
 * WHAT THE REGISTER RECORDED, AND WHAT IS ACTUALLY TRUE. Finding 164 named the
 * two `m.flyTo({ ..., duration: 650 })` calls in `ListingsMap.tsx` as "a
 * JavaScript duration that no reduced-motion query can reach". The class of
 * defect is real. That instance of it is not, and the evidence is in the
 * dependency rather than in our source, which is why reading our source alone
 * produced the wrong answer.
 *
 * `node_modules/maplibre-gl/dist/maplibre-gl.js` (4.7.1) defines
 *
 *   flyTo(t,i){if(!t.essential&&o.prefersReducedMotion){
 *     const a=e.M(t,["center","zoom","bearing","pitch","around"]);
 *     return this.jumpTo(a,i)} ... }
 *
 * and `easeTo` likewise sets `t.duration=0` under the same condition, where
 * `o.prefersReducedMotion` is a live getter over
 * `matchMedia("(prefers-reduced-motion: reduce)").matches`. So a `flyTo` with a
 * duration and no `essential: true` already becomes an instantaneous `jumpTo`
 * for a reader who has asked for reduced motion, and `duration: 650` is only
 * the value used by readers who have not. Drag inertia is guarded by the same
 * flag. Rewriting those call sites would have added a second, weaker copy of a
 * check the library already performs correctly, and the register entry is
 * corrected rather than obeyed.
 *
 * WHAT IS GENUINELY OUT OF REACH. CSS covers the platform's own animation:
 * `globals.css` zeroes every `animation-duration` and `transition-duration`
 * under `prefers-reduced-motion: reduce`, `sat-platform.css` zeroes the
 * `--dur-*` tokens, and `globals.css` sets `html{scroll-behavior:auto}`.
 *
 * That last one is the trap. `html{scroll-behavior:auto}` only decides what
 * `behavior: "auto"` means, and `"auto"` is the DEFAULT. A call that passes
 * `behavior: "smooth"` explicitly states its own behaviour and the CSS property
 * is never consulted, so five call sites animated scroll for every reader
 * regardless of the preference: the two chat transcripts, the advisor page
 * transcript, the marketing asset rail's paging buttons and the map explorer's
 * rail-to-selection sync. A chat transcript that smooth-scrolls on every message
 * is the worst of them, because it repeats for the whole length of a
 * conversation. SC 2.3.3 animation from interactions.
 *
 * THE SHAPE. One function, read at call time rather than cached at module load,
 * for the same reason MapLibre reads its getter live: the preference is an
 * operating-system setting a reader can change while the page is open, and a
 * value captured once at import would hold the answer from before they changed
 * it. There is no React state and no listener here on purpose. Nothing needs to
 * re-render when the preference changes; the next scroll simply asks again.
 *
 * `src/lib/motion.test.ts` holds the source guard: no file outside this one may
 * write a literal `behavior: "smooth"`, and no camera call may pass `essential`,
 * which is the single flag that would opt a `flyTo` back out of MapLibre's own
 * reduced-motion handling.
 */

/**
 * True when the reader has asked their operating system for reduced motion.
 *
 * False on the server, false where `matchMedia` is absent, and false if the
 * query throws. The failure direction is deliberate: an unanswerable question
 * about a preference is not a preference, and defaulting to "reduce" would
 * strip motion from readers who never asked for it, which is a different defect
 * rather than a safe one.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The value to pass as `behavior` to `scrollTo`, `scrollBy` or `scrollIntoView`.
 *
 * Returns `"auto"` under reduced motion, which is the same word the CSS
 * reduced-motion block writes into `html{scroll-behavior}`, so the explicit and
 * the inherited paths now agree instead of the explicit one overriding the
 * inherited one. The scroll still happens and still lands in the same place; it
 * arrives without the travel.
 */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
