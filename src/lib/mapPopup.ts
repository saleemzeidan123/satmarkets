// Map popups are built from nodes, never from an HTML string.
//
// The three popups on the maps used to be assembled as markup and handed to
// MapLibre's `setHTML`, with the values escaped by hand (and, in one of the
// three, not escaped at all: a district name went in raw). Hand escaping is the
// kind of defence that holds until the day someone adds a field and forgets it.
// A value set through `textContent` cannot become markup whatever it contains,
// so there is nothing left to forget, and the library's own HTML path is never
// given data (advisory GHSA-jrc7-96c5-q579 is about that path).
//
// The link, where there is one, is a same-site path built from a locale and an
// identifier, and both are checked here rather than trusted.

export type PopupLine = { text: string; style: string };
export type PopupLink = { locale: string; listingId: string; text: string; style: string };

const SAFE_ID = /^[0-9a-zA-Z-]{1,64}$/;

export function popupNode(lines: PopupLine[], link?: PopupLink): HTMLElement {
  const root = document.createElement("div");
  for (const l of lines) {
    if (!l.text) continue;
    const d = document.createElement("div");
    d.style.cssText = l.style;
    d.textContent = l.text;
    root.appendChild(d);
  }
  if (link && SAFE_ID.test(link.listingId) && (link.locale === "en" || link.locale === "ar")) {
    const a = document.createElement("a");
    a.href = `/${link.locale}/listings/${link.listingId}`;
    a.style.cssText = link.style;
    a.textContent = link.text;
    root.appendChild(a);
  }
  return root;
}
