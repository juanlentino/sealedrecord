import { describe, it, expect } from "vitest";
import { pcmHash } from "../src/pcm.js";

/* Build real WAV bytes in-test: RIFF/WAVE with configurable chunks. */
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const u16 = (n) => [n & 0xff, (n >> 8) & 0xff];
const u32 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

const chunk = (id, bytes) => {
  const body = [...ascii(id), ...u32(bytes.length), ...bytes];
  if (bytes.length % 2) body.push(0); /* RIFF pads odd chunks */
  return body;
};

const fmtChunk = ({ format = 1, channels = 2, rate = 44100, bits = 16 }) => {
  const blockAlign = channels * (bits / 8);
  return chunk("fmt ", [
    ...u16(format), ...u16(channels), ...u32(rate),
    ...u32(rate * blockAlign), ...u16(blockAlign), ...u16(bits),
  ]);
};

const wav = ({ format, channels, rate, bits, data = [1, 2, 3, 4], extra = [] } = {}) => {
  const chunks = [...fmtChunk({ format, channels, rate, bits }), ...extra, ...chunk("data", data)];
  const bytes = [...ascii("RIFF"), ...u32(4 + chunks.length), ...ascii("WAVE"), ...chunks];
  return new Uint8Array(bytes).buffer;
};

const TAG = chunk("LIST", [...ascii("INFO"), ...chunk("IART", ascii("Juan"))]);

describe("pcmHash — the anchor that survives retagging", () => {
  it("hashes a WAV's sample data plus its format parameters", async () => {
    const h = await pcmHash(wav());
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is unchanged by metadata chunks — a retag never orphans the record", async () => {
    const plain = await pcmHash(wav());
    const tagged = await pcmHash(wav({ extra: TAG }));
    expect(tagged).toBe(plain);
  });

  it("changes when the audio changes", async () => {
    expect(await pcmHash(wav({ data: [9, 9, 9, 9] }))).not.toBe(await pcmHash(wav()));
  });

  it("commits the format parameters — a resample claim can't reuse the hash", async () => {
    expect(await pcmHash(wav({ rate: 48000 }))).not.toBe(await pcmHash(wav()));
    expect(await pcmHash(wav({ channels: 1 }))).not.toBe(await pcmHash(wav()));
  });

  it("accepts IEEE-float WAVs and refuses exotic encodings honestly", async () => {
    expect(await pcmHash(wav({ format: 3, bits: 32 }))).toMatch(/^[0-9a-f]{64}$/);
    expect(await pcmHash(wav({ format: 0xfffe }))).toBeNull(); /* extensible: later */
  });

  it("returns null for non-WAV and truncated input, never a crash", async () => {
    expect(await pcmHash(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
    expect(await pcmHash(new Uint8Array(ascii("RIFFxxxxWAVE")).buffer)).toBeNull();
    const cut = wav().slice(0, 30); /* data chunk truncated */
    expect(await pcmHash(cut)).toBeNull();
  });
});
