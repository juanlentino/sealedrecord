/* Print one version's section of CHANGELOG.md, for the GitHub Release.
   Run: node scripts/release-notes.mjs 0.5.2 */
import { readFileSync } from "node:fs";

const version = process.argv[2];
const text = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const m = text.match(new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`, "m"));
if (!m) { console.error(`CHANGELOG.md has no section for ${version}`); process.exit(1); }
process.stdout.write(m[1].trim() + "\n");
