"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Two corrections to chrome that is pinned to the bottom of a phone screen. It
// draws nothing; it sets one custom property and one class on <html>, and the
// stylesheet does the rest.
//
// 1. THE BAR THAT FLOATS (iOS 26 Safari, WebKit bug 297779). After the on-screen
//    keyboard has been shown and dismissed, Safari can go on reporting a visual
//    viewport shorter than the window. `position: fixed; bottom: 0` is then laid
//    out against that shorter viewport, so the tab bar and the assistant button
//    hang in the middle of the screen with page content below them. Reported by
//    the owner on the live site on 2026-11-13, and seen on other sites that pin a
//    bar to the bottom.
//
//    The repair measures the gap between the window's height and the bottom of
//    the visual viewport and moves the pinned elements down by it, through
//    `--vv-gap`. It acts only when all three hold:
//      - the page is not pinch-zoomed (a zoomed visual viewport is smaller on
//        purpose, and moving chrome then would be the bug);
//      - no field is focused (a real keyboard is the one time the shorter
//        viewport is the truth, and the bar belongs above the keyboard);
//      - the gap is more than 40px (a scrollbar or a rounding difference is not
//        a stuck keyboard).
//    On a browser without the fault the gap is zero and nothing moves.
//
//    This cannot be reproduced without an iPhone on the affected system, so it
//    is a guarded repair written from the fault's description, to be confirmed
//    on the device that showed it.
//
// 2. THE ASSISTANT BUTTON OVER THE SEARCH BUTTON. On a phone the round assistant
//    button sits in the bottom corner, which on Home's first screen is exactly
//    where the end of the full-width Search button is. While that button is on
//    screen the assistant button steps back (`fab-yield`), and returns once the
//    form has been scrolled past.
export default function PhoneChrome() {
  const path = usePathname();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const fieldFocused = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable);
    };
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const gap = window.innerHeight - (vv.height + vv.offsetTop);
        const stuck = Math.abs(vv.scale - 1) < 0.01 && gap > 40 && !fieldFocused();
        root.style.setProperty("--vv-gap", stuck ? `${Math.round(gap)}px` : "0px");
      });
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("focusout", sync);
    window.addEventListener("focusin", sync);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("focusout", sync);
      window.removeEventListener("focusin", sync);
      root.style.removeProperty("--vv-gap");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const target = document.querySelector(".hm-form .hm-btn");
    if (!target || typeof IntersectionObserver === "undefined") { root.classList.remove("fab-yield"); return; }
    const io = new IntersectionObserver(([e]) => root.classList.toggle("fab-yield", e.isIntersecting));
    io.observe(target);
    return () => { io.disconnect(); root.classList.remove("fab-yield"); };
  }, [path]);

  return null;
}
