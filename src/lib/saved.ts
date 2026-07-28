// Saved listings, client side. localStorage is the device list (used by anonymous
// visitors and read by the Save button and the Saved page). When a user is signed in
// we ALSO mirror saves to their account via /api/favorites, so their favourites
// persist across devices and feed their occupier home. Signed-out calls to the API
// return 401 and are ignored, so anonymous saving keeps working unchanged.
export const SAVED_KEY = "satm_saved";

export function readSaved(): string[] {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
}

export function writeSaved(ids: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("storage"));
  } catch {
    /* ignore */
  }
}

// Mirror a single toggle to the account. Best effort: a signed-out user gets 401 and
// we simply do nothing, leaving the device list as the record.
export async function syncSave(id: string, on: boolean): Promise<void> {
  try {
    await fetch("/api/favorites", {
      method: on ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: id }),
    });
  } catch {
    /* offline or signed out: the device list still has it */
  }
}

// On sign-in: fold the device list and the account list together so nothing a user
// saved while logged out is lost, and write the union back to the device so the UI
// reflects everything immediately.
export async function mergeSavedOnLogin(): Promise<void> {
  try {
    const res = await fetch("/api/favorites");
    if (!res.ok) return;
    const j = (await res.json().catch(() => ({}))) as { signedIn?: boolean; ids?: string[] };
    if (!j?.signedIn) return;
    const local = readSaved();
    const account = Array.isArray(j.ids) ? j.ids : [];
    const missing = local.filter((x) => !account.includes(x));
    if (missing.length) {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_ids: missing }),
      });
    }
    writeSaved(Array.from(new Set([...account, ...local])));
  } catch {
    /* leave the device list as-is */
  }
}

// ADV-2D. A shortlist is a saved listing with a name, and the name lives on the account.
//
// The Saved page used to keep the grouping in localStorage under "satm_saved_folders",
// which meant it did not follow the person to a second device and the server could not
// read it, so nothing could be built from it. The column exists now. These three helpers
// are the client side of that move, and they are here rather than in the page because the
// occupier home reads the same names.
export type SavedItem = { listing_id: string; shortlist: string | null };

// The account's saved rows with the shortlist each is filed under. Returns null when the
// caller is signed out or the request fails, which the caller reads as "keep the device
// list", never as "the account has nothing".
export async function fetchAccountSaved(): Promise<SavedItem[] | null> {
  try {
    const res = await fetch("/api/favorites");
    if (!res.ok) return null;
    const j = (await res.json().catch(() => ({}))) as { signedIn?: boolean; items?: SavedItem[] };
    if (!j?.signedIn) return null;
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return null;
  }
}

// File a saved listing onto a shortlist, or take it off one. Null clears the name, which
// is why this is PATCH and not POST: a POST without a name means "no instruction", and
// the two must not collapse into each other.
export async function setShortlist(listingId: string, name: string | null): Promise<boolean> {
  try {
    const res = await fetch("/api/favorites", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, shortlist: name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const SAVED_FOLDERS_KEY = "satm_saved_folders";

// One-time promotion of the device-local folder map onto the account, run when a signed-in
// person opens the Saved page while the old map is still in this browser.
//
// It only writes onto rows the account has NOT already filed. An account name is the one a
// person set with the column in place, possibly from another device, and a stale browser
// must not overwrite it. The map is cleared only for the entries that landed, so a failed
// request leaves the evidence in place to try again next time rather than losing the name.
export async function promoteDeviceFolders(account: SavedItem[]): Promise<Record<string, string>> {
  let map: Record<string, string> = {};
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_FOLDERS_KEY) || "{}");
    if (raw && typeof raw === "object") map = raw as Record<string, string>;
  } catch {
    return {};
  }
  const entries = Object.entries(map).filter(([, name]) => typeof name === "string" && name.trim());
  if (!entries.length) return {};
  const filed = new Map(account.map((i) => [i.listing_id, i.shortlist]));
  const promoted: Record<string, string> = {};
  for (const [id, name] of entries) {
    if (!filed.has(id)) continue; // not saved on the account: nothing to file a name onto
    if (filed.get(id)) continue; // already named on the account: the account wins
    if (await setShortlist(id, name.trim().slice(0, 60))) promoted[id] = name.trim().slice(0, 60);
  }
  try {
    const left = Object.fromEntries(Object.entries(map).filter(([id]) => !(id in promoted)));
    localStorage.setItem(SAVED_FOLDERS_KEY, JSON.stringify(left));
  } catch {
    /* the account already has the names; the leftover map is cosmetic */
  }
  return promoted;
}

// On sign-in: fold any searches saved on this device (while logged out) into the
// account, so a saved search made before signing up is not lost and starts feeding
// the occupier's alerts. Best effort; duplicates are skipped server-side.
export const SAVED_SEARCHES_KEY = "sat_saved_searches";

export async function mergeSavedSearchesOnLogin(): Promise<void> {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const items = (Array.isArray(list) ? list : [])
      .filter((s: any) => s && typeof s.qs === "string")
      .map((s: any) => ({ qs: s.qs, label: s.name || "" }));
    if (!items.length) return;
    await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch {
    /* leave the device list as-is */
  }
}
