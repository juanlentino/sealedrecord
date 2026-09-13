/* The PCM secondary anchor: a hash of the audio's sample data plus the
   parameters needed to play it — not the file's bytes. Retagging a WAV
   (cover art, INFO chunks, bext) changes the file hash; it cannot change
   this one. Deterministic by construction: we parse the container
   ourselves, byte for byte — no Web Audio, no decoder variance — so the
   same recording hashes the same in every browser. Uncompressed WAV
   (PCM and IEEE float) only in phase 1; anything else is null, honestly. */

const HEX = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const fourcc = (view, at) =>
  String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));

/* Returns the hex SHA-256 of "pcm|channels|rate|bits|" + data bytes, or
   null when the buffer is not a WAV this phase understands. */
export const pcmHash = async (buffer) => {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 12 || fourcc(view, 0) !== "RIFF" || fourcc(view, 8) !== "WAVE") return null;

    let fmt = null;
    let data = null;
    let at = 12;
    while (at + 8 <= view.byteLength) {
      const id = fourcc(view, at);
      const size = view.getUint32(at + 4, true);
      const body = at + 8;
      if (body + size > view.byteLength) return null; /* truncated chunk */
      if (id === "fmt ") {
        if (size < 16) return null;
        const format = view.getUint16(body, true);
        if (format !== 1 && format !== 3) return null; /* PCM & IEEE float only, for now */
        fmt = {
          channels: view.getUint16(body + 2, true),
          rate: view.getUint32(body + 4, true),
          bits: view.getUint16(body + 14, true),
        };
      }
      if (id === "data") data = new Uint8Array(buffer, body, size);
      at = body + size + (size % 2); /* RIFF pads odd chunks */
    }
    if (!fmt || !data) return null;

    const prefix = new TextEncoder().encode(`pcm|${fmt.channels}|${fmt.rate}|${fmt.bits}|`);
    const material = new Uint8Array(prefix.length + data.length);
    material.set(prefix, 0);
    material.set(data, prefix.length);
    return HEX(await crypto.subtle.digest("SHA-256", material));
  } catch {
    return null;
  }
};

export const pcmHashFile = async (file) => pcmHash(await file.arrayBuffer());
