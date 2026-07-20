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
