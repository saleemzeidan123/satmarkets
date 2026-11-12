import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sniffImageType,
  isAcceptedImageType,
  mimeForSniffedType,
  checkFileType,
  checkFileSize,
  checkMinDimensions,
  contentFingerprint,
  findDuplicates,
  readOrientationHint,
  MAX_IMAGE_BYTES,
  MEDIA_CAPS,
} from "./uploadQuality";

// WHAT THIS FILE CANNOT COVER. `checkDecodable` calls `createImageBitmap`,
// a browser-only API this Node test runner does not have (matching every
// other source-level suite in this repository, which reads source and pure
// logic rather than rendering). Its behaviour is verified in the live
// narrow-viewport pass against the deployed preview, not claimed here.

function bytes(...groups: (number[] | string)[]): Uint8Array {
  const parts: number[] = [];
  for (const g of groups) {
    if (typeof g === "string") for (let i = 0; i < g.length; i++) parts.push(g.charCodeAt(i));
    else parts.push(...g);
  }
  return new Uint8Array(parts);
}

const JPEG_MAGIC = bytes([0xff, 0xd8, 0xff], [0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG_MAGIC = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0, 0, 0, 0]);
const WEBP_MAGIC = bytes("RIFF", [0, 0, 0, 0], "WEBP");
const NOT_AN_IMAGE = bytes("This is a plain text file, not any accepted image type.");

function fileOf(data: Uint8Array, name = "x.jpg", type = "image/jpeg"): File {
  // TS's DOM lib types BlobPart as Uint8Array<ArrayBuffer> specifically (excluding
  // a SharedArrayBuffer-backed view), while `new Uint8Array(numberArray)` types as
  // the wider Uint8Array<ArrayBufferLike>. The runtime value is always a plain
  // ArrayBuffer here; the cast reflects that rather than working around it.
  return new File([data as Uint8Array<ArrayBuffer>], name, { type });
}

// ---------------------------------------------------------------------------
// sniffImageType / isAcceptedImageType: byte-identical to the server's own
// former private copy, now the one place both runtimes read.
// ---------------------------------------------------------------------------

test("recognises JPEG, PNG and WebP by content, and nothing else", () => {
  assert.equal(sniffImageType(JPEG_MAGIC), "jpeg");
  assert.equal(sniffImageType(PNG_MAGIC), "png");
  assert.equal(sniffImageType(WEBP_MAGIC), "webp");
  assert.equal(sniffImageType(NOT_AN_IMAGE), null);
});

test("a file renamed to .jpg but not actually a JPEG is rejected on content, not on its name", () => {
  // The whole point of a magic-byte check: a text file wearing a photo's
  // extension must not pass, since acceptance here is a promise about what
  // the file actually is.
  assert.equal(isAcceptedImageType(NOT_AN_IMAGE), false);
});

test("too few bytes to identify never crashes and never accepts", () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8])), null);
  assert.equal(sniffImageType(new Uint8Array(0)), null);
});

// Codex review, item 7: the preserved original (outcome D) must be stored
// under the type this server actually verified by reading the bytes, not
// whatever Content-Type the browser happened to assert on the File object.
test("mimeForSniffedType maps every real sniff result to its true MIME type", () => {
  assert.equal(mimeForSniffedType(sniffImageType(JPEG_MAGIC)), "image/jpeg");
  assert.equal(mimeForSniffedType(sniffImageType(PNG_MAGIC)), "image/png");
  assert.equal(mimeForSniffedType(sniffImageType(WEBP_MAGIC)), "image/webp");
});

test("mimeForSniffedType never invents a specific type for content that was not recognised", () => {
  assert.equal(mimeForSniffedType(sniffImageType(NOT_AN_IMAGE)), "application/octet-stream");
  assert.equal(mimeForSniffedType(null), "application/octet-stream");
});

test("mimeForSniffedType disagrees with a mismatched browser-supplied type, on purpose", () => {
  // The exact scenario the fix closes: a file sniffed as PNG (so this is what
  // gets stored) whose File object claims to be a JPEG (what the old code
  // would have stored it as).
  const claimedJpegActuallyPng = fileOf(PNG_MAGIC, "x.jpg", "image/jpeg");
  assert.equal(claimedJpegActuallyPng.type, "image/jpeg");
  assert.equal(mimeForSniffedType(sniffImageType(PNG_MAGIC)), "image/png");
});

test("checkFileType reads only the file's own content and agrees with sniffImageType", async () => {
  const r = await checkFileType(fileOf(JPEG_MAGIC));
  assert.deepEqual(r, { ok: true, type: "jpeg" });
  const bad = await checkFileType(fileOf(NOT_AN_IMAGE, "photo.jpg"));
  assert.deepEqual(bad, { ok: false, reason: "unsupported_type" });
});

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------

