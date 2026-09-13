/* SHA-256 for entry digests, Ed25519 for per-actor signatures, via
   WebCrypto. Signing happens on the producer's side, always; a store that
   holds chains can never forge them. Keys are generated extractable so a
   caller can persist them. On a runtime without Ed25519 the chain runs
   hash-only and records carry no signers. */
const HEX = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const ENC = new TextEncoder();
const ED = { name: "Ed25519" };

export const sha256Hex = async (s) =>
  HEX(await crypto.subtle.digest("SHA-256", ENC.encode(s)));

export const generateSigningKey = () =>
  crypto.subtle.generateKey(ED, true, ["sign", "verify"]);

export const exportJwk = (key) => crypto.subtle.exportKey("jwk", key);

export const importPrivateJwk = (jwk) =>
  crypto.subtle.importKey("jwk", jwk, ED, true, ["sign"]);

export const importPublicJwk = (jwk) =>
  crypto.subtle.importKey("jwk", jwk, ED, true, ["verify"]);

export const signText = async (privateKey, s) =>
  HEX(await crypto.subtle.sign(ED, privateKey, ENC.encode(s)));

export const verifyText = async (publicKey, signatureHex, s) => {
  if (typeof signatureHex !== "string") return false; /* hostile input is a false, never a throw */
  const bytes = signatureHex.match(/.{2}/g);
  if (!bytes) return false;
  const sig = new Uint8Array(bytes.map((h) => parseInt(h, 16)));
  return crypto.subtle.verify(ED, publicKey, sig, ENC.encode(s));
};

let edSupport = null;
export const hasEd25519 = async () => {
  if (edSupport === null) {
    try {
      await generateSigningKey();
      edSupport = true;
    } catch {
      edSupport = false;
    }
  }
  return edSupport;
};
