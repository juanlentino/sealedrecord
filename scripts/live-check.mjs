/* Is the deployed page what main says it should be? Reads the live
   build.json and compares it with the stamp computed from this checkout and
   the registry's latest version. Exits 1 on any mismatch, with the reason on
   stdout, so a workflow shows it in the run and the badge. Network is used
   here, in a maintainer's tool, never in the verifier itself.
   Run: node scripts/live-check.mjs [https://.../sealedrecord/] */

import { execFileSync } from "node:child_process";
import { buildStamp } from "./build-stamp.mjs";

export const mismatches = (live, expected) => {
  if (!live || typeof live !== "object") return ["no build stamp could be read from the live page"];
  const out = [];
  if (live.library !== expected.library) out.push(`library: live ${live.library}, expected ${expected.library}`);
  if (live.source !== expected.source) out.push(`source: live ${String(live.source).slice(0, 7)}, expected ${expected.source.slice(0, 7)}`);
  return out;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = process.argv[2] ?? "https://juanlentino.github.io/sealedrecord/";
  const cwd = process.cwd();
  const library = execFileSync("npm", ["view", "sealedrecord", "version"], { encoding: "utf8" }).trim();
  const expected = buildStamp(cwd, library);
  let live = null;
  try {
    const res = await fetch(`${base}build.json`, { headers: { "cache-control": "no-cache" } });
    if (res.ok) live = await res.json();
  } catch { /* reported below as a missing stamp */ }
  const m = mismatches(live, expected);
  console.log(m.length ? m.join("\n") : `live page matches: sealedrecord ${expected.library}, source ${expected.source.slice(0, 7)}`);
  process.exit(m.length ? 1 : 0);
}
