/* Artifact anchoring: the file's SHA-256, computed wherever the reader
   runs, becomes part of the entry the author signs. The file itself does
   not travel with the record; the chain holds its identity, the producer
   holds the bytes. */
/* WebCrypto digests a whole ArrayBuffer in memory — no streaming — so cap
   loudly rather than letting a 2GB session bounce freeze the tab. */
export const MAX_ARTIFACT_BYTES = 200 * 1024 * 1024;

const HEX = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const hashFile = async (file) => {
  if (file.size > MAX_ARTIFACT_BYTES) {
    throw new Error(`file too large to anchor (${formatBytes(file.size)}; the cap is ${formatBytes(MAX_ARTIFACT_BYTES)})`);
  }
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return { name: file.name, size: file.size, sha256: HEX(digest) };
};

export const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/* Re-check a file someone hands you against an anchored entry. */
export const fileMatchesArtifact = async (file, artifact) =>
  (await hashFile(file)).sha256 === artifact.sha256;

/* Every entry that anchors this exact file — the reader's answer to
   "where does this file appear in the session?" */
export const findAnchors = (sha256, entries) =>
  entries.filter((e) => e.artifact?.sha256 === sha256);

/* The survivability half of the same question: entries whose anchored
   AUDIO matches, even though the file's bytes no longer do — a retagged
   copy finds its record here. Null/absent hashes match nothing. */
export const findPcmAnchors = (pcmSha256, entries) =>
  pcmSha256 ? entries.filter((e) => e.artifact?.pcm_sha256 === pcmSha256) : [];
