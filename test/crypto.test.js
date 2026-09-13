import { describe, it, expect } from "vitest";
import { sha256Hex, generateSigningKey, signText, verifyText, hasEd25519 } from "../src/crypto.js";

describe("chain cryptography", () => {
  it("computes SHA-256 correctly against a known vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic", async () => {
    expect(await sha256Hex("record")).toBe(await sha256Hex("record"));
  });

  it("signs and verifies with Ed25519, and rejects altered text", async () => {
    if (!(await hasEd25519())) return; /* runtime without Ed25519; the chain guards for this */
    const { privateKey, publicKey } = await generateSigningKey();
    const sig = await signText(privateKey, "take 1|lane 2|14:23");
    expect(await verifyText(publicKey, sig, "take 1|lane 2|14:23")).toBe(true);
    expect(await verifyText(publicKey, sig, "take 1|lane 2|14:24")).toBe(false);
  });
});
