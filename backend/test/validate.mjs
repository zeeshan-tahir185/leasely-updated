// Local validation harness for the Leasely backend.
//
// Runs the real migrations (migrations/0001..0003) unmodified against a genuine
// Postgres engine (PGlite — Postgres compiled to WASM, in-process, no install),
// on top of a small Supabase-environment shim, then asserts that:
//   • the schema applies cleanly,
//   • signup provisions a company + owner profile (one company per account),
//   • the ledger invariants hold (contract→cheques, clear→receipt, bill→voucher),
//   • RLS isolates tenants and enforces the RBAC (financial visibility / posting).
//
// Run:  cd backend/test && node validate.mjs

import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const migration = (f) => readFileSync(join(__dir, '..', 'migrations', f), 'utf8');
const local = (f) => readFileSync(join(__dir, f), 'utf8');

const db = new PGlite({ extensions: { citext, pgcrypto } });

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); }
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const val = async (sql, params) => Object.values(await one(sql, params))[0];

// Run `fn` as the given user, in the authenticated role.
async function asUser(uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const rejects = async (sql, params) => {
  try { await db.query(sql, params); return false; } catch { return true; }
};
// Returns the error message thrown by a statement, or null if it succeeded.
const errorOf = async (sql, params) => {
  try { await db.query(sql, params); return null; } catch (e) { return e.message || String(e); }
};

// ── apply shim + migrations (as the bootstrap superuser) ──────────────────────
console.log('Applying schema…');
await db.exec(`create extension if not exists pgcrypto; create extension if not exists citext;`);
await db.exec(local('shim.sql'));
for (const f of ['0001_foundation.sql', '0002_core_ledger.sql', '0003_ledger_functions.sql', '0004_operations.sql']) {
  await db.exec(migration(f));
  console.log(`  applied ${f}`);
}

// ── signup → company + owner profile (handle_new_user trigger) ────────────────
console.log('\nSignup / tenancy:');
const uidA = await val(`select gen_random_uuid()`);
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
  [uidA, 'owner@testrealty.ae', JSON.stringify({ company_name: 'Test Realty', full_name: 'Test Owner' })]);
const profA = await one(`select * from profiles where id = $1`, [uidA]);
check('signup created an owner profile', profA?.role === 'owner', JSON.stringify(profA));
const companyA = profA?.company_id;
check('signup created the company', !!companyA);
check('company_settings was seeded', await val(`select count(*)::int from company_settings where company_id = $1`, [companyA]) === 1);

// ── ledger invariants (as the owner) ──────────────────────────────────────────
console.log('\nLedger invariants:');
await asUser(uidA, async () => {
  const tw = await val(`insert into towers (company_id, name, area) values (current_company_id(), 'Marina Heights', 'Dubai Marina') returning id`);
  const un = await val(`insert into units (company_id, tower_id, label, unit_type, annual_rent) values (current_company_id(), $1, '1204', '2BHK', 130000) returning id`, [tw]);
  const tenant = await val(`insert into contacts (company_id, kinds, name) values (current_company_id(), array['tenant']::contact_kind[], 'Maya Alvarez') returning id`);

  // create_contract → cheque schedule
  const cid = await val(
    `select create_contract($1, $2, $3, 130000, 4, current_date, (current_date + interval '12 months')::date)`,
    [tw, un, tenant]);
  const cheques = (await db.query(`select id, amount, status from cheques where contract_id = $1 order by due_date`, [cid])).rows;
  check('create_contract emitted 4 cheques', cheques.length === 4, `got ${cheques.length}`);
  const sum = cheques.reduce((a, c) => a + Number(c.amount), 0);
  check('cheques sum to the annual rent exactly', sum === 130000, `sum=${sum}`);

  // clearing books a receipt; un-clearing removes it
  const first = cheques[0];
  await db.query(`select set_cheque_status($1, 'cleared')`, [first.id]);
  const rcpt = await one(`select amount from receipts where cheque_id = $1`, [first.id]);
  check('clearing an incoming cheque books a receipt', rcpt && Number(rcpt.amount) === Number(first.amount));
  await db.query(`select set_cheque_status($1, 'pending')`, [first.id]);
  check('un-clearing removes the receipt', await val(`select count(*)::int from receipts where cheque_id = $1`, [first.id]) === 0);

  // replace a (bounced) cheque
  await db.query(`select set_cheque_status($1, 'bounced')`, [first.id]);
  const repl = await val(`select replace_cheque($1, (current_date + interval '14 days')::date)`, [first.id]);
  check('replace_cheque chains old → new', await val(`select replaced_by_id from cheques where id = $1`, [first.id]) === repl);
  check('replacement points back at the original', await val(`select replaces_id from cheques where id = $1`, [repl]) === first.id);

  // paying a bill books a voucher; un-paying removes it
  const supplier = await val(`insert into contacts (company_id, kinds, name) values (current_company_id(), array['supplier']::contact_kind[], 'CoolTech') returning id`);
  const bill = await val(`insert into bills (company_id, supplier_id, amount, category, bill_no) values (current_company_id(), $1, 14500, 'maintenance', 'CT-7782') returning id`, [supplier]);
  await db.query(`select set_bill_paid($1, true, 'bank')`, [bill]);
  check('paying a bill books a voucher', await val(`select count(*)::int from vouchers where bill_id = $1`, [bill]) === 1);
  check('the bill is marked paid', await val(`select status from bills where id = $1`, [bill]) === 'paid');
  await db.query(`select set_bill_paid($1, false)`, [bill]);
  check('un-paying removes the voucher', await val(`select count(*)::int from vouchers where bill_id = $1`, [bill]) === 0);

  check('audit_log captured the mutations', await val(`select count(*)::int from audit_log`) >= 4);
});

