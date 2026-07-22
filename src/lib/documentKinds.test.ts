import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DOCUMENT_KINDS, documentLabel, isDocumentKind } from "./documentKinds";

test("isDocumentKind validates the enum", () => {
  assert.ok(isDocumentKind("deed"));
  assert.ok(isDocumentKind("authorization"));
  assert.ok(!isDocumentKind("passport"));
  assert.ok(!isDocumentKind(null));
});

test("deed is the title deed (Sakk), never a survey", () => {
  assert.equal(documentLabel("deed", false), "Title deed (Sakk)");
  assert.equal(documentLabel("deed", true), "صك الملكية");
  for (const k of DOCUMENT_KINDS) {
    assert.ok(!documentLabel(k, false).toLowerCase().includes("survey"), `${k} must not say survey`);
  }
});

test("unknown kind falls back to Other, never crashes", () => {
  assert.equal(documentLabel("nonsense", false), "Other document");
  assert.equal(documentLabel(null, true), "مستند آخر");
});

test("no document label contains an em dash (Law 2)", () => {
  for (const k of DOCUMENT_KINDS) {
    assert.ok(!documentLabel(k, false).includes("\u2014"));
    assert.ok(!documentLabel(k, true).includes("\u2014"));
  }
});

// Structural invariant (advisor section 6): the document upload route must never
// reference a listing verification column. Uploading evidence can never assert a
// verified status. This static check fails the build if that ever changes.
test("the document upload route references no verification column", () => {
  const src = readFileSync(
    new URL("../app/api/listings/[id]/documents/route.ts", import.meta.url),
    "utf8",
  );
  for (const col of ["ownership_verified", "authorization_verified", "verification_method", "verified_at", "verified_by"]) {
    assert.ok(!src.includes(col), `upload route must not touch ${col}`);
  }
});
