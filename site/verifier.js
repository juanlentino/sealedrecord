/* The page's wiring. Everything that decides what to say is in render.js
   and anchors.js; this file only moves bytes between the DOM and the
   library. The library is ./sealedrecord/, the unpacked npm tarball. */

import { verifyPackage, verifyReceipts, hashFile, pcmHashFile, hasEd25519 } from "./sealedrecord/index.js";
import { describeReading, describeReceipts, entryLine } from "./render.js";
import { classifyFile, describeFile } from "./anchors.js";
import { RECORD, TAKE_WAV, TAKE_RETAGGED_WAV } from "./vectors.js";
import { VERSION } from "./version.js";

const $ = (id) => document.getElementById(id);
let current = null; /* the last accepted reading, for the file check */

const show = (d) => {
  $("verdict").className = `verdict ${d.verdict}`;
  $("verdict").innerHTML = `<p class="headline"><span class="glyph" aria-hidden="true">${d.glyph}</span> <strong>${esc(d.label)}</strong>. ${esc(d.headline)}</p>`
    + d.lines.map((l) => `<p>${esc(l)}</p>`).join("")
    + (d.caveat ? `<p class="caveat">${esc(d.caveat)}</p>` : "")
    + (d.tracks.length ? `<ul class="tracks">${d.tracks.map(([n, k]) => `<li><span class="track-name">${esc(n)}</span> <span class="track-${esc(k)}">${esc(k)}</span></li>`).join("")}</ul>` : "");
  $("break").hidden = !d.brk;
  if (d.brk) {
    $("break").innerHTML = (d.brk.seq ? `<p class="where">Chain fails at entry ${d.brk.seq}.</p>` : "") + `<p>${esc(d.brk.detail)}</p>`;
  }
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const verify = async (pkg) => {
  const r = await verifyPackage(pkg);
  show(describeReading(r));
  current = r.kind === "malformed" ? null : r;
  $("receipts").textContent = current ? describeReceipts(await verifyReceipts({ ...pkg, entries: r.entries })) : "";
  $("ledger").innerHTML = current ? r.entries.map((e) => `<li>${esc(entryLine(e))}</li>`).join("") : "";
  $("ledger-wrap").hidden = !current;
  $("file-check").hidden = !current;
  $("file-result").textContent = "";
};

const verifyText = async (text) => {
  let pkg;
  try { pkg = JSON.parse(text); } catch { return show(describeReading({ kind: "malformed", detail: "not valid JSON" })); }
  await verify(pkg);
};

const checkFile = async (file) => {
  const { sha256 } = await hashFile(file);
  const c = classifyFile({ sha256, pcm: await pcmHashFile(file) }, current.entries);
  $("file-result").className = `file-result ${c.kind}`;
  $("file-result").textContent = describeFile(c, file.name);
};

const fromB64 = (b64, name) => new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], name, { type: "audio/wav" });

$("file").addEventListener("change", (e) => e.target.files[0] && e.target.files[0].text().then(verifyText));
$("verify-paste").addEventListener("click", () => verifyText($("paste").value));
$("example").addEventListener("click", () => verify(structuredClone(RECORD)));
$("example-broken").addEventListener("click", () => {
  const t = structuredClone(RECORD);
  t.entries[3].note = t.entries[3].note.replace("double", "triple");
  verify(t);
});
$("audio").addEventListener("change", (e) => e.target.files[0] && checkFile(e.target.files[0]));
$("take").addEventListener("click", () => checkFile(fromB64(TAKE_WAV, "take.wav")));
$("take-retagged").addEventListener("click", () => checkFile(fromB64(TAKE_RETAGGED_WAV, "take-retagged.wav")));

for (const id of ["drop", "file-check"]) {
  const el = $(id);
  el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("over"); });
  el.addEventListener("dragleave", () => el.classList.remove("over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault(); el.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (id === "drop") f.text().then(verifyText); else if (current) checkFile(f);
  });
}

/* Scripts ran. Replace the no-script text, then state what this runtime
   can do before any claim about signatures is on screen. */
$("verdict").innerHTML = `<p class="quiet">No record loaded.</p>`;
$("lib-version").textContent = VERSION;
if (!globalThis.crypto?.subtle) {
  $("claim").textContent = "This browser has no WebCrypto, so nothing here can be recomputed. Use the command line or a current browser.";
  for (const b of document.querySelectorAll("button, input")) b.disabled = true;
} else {
  hasEd25519().then((ok) => {
    $("claim").textContent = ok
      ? "Every digest and signature is recomputed here, in this page, with the same library its consumers install."
      : "Every digest is recomputed here, in this page, with the same library its consumers install. This browser cannot verify Ed25519 signatures, so readings here check the hash chain only and say so.";
    $("ed-support").textContent = ok ? "available, signatures will be checked" : "missing, hash chain only";
  });
}