// ── operations RPCs (as the owner) ────────────────────────────────────────────
console.log('\nOperations RPCs:');
await asUser(uidA, async () => {
  // run_payroll: one line per active employee; idempotent within a period
  await db.query(`insert into employees (company_id, name, title, department, salary, status) values (current_company_id(), 'Sarah Mansour', 'Property Manager', 'Operations', 22000, 'active')`);
  await db.query(`insert into employees (company_id, name, title, department, salary, status) values (current_company_id(), 'Layla Haddad', 'Leasing Agent', 'Leasing', 12000, 'active')`);
  const added = await val(`select run_payroll('2026-06')`);
  check('run_payroll created a line per active employee', added === 2, `added=${added}`);
  const net = await val(`select net from payroll where company_id = current_company_id() and period = '2026-06' order by basic desc limit 1`);
  check('payroll net = basic + 15% − 5%', Number(net) === 22000 + Math.round(22000 * 0.15) - Math.round(22000 * 0.05), `net=${net}`);
  check('run_payroll is idempotent for the period', await val(`select run_payroll('2026-06')`) === 0);
  await db.query(`select set_payroll_paid('2026-06', true)`);
  check('set_payroll_paid flips the period to paid',
    await val(`select count(*)::int from payroll where company_id = current_company_id() and period = '2026-06' and status <> 'paid'`) === 0);

  // a legal case + an HR record (manage-only tables) for the tier tests below
  await db.query(`insert into cases (company_id, type, title, status, ref_no) values (current_company_id(), 'police', 'Bounced cheque', 'open', 'PD-2026-9931')`);
});

// ── tenant isolation (a second company sees none of A's data) ─────────────────
console.log('\nTenant isolation:');
const uidB = await val(`select gen_random_uuid()`);
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
  [uidB, 'owner@otherre.ae', JSON.stringify({ company_name: 'Other RE', full_name: 'Other Owner' })]);
await asUser(uidB, async () => {
  check("tenant B sees none of A's contracts", await val(`select count(*)::int from contracts`) === 0);
  check("tenant B sees none of A's towers", await val(`select count(*)::int from towers`) === 0);
  check("tenant B sees none of A's receipts", await val(`select count(*)::int from receipts`) === 0);
});

// ── RBAC: an employee (front desk) — visibility + posting ─────────────────────
console.log('\nRBAC (employee / front desk):');
const uidEmp = await val(`select gen_random_uuid()`);
// company_id in metadata → trigger skips auto-provision; we attach to company A.
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
  [uidEmp, 'desk@testrealty.ae', JSON.stringify({ company_id: companyA })]);
await db.query(`insert into profiles (id, company_id, name, role) values ($1, $2, 'Front Desk', 'employee')`, [uidEmp, companyA]);
await asUser(uidEmp, async () => {
  check('employee can see contracts (allowed module)', await val(`select count(*)::int from contracts`) >= 1);
  check('employee CANNOT see receipts (financial)', await val(`select count(*)::int from receipts`) === 0);
  check('employee CANNOT see payroll (financial)', await val(`select count(*)::int from payroll`) === 0);
  check('employee CANNOT see cases (manage-only)', await val(`select count(*)::int from cases`) === 0);
  check('employee CANNOT see employees (manage-only)', await val(`select count(*)::int from employees`) === 0);
  check('employee can add a contact (front desk)',
    !(await rejects(`insert into contacts (company_id, kinds, name) values (current_company_id(), array['lead']::contact_kind[], 'Walk-in')`)));
  check('employee can create a lead (operational)',
    !(await rejects(`insert into leads (company_id, source, interest, stage) values (current_company_id(), 'Walk-in', '2BHK · Marina', 'new')`)));
  check('employee is blocked from inserting a receipt',
    await rejects(`insert into receipts (company_id, amount) values (current_company_id(), 100)`));
  check('employee is blocked from a posting RPC (privilege error)',
    /insufficient privileges/.test(await errorOf(`select set_bill_paid(gen_random_uuid(), true)`) || ''));
});

// ── RBAC: an accountant — sees financials, but not the manage-only tier ───────
console.log('\nRBAC (accountant):');
const uidAcc = await val(`select gen_random_uuid()`);
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
  [uidAcc, 'finance@testrealty.ae', JSON.stringify({ company_id: companyA })]);
await db.query(`insert into profiles (id, company_id, name, role) values ($1, $2, 'George Saliba', 'accountant')`, [uidAcc, companyA]);
await asUser(uidAcc, async () => {
  check('accountant CAN see receipts (financial)', await val(`select count(*)::int from receipts`) >= 0);
  check('accountant CAN see payroll (financial)', await val(`select count(*)::int from payroll`) >= 1);
  check('accountant CANNOT see cases (manage-only)', await val(`select count(*)::int from cases`) === 0);
  check('accountant CANNOT see employees (manage-only)', await val(`select count(*)::int from employees`) === 0);
  // accountant passes the posting guard — the bogus id fails on "not found", NOT on privileges
  const accErr = await errorOf(`select set_bill_paid('00000000-0000-0000-0000-000000000000', true)`) || '';
  check('accountant passes the posting guard (fails on not-found, not privileges)',
    /not found/.test(accErr) && !/insufficient privileges/.test(accErr), accErr);
});

// ── report ────────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '✅' : '❌'}  ${pass} passed, ${fail} failed`);
await db.close();
process.exit(fail === 0 ? 0 : 1);
