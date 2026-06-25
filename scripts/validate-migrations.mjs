// Offline grammar check for every SQL migration, using the real Postgres parser
// (libpg_query via pgsql-parser). Catches syntax errors without a running DB.
// Run: npm run db:validate
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadModule, parseSync } = require("pgsql-parser");

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

if (loadModule) await loadModule();

let ok = true;
for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  try {
    const r = parseSync(sql);
    console.log(`OK   ${f}  (${r?.stmts?.length ?? "?"} statements)`);
  } catch (e) {
    ok = false;
    console.log(`FAIL ${f}\n     ${String(e.message || e).split("\n")[0]}`);
  }
}
process.exit(ok ? 0 : 1);
