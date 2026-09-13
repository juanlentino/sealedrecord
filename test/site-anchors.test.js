import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pcmHash } from "../index.js";
import { classifyFile } from "../site/anchors.js";

const V = new URL("../vectors/", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("record.json", V), "utf8"));
const buf = (n) => { const b = readFileSync(new URL(n, V)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const HEX = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (b) => HEX(await crypto.subtle.digest("SHA-256", b));

describe("classifyFile", () => {
  it("exact bytes: the anchored file", async () => {
    const b = buf("take.wav");
    const c = classifyFile({ sha256: await sha(b), pcm: await pcmHash(b) }, pkg.entries);
    expect(c.kind).toBe("exact");
    expect(c.entries.map((e) => e.seq)).toEqual([2]);
  });
  it("same audio only: the retagged copy", async () => {
    const b = buf("take-retagged.wav");
    const c = classifyFile({ sha256: await sha(b), pcm: await pcmHash(b) }, pkg.entries);
    expect(c.kind).toBe("audio");
    expect(c.entries.map((e) => e.seq)).toEqual([2]);
  });
  it("nothing: a file the record never saw", () => {
    expect(classifyFile({ sha256: "0".repeat(64), pcm: null }, pkg.entries).kind).toBe("none");
  });
});
