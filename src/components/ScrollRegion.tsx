"use client";

/**
 * RC11, findings 148 and 149. The horizontal scroller a wide region sits in.
 *
 * THE TWO DEFECTS THIS EXISTS FOR.
 *
 * Every data table in the platform declares a `minWidth` and sits in a
 * `<div style={{ overflowX: "auto" }}>`. That div is not focusable, carries no
 * role and has no name, so on any viewport narrower than the table a keyboard
 * or switch user cannot pan it. They can tab to links inside the table and be
 * scrolled by focus, which is not the same thing: the enquiry-count column on
 * the lister inventory contains nothing focusable at all, so it is simply
 * unreachable without a pointer. That is finding 149, SC 2.1.1 and SC 1.4.10.
 *
 * Separately, the mobile fit guard in `globals.css` set `table.dt{display:block}`
 * below 920px, which is the usual way people make a table scroll. It works, and
 * it removes the table role from the accessibility tree while `thead`, `tr`,
 * `th` and `td` keep their `display:table-*` values, so at exactly the width
 * where a reader most needs column context the header cells stop being
 * associated with the data cells. That is finding 148, SC 1.3.1.
 *
 * Both come from the same mistake: the table was made responsible for its own
 * overflow. It is not. A table is a grid of related cells; the box it does not
 * fit in belongs to the box. So `display:block` is deleted from the guard, the
 * `.scrollx` class owns overflow at every width, and this component owns the
 * part of that job which cannot be expressed in CSS.
 *
 * WHY THE ROLE AND THE TAB STOP ARE CONDITIONAL. The register recorded the
 * blocker honestly: "adding `tabIndex={0}` inserts a new stop into the tab order
 * of the inventory page and requires a name for it". Both halves are true, and
 * both only matter when the region actually scrolls. A wrapper that fits its
 * table is a plain div with nothing to pan; making it a tab stop there is a
 * keyboard user pressing Tab for a box that will not move, and making it a named
 * landmark is a screen reader announcing a region that adds nothing. So the
 * component measures, and states what is true at that size: `scrollWidth`
 * exceeding `clientWidth` is the same evidence the browser uses to decide
 * whether to paint a scrollbar. This is the reasoning finding 200 settled for
 * the sticky rail, applied again: let the layout decide, not the markup.
 *
 * It measures on mount, on its own resize and on the table's, because both
 * change independently. A viewport rotation resizes the wrapper; a filter that
 * removes a column resizes the table inside a wrapper that never moved.
 *
 * The server render is always the non-scrollable form, so the first client
 * render matches it and hydration is quiet; the effect then corrects it in the
 * same frame the browser lays out. A brief tab order that gains a stop is the
 * right failure direction: the alternative, guessing scrollable on the server
 * from a `minWidth` the server cannot compare to a viewport it cannot see, is a
 * claim about a measurement nobody took.
 *
 * WHY IT IS NOT CALLED `TableScroll`. It was, for the length of one afternoon,
 * because the three findings that produced it are all about data tables. Then
 * the sweep found the comparison grid on `/compare` and the deal stepper on
 * `/deal`: neither is a table, both declare a `minWidth`, and both are exactly
 * as unreachable by keyboard as the inventory table was. The defect is not a
 * property of tables. It is a property of any box that scrolls sideways and
 * says nothing about it, so the component and its class are named for the box.
 */

import { useEffect, useRef, useState } from "react";

export default function ScrollRegion({
  label,
  className,
  style,
  children,
}: {
  /** The region's own name, in the reader's language. For a table, the same string as its `<caption>`. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // One device pixel of tolerance: a fractional layout width must not be read
    // as overflow, or a table that fits exactly becomes a tab stop on some
    // zoom levels and not others.
    const measure = () => setScrollable(el.scrollWidth - el.clientWidth > 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `scrollx ${className}` : "scrollx"}
      style={style}
      {...(scrollable ? { tabIndex: 0, role: "region", "aria-label": label } : {})}
    >
      {children}
    </div>
  );
}
