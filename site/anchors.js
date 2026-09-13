/* File check, pure. exact: the bytes the record anchored. audio: the same
   samples under different bytes (a retagged copy). none: the record never
   saw this file. */

import { findAnchors, findPcmAnchors } from "./sealedrecord/index.js";

export const classifyFile = ({ sha256, pcm }, entries) => {
  const exact = findAnchors(sha256, entries);
  if (exact.length) return { kind: "exact", entries: exact };
  const audio = findPcmAnchors(pcm, entries);
  if (audio.length) return { kind: "audio", entries: audio };
  return { kind: "none", entries: [] };
};

export const describeFile = (c, name) => ({
  exact: `${name}: these exact bytes are anchored at entry ${c.entries.map((e) => e.seq).join(", ")}. This is the file the record names.`,
  audio: `${name}: the bytes differ from what was anchored, but the audio samples match entry ${c.entries.map((e) => e.seq).join(", ")}. Same recording, different file: metadata was changed after sealing.`,
  none: `${name}: neither the bytes nor the samples appear in this record.`,
})[c.kind];
