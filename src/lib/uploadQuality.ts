// PKG-LISTING-CREATION-1A, requirement D. Deterministic upload checks, run
// before a file leaves the browser, so a lister learns about a rejected file
// in milliseconds rather than after a round trip.
//
// EVERY CHECK HERE IS DETERMINISTIC AND EXPLAINABLE. None of it is an opinion
// about whether a photograph is good: no blur score, no "does this look like
// the right room", nothing that could be silently confirmed as a fact. That
// class of check stays advisory-only and is out of this package (see
// docs/pkg-listing-creation-1a-deferred-contracts.md); nothing here sends a
// file to an external AI provider, and nothing in this file needs to.
//
// SNIFF IS SHARED, NOT MIRRORED. The magic-byte check below is byte-identical
// to the one `src/app/api/listings/[id]/media/route.ts` used to keep as its
// own private copy. Two independent copies of "is this really a JPEG" is
// exactly the kind of drift this package's "one truth model" requirement
// exists to close, so the server route now imports `sniffImageType` from
// here instead of keeping its own. Written against `Uint8Array` rather than
// Node's `Buffer` so the same function runs in the browser and on the
// server without a runtime-specific import.

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB, matching the server's own request-body limit
export const MEDIA_CAPS: Record<string, number> = { photo: 20, floorplan: 12 };
export const MIN_USABLE_WIDTH = 480;
export const MIN_USABLE_HEIGHT = 320;

export type SniffedImageType = "jpeg" | "png" | "webp" | null;

/** Identical logic to the route's former private `sniff()`, kept in the one place both runtimes read. */
export function sniffImageType(bytes: Uint8Array): SniffedImageType {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export function isAcceptedImageType(bytes: Uint8Array): boolean {
  return sniffImageType(bytes) !== null;
}

// ---------------------------------------------------------------------------
// Browser-only checks below. Each takes a File and resolves to a small,
// explainable result; none of them throws for an ordinary bad file, because a
// rejected upload is exactly the case this exists to explain, not to crash on.
// ---------------------------------------------------------------------------

export type FileTypeCheck = { ok: true; type: SniffedImageType } | { ok: false; reason: "unreadable" | "unsupported_type" };

/** Reads only the first bytes needed to identify the format, not the whole file. */
export async function checkFileType(file: File): Promise<FileTypeCheck> {
  let head: ArrayBuffer;
  try {
    head = await file.slice(0, 16).arrayBuffer();
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const type = sniffImageType(new Uint8Array(head));
  return type ? { ok: true, type } : { ok: false, reason: "unsupported_type" };
}

export type SizeCheck = { ok: true } | { ok: false; bytes: number; maxBytes: number };

export function checkFileSize(file: File, maxBytes: number = MAX_IMAGE_BYTES): SizeCheck {
  return file.size <= maxBytes ? { ok: true } : { ok: false, bytes: file.size, maxBytes };
}

export type DecodeCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "undecodable" };

/**
 * Whether the browser can actually decode this file as an image, and its
 * pixel dimensions if so. This is what catches a truncated download, a file
 * with an image extension that is not actually an image, or a format the
 * magic-byte check let through but the decoder cannot read. `createImageBitmap`
 * is preferred over an `<img>` element because it needs no DOM attachment and
 * rejects cleanly on undecodable input rather than firing a generic error
 * event with no dimensions attached.
 */
export async function checkDecodable(file: File): Promise<DecodeCheck> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    return { ok: true, width, height };
  } catch {
    return { ok: false, reason: "undecodable" };
  }
}

export type DimensionCheck = { ok: true } | { ok: false; width: number; height: number; minWidth: number; minHeight: number };

export function checkMinDimensions(
  width: number,
  height: number,
  minWidth: number = MIN_USABLE_WIDTH,
  minHeight: number = MIN_USABLE_HEIGHT,
): DimensionCheck {
  return width >= minWidth && height >= minHeight ? { ok: true } : { ok: false, width, height, minWidth, minHeight };
}

/**
 * A content fingerprint for in-session duplicate detection.
 *
 * SHA-256 over the file's bytes, not its filename: two files with different
 * names and identical content are the same photograph uploaded twice, and a
 * filename-only check misses exactly that case. This is session-only by
 * necessity, not by choice: `listing_media` has no content-hash column today,
 * so a duplicate already on the server from an earlier visit cannot be
 * detected this way. See the deferred-contracts doc for the column this
 * would need to persist across visits.
 */
export async function contentFingerprint(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type DuplicateGroup = { fingerprint: string; fileIndexes: number[] };

/** Groups of files in THIS batch that are byte-identical, ready to upload together. Empty when there are none. */
export async function findDuplicates(files: readonly File[]): Promise<DuplicateGroup[]> {
  const byFingerprint = new Map<string, number[]>();
  const fingerprints = await Promise.all(files.map((f) => contentFingerprint(f)));
  fingerprints.forEach((fp, i) => {
    const list = byFingerprint.get(fp) ?? [];
    list.push(i);
    byFingerprint.set(fp, list);
  });
  const groups: DuplicateGroup[] = [];
  for (const [fingerprint, fileIndexes] of byFingerprint) {
    if (fileIndexes.length > 1) groups.push({ fingerprint, fileIndexes });
  }
  return groups;
}

export type OrientationHint = "landscape" | "portrait" | "rotate_advised" | null;

/**
 * Reads the JPEG EXIF Orientation tag (0x0112), when present, and reports
 * whether the file's stored pixels need rotating to display upright.
 *
 * This is advisory only, never a block: the server's own processing
 * (`sharp().rotate()`) already applies EXIF orientation and strips the tag
 * from what is stored, so a lister's upload is never displayed sideways
 * regardless of what this returns. Its only purpose is to tell the lister,
 * before upload, that a photo is stored rotated, since a preview thumbnail
 * built from the raw file (before the server has processed it) can otherwise
 * look wrong for a reason that has nothing to do with the photo itself.
 *
 * PNG and WebP carry no EXIF orientation tag in the form this reads, so this
 * returns null for both; that is a correct "no hint", not a failure.
 */
export async function readOrientationHint(file: File): Promise<OrientationHint> {
  const type = sniffImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (type !== "jpeg") return null;
  const buf = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 2; // past the SOI marker
  while (offset < buf.length - 4) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (marker === 0xe1) {
      // APP1: the segment EXIF lives in, when present.
      const segLen = view.getUint16(offset + 2, false);
      const segStart = offset + 4;
      if (buf.length >= segStart + 6 && String.fromCharCode(...buf.slice(segStart, segStart + 4)) === "Exif") {
        const tiffStart = segStart + 6;
        const little = view.getUint16(tiffStart, false) === 0x4949;
        const ifdOffset = view.getUint32(tiffStart + 4, little) + tiffStart;
        if (ifdOffset + 2 <= buf.length) {
          const entryCount = view.getUint16(ifdOffset, little);
          for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            if (entryOffset + 12 > buf.length) break;
            const tag = view.getUint16(entryOffset, little);
            if (tag === 0x0112) {
              const orientation = view.getUint16(entryOffset + 8, little);
              if (orientation >= 2) return "rotate_advised";
              return "landscape"; // orientation 1: stored upright, no hint needed
            }
          }
        }
      }
      offset += 2 + segLen;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (offset + 4 > buf.length) break;
    const segLen = view.getUint16(offset + 2, false);
    if (segLen < 2) break;
    offset += 2 + segLen;
  }
  return null;
}