test("a file within the limit passes, and the limit matches the server's own", () => {
  assert.equal(MAX_IMAGE_BYTES, 4 * 1024 * 1024);
  const small = fileOf(new Uint8Array(1024));
  assert.deepEqual(checkFileSize(small), { ok: true });
});

test("a file over the limit is named with its actual size and the limit, not just rejected silently", () => {
  const big = fileOf(new Uint8Array(MAX_IMAGE_BYTES + 1));
  const r = checkFileSize(big);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.bytes, MAX_IMAGE_BYTES + 1);
    assert.equal(r.maxBytes, MAX_IMAGE_BYTES);
  }
});

test("the media caps match the server route's own per-kind limits", () => {
  assert.deepEqual(MEDIA_CAPS, { photo: 20, floorplan: 12 });
});

// ---------------------------------------------------------------------------
// Minimum usable dimensions
// ---------------------------------------------------------------------------

test("dimensions at or above the floor pass; below either axis fails with both named", () => {
  assert.deepEqual(checkMinDimensions(1920, 1080), { ok: true });
  const r = checkMinDimensions(200, 1080);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.width, 200); assert.equal(r.minWidth, 480); }
});

// ---------------------------------------------------------------------------
// Duplicate content, by fingerprint, never by filename
// ---------------------------------------------------------------------------

test("byte-identical files fingerprint identically even under different names", async () => {
  const a = await contentFingerprint(fileOf(JPEG_MAGIC, "front-door.jpg"));
  const b = await contentFingerprint(fileOf(JPEG_MAGIC, "IMG_0442.jpg"));
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/, "expected a sha256 hex digest");
});

test("files with different content never collide", async () => {
  const a = await contentFingerprint(fileOf(JPEG_MAGIC));
  const b = await contentFingerprint(fileOf(PNG_MAGIC));
  assert.notEqual(a, b);
});

test("findDuplicates groups exact repeats in one batch and ignores everything unique", async () => {
  const files = [
    fileOf(JPEG_MAGIC, "a.jpg"),
    fileOf(PNG_MAGIC, "b.png"),
    fileOf(JPEG_MAGIC, "c.jpg"), // same content as a.jpg
    fileOf(WEBP_MAGIC, "d.webp"),
  ];
  const groups = await findDuplicates(files);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].fileIndexes.sort(), [0, 2]);
});

test("findDuplicates on an all-unique batch returns no groups at all", async () => {
  const groups = await findDuplicates([fileOf(JPEG_MAGIC), fileOf(PNG_MAGIC), fileOf(WEBP_MAGIC)]);
  assert.deepEqual(groups, []);
});

// ---------------------------------------------------------------------------
// Orientation, advisory only
// ---------------------------------------------------------------------------

/** A minimal, real JPEG APP1/EXIF segment carrying one IFD0 entry: Orientation. */
function jpegWithOrientation(orientation: number): Uint8Array {
  const le = (n: number, size: 2 | 4) => {
    const out: number[] = [];
    for (let i = 0; i < size; i++) out.push((n >> (8 * i)) & 0xff);
    return out;
  };
  const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];

  const tiffHeader = [0x49, 0x49, 0x2a, 0x00, ...le(8, 4)]; // "II", magic 42, IFD0 at offset 8
  const entry = [...le(0x0112, 2), ...le(3, 2), ...le(1, 4), ...le(orientation, 2), 0x00, 0x00];
  const ifd0 = [...le(1, 2), ...entry, ...le(0, 4)]; // one entry, then next-IFD offset 0
  const tiffAndIfd = [...tiffHeader, ...ifd0];
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const segLen = 2 + exifHeader.length + tiffAndIfd.length;

  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe1, // APP1
    ...be16(segLen),
    ...exifHeader,
    ...tiffAndIfd,
  ]);
}

test("orientation 1 (already upright) reports landscape, not a rotation hint", async () => {
  const hint = await readOrientationHint(fileOf(jpegWithOrientation(1)));
  assert.equal(hint, "landscape");
});

test("an orientation tag requiring rotation is surfaced as advisory, never a block", async () => {
  for (const o of [3, 6, 8]) {
    const hint = await readOrientationHint(fileOf(jpegWithOrientation(o)));
    assert.equal(hint, "rotate_advised", `orientation ${o} should read as rotate_advised`);
  }
});

test("a JPEG with no EXIF segment at all reports no hint, honestly, rather than guessing", async () => {
  const hint = await readOrientationHint(fileOf(JPEG_MAGIC));
  assert.equal(hint, null);
});

test("PNG and WebP, which carry no EXIF orientation tag in the form this reads, report no hint", async () => {
  assert.equal(await readOrientationHint(fileOf(PNG_MAGIC, "x.png", "image/png")), null);
  assert.equal(await readOrientationHint(fileOf(WEBP_MAGIC, "x.webp", "image/webp")), null);
});
