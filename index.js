/* The public surface. Reading first; the producer half follows so a second
   implementation can check its output against a reference. */

export { verifyPackage } from "./src/verify.js";
export { verifyReceipts, receiptCanonical } from "./src/attest.js";
export { MAX_ARTIFACT_BYTES, hashFile, findAnchors, findPcmAnchors } from "./src/artifact.js";
export { pcmHash, pcmHashFile } from "./src/pcm.js";
export { GENESIS, entryHash, hhmm, verdictOf, buildEvents } from "./src/chain.js";
export { PKG_FORMAT, buildPackage, packageText } from "./src/pkg.js";
export { sealEntry } from "./src/append.js";
export {
  sha256Hex, generateSigningKey, exportJwk, importPublicJwk, importPrivateJwk,
  signText, verifyText, hasEd25519,
} from "./src/crypto.js";
