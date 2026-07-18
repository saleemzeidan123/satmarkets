// Pull coordinates out of what a lister pastes: a Google Maps link, a plain
// "lat, lng" pair, or an Apple/Bing style URL. We do not use the Google Maps API;
// a Maps location already carries its latitude and longitude in the URL, so we
// just read them. Short share links (maps.app.goo.gl, goo.gl) hide the numbers
// behind a redirect and are resolved server-side (see /api/geo/resolve); this
// function handles everything that already contains the coordinates.

export interface LatLng {
  lat: number;
  lng: number;
}

function valid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    // reject the degenerate 0,0 (null island), almost always a parse artifact
    !(lat === 0 && lng === 0)
  );
}

export function parseLatLng(input: string | null | undefined): LatLng | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // 1) The exact place marker in a Google URL: ...!3d<lat>!4d<lng>. This is the
  // pinned feature and is more precise than the map-center @ below, so try it first.
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) {
    const lat = Number(m[1]); const lng = Number(m[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  // 2) Map centre in a Google URL: /@<lat>,<lng>,<zoom>z
  m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) {
    const lat = Number(m[1]); const lng = Number(m[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  // 3) A coordinate query parameter: q=, ll=, query=, destination=, center=, sll=
  // The pair may be comma or URL-encoded-comma (%2C) separated.
  m = s.match(/[?&](?:q|ll|query|destination|center|sll|daddr)=(-?\d+(?:\.\d+)?)(?:%2C|,)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) {
    const lat = Number(m[1]); const lng = Number(m[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  // 4) A bare "lat, lng" pair pasted on its own (not inside a URL).
  if (!/https?:\/\//i.test(s)) {
    m = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (m) {
      const lat = Number(m[1]); const lng = Number(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

// Is this a Google (or Apple/Bing) maps URL whose coordinates might need a
// server-side redirect to reveal (short links), or that we can hand to the
// resolver? Used to decide whether to expand a link that parseLatLng could not read.
export function isMapShareUrl(input: string | null | undefined): boolean {
  if (!input) return false;
  try {
    const u = new URL(String(input).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "goo.gl" || h.endsWith(".goo.gl") ||          // maps.app.goo.gl, goo.gl
      h === "g.co" || h.endsWith(".g.co") ||
      /(^|\.)google\.[a-z.]+$/.test(h) ||                 // google.com, maps.google.com, google.com.sa
      h === "maps.apple.com" ||
      h.endsWith(".bing.com")
    );
  } catch {
    return false;
  }
}
