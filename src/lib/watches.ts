"use client";

// Device-local Rent Index watches. No auth yet, so a watch created via the
// advisor is remembered on the device that created it (localStorage), and the
// Rent Index and Market pulse pages surface a quiet banner when a watched
// segment's published median has moved since the device last saw it. Honest by
// construction: every figure is a published median, never computed here.

export interface Watch {
  id: string;
  districtLabel: string;
  assetType: string;
  segment: string;
  thresholdPct: number;
  baselineMedian: number;
  baselinePeriod: string;
  lastSeenMedian: number;
  lastSeenPeriod: string;
  createdAt: number;
}

const KEY = "sat_watches";

export function watchKey(districtLabel: string, assetType: string, segment: string | null | undefined): string {
  return `${(districtLabel || "").trim().toLowerCase()}|${(assetType || "").trim().toLowerCase()}|${(segment || "").trim().toLowerCase()}`;
}

export function getWatches(): Watch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((w) => w && w.id && Number.isFinite(w.baselineMedian)) : [];
  } catch {
    return [];
  }
}

function write(list: Watch[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-40)));
    window.dispatchEvent(new Event("sat-watches-changed"));
  } catch {}
}

// Upsert a watch. A new baseline replaces any existing watch for the same
// segment, so re-watching just resets the baseline to now.
export function addWatch(input: {
  districtLabel: string; assetType: string; segment: string | null | undefined;
  thresholdPct: number; median: number; period: string;
}): Watch | null {
  const median = Number(input.median);
  if (!Number.isFinite(median)) return null;
  const id = watchKey(input.districtLabel, input.assetType, input.segment);
  const w: Watch = {
    id,
    districtLabel: input.districtLabel,
    assetType: input.assetType,
    segment: (input.segment || "").trim(),
    thresholdPct: Number(input.thresholdPct) > 0 ? Number(input.thresholdPct) : 5,
    baselineMedian: median,
    baselinePeriod: input.period || "",
    lastSeenMedian: median,
    lastSeenPeriod: input.period || "",
    createdAt: Date.now(),
  };
  const rest = getWatches().filter((x) => x.id !== id);
  write([...rest, w]);
  return w;
}

export function removeWatch(id: string): void {
  write(getWatches().filter((w) => w.id !== id));
}

// Mark a watch as seen at the current published median and period, so a move is
// only ever flagged once per publication.
export function markSeen(id: string, median: number, period: string): void {
  const list = getWatches().map((w) => (w.id === id ? { ...w, lastSeenMedian: Number(median), lastSeenPeriod: period } : w));
  write(list);
}
