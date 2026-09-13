import { describe, it, expect } from "vitest";
import * as lib from "../index.js";

/* The public surface, pinned. Anything added or removed shows up here first. */
const SURFACE = [
  "verifyPackage", "verifyReceipts",
  "hashFile", "pcmHash", "pcmHashFile", "findAnchors", "findPcmAnchors", "formatBytes", "MAX_ARTIFACT_BYTES", "fileMatchesArtifact",
  "PKG_FORMAT", "GENESIS", "entryHash", "hhmm", "verdictOf", "receiptCanonical",
  "buildEvents", "sealEntry", "buildPackage", "packageText",
  "sha256Hex", "generateSigningKey", "exportJwk", "importPublicJwk", "importPrivateJwk",
  "signText", "verifyText", "hasEd25519",
];

describe("public surface", () => {
  it("exports exactly the documented names", () => {
    expect(Object.keys(lib).sort()).toEqual([...SURFACE].sort());
  });
});
