import { describe, it, expect } from "vitest";
import { hashFile, findAnchors, findPcmAnchors, MAX_ARTIFACT_BYTES, formatBytes } from "../src/artifact.js";

describe("hashFile", () => {
  it("produces the file's real SHA-256 with its name and size", async () => {
    const file = new File(["abc"], "riff.wav");
    const artifact = await hashFile(file);
    expect(artifact).toEqual({
      name: "riff.wav",
      size: 3,
      sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
  });

  it("refuses oversized files loudly instead of hanging the tab", async () => {
    const tooBig = { name: "huge.wav", size: MAX_ARTIFACT_BYTES + 1, arrayBuffer: () => { throw new Error("must not be read"); } };
    await expect(hashFile(tooBig)).rejects.toThrow(/too large/);
  });
});

describe("findAnchors", () => {
  const entries = [
    { seq: 1, action: "session opened", lane: null },
    { seq: 2, action: "take 1", lane: "Kick In", artifact: { name: "kick.wav", size: 10, sha256: "a".repeat(64) } },
    { seq: 4, action: "bounced", lane: null, artifact: { name: "mix.wav", size: 20, sha256: "a".repeat(64) } },
    { seq: 5, action: "imported", lane: "Bass DI", artifact: { name: "bass.wav", size: 30, sha256: "b".repeat(64) } },
  ];

  it("returns every entry anchoring the given file hash", () => {
    const hits = findAnchors("a".repeat(64), entries);
    expect(hits.map((e) => e.seq)).toEqual([2, 4]);
  });

  it("returns empty for a hash no entry anchors", () => {
    expect(findAnchors("f".repeat(64), entries)).toEqual([]);
  });
});

describe("findPcmAnchors", () => {
  const entries = [
    { seq: 1, action: "session opened", lane: null },
    { seq: 2, action: "recorded", lane: null, artifact: { name: "take.wav", size: 10, sha256: "a".repeat(64), pcm_sha256: "c".repeat(64) } },
    { seq: 3, action: "imported", lane: null, artifact: { name: "stem.flac", size: 20, sha256: "b".repeat(64) } },
  ];

  it("finds the record a retagged copy still matches by audio", () => {
    expect(findPcmAnchors("c".repeat(64), entries).map((e) => e.seq)).toEqual([2]);
  });

  it("returns empty for null — a file this phase cannot PCM-hash matches nothing", () => {
    expect(findPcmAnchors(null, entries)).toEqual([]);
  });

  it("never matches entries anchored without a PCM hash", () => {
    expect(findPcmAnchors(undefined, entries)).toEqual([]);
  });
});

describe("formatBytes", () => {
  it("renders human sizes", () => {
    expect(formatBytes(3)).toBe("3 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
