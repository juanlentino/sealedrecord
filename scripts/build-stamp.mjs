/* The build stamp: which library version the page was assembled from and
   which commit last touched the page's inputs. No timestamp, no run id, so
   the stamp changes only when the deployable would. The same function
   answers "what should be live" for the freshness check, from the same
   inputs, so the two cannot disagree by construction. */

import { execFileSync } from "node:child_process";

export const INPUTS = ["site/", "scripts/site-assemble.mjs", "vectors/", "package.json"];

export const sourceSha = (cwd, ref = "HEAD") =>
  execFileSync("git", ["log", "-1", "--format=%H", ref, "--", ...INPUTS], { cwd, encoding: "utf8" }).trim();

export const buildStamp = (cwd, library, ref = "HEAD") => ({ library, source: sourceSha(cwd, ref), inputs: INPUTS });

if (import.meta.url === `file://${process.argv[1]}`) {
  const { version } = JSON.parse((await import("node:fs")).readFileSync(`${process.cwd()}/package.json`, "utf8"));
  process.stdout.write(JSON.stringify(buildStamp(process.cwd(), version, process.argv[2] ?? "HEAD")) + "\n");
}
