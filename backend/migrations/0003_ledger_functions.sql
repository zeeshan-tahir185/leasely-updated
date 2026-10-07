-- =============================================================================
-- 0003_ledger_functions.sql
-- Leasely backend — the ledger invariants, ported from src/data/store.jsx to
-- atomic, authorized server-side functions.
--
-- These replace the side-effecting actions that currently run in the browser:
--   create_contract    → emits the post-dated cheque schedule (exact-sum split)
--   set_cheque_status  → clearing an incoming cheque books a rent receipt;
--                        un-clearing removes it
--   replace_cheque     → swap a bounced cheque for a fresh one (chained)
--   renew_contract     → new term + a fresh cheque schedule
--   set_bill_paid      → paying a supplier bill books a payment voucher; un-paying removes it
--   delete_cheque      → delete + heal replacement links (receipt cascades)
--
-- All are SECURITY DEFINER, so they MUST enforce tenant + role themselves (the
-- definer bypasses RLS). Every function: (1) requires an authenticated caller,
-- (2) requires can_post(), (3) only ever touches rows in current_company_id(),
-- (4) writes an audit_log row. Contract/bill DELETEs that need no healing rely on
-- ON DELETE CASCADE + the direct RLS delete policy.
-- =============================================================================

-- ── internal: emit a contract's installment cheques ───────────────────────────
-- Due dates track the contract's start day; Postgres month-addition clamps a
-- 31st-of-month start to the target month's length, matching store.jsx. The
-- annual rent is split so the cheques sum to it EXACTLY (leftover dirhams spread
-- +1 across the first cheques of each year). Not exposed to clients.
create or replace function _emit_cheques(p_contract_id uuid)
returns int language plpgsql as $$
declare
  c           contracts%rowtype;
  term_months int;
  n           int;
  months_per  int;
  rent        numeric;
  base        numeric;
  remainder   numeric;
  banks       text[] := array['Emirates NBD','ADCB','Mashreq','FAB','DIB'];
  m           int := 0;
  k           int := 0;
  cnt         int := 0;
begin
  select * into c from contracts where id = p_contract_id;
  if not found then raise exception 'contract % not found', p_contract_id; end if;

  term_months := greatest(1,
      (extract(year  from c.end_date)::int - extract(year  from c.start_date)::int) * 12
    + (extract(month from c.end_date)::int - extract(month from c.start_date)::int));
  n          := greatest(1, c.installments);
  months_per := greatest(1, round(12.0 / n)::int);
  rent       := round(c.annual_rent);
  base       := floor(rent / n);
  remainder  := rent - base * n;

  while m < term_months loop
    insert into cheques (
      company_id, tower_id, kind, contract_id, contact_id, amount,
      due_date, bank_name, cheque_no, status)
    values (
      c.company_id, c.tower_id, 'in', c.id, c.tenant_id,
      base + case when (k % n) < remainder then 1 else 0 end,
      (c.start_date + make_interval(months => m))::date,
      banks[(k % array_length(banks, 1)) + 1],
      (100000 + floor(random() * 899999))::int::text,
      'pending');
    cnt := cnt + 1;
    m   := m + months_per;
    k   := k + 1;
  end loop;
  return cnt;
end $$;

-- ── guard: every public RPC starts here ───────────────────────────────────────
create or replace function _require_post() returns uuid
language plpgsql stable as $$
declare v uuid := current_company_id();
begin
  if v is null     then raise exception 'not authenticated'      using errcode = '28000'; end if;
  if not can_post() then raise exception 'insufficient privileges' using errcode = '42501'; end if;
  return v;
end $$;

-- ── create_contract ────────────────────────────────────────────────────────────
create or replace function create_contract(
  p_tower_id uuid, p_unit_id uuid, p_tenant_id uuid,
  p_annual_rent numeric, p_installments int, p_start_date date, p_end_date date,
  p_type contract_type default 'Residential',
  p_deposit numeric default 0, p_commission numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); v_id uuid; v_no text;
begin
  v_no := 'WW-' || (1100 + (select count(*) from contracts where company_id = v_company));
  -- The composite FKs to (x_id, company_id) reject any tower/unit/tenant that
  -- isn't this company's, so cross-tenant references can't be forged here.
  insert into contracts (
    company_id, tower_id, unit_id, tenant_id, contract_no, type,
    annual_rent, installments, start_date, end_date, deposit, commission, status)
  values (
    v_company, p_tower_id, p_unit_id, p_tenant_id, v_no, p_type,
    p_annual_rent, greatest(1, p_installments), p_start_date, p_end_date,
    coalesce(p_deposit, 0), coalesce(p_commission, 0), 'active')
  returning id into v_id;

  perform _emit_cheques(v_id);
  perform write_audit(v_company, 'contract.create', 'contracts', v_id,
                      null, (select to_jsonb(c) from contracts c where c.id = v_id));
  return v_id;
end $$;

-- ── set_cheque_status (clear ↔ receipt) ─────────────────────────────────────────
create or replace function set_cheque_status(p_cheque_id uuid, p_status cheque_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := _require_post();
  ch        cheques%rowtype;
  v_cleared boolean := (p_status = 'cleared');
begin
  select * into ch from cheques where id = p_cheque_id and company_id = v_company;
  if not found then raise exception 'cheque % not found', p_cheque_id; end if;

  update cheques
     set status = p_status,
         cleared_date = case when v_cleared then current_date else null end
   where id = p_cheque_id;

  if ch.kind = 'in' then
    if v_cleared then
      if not exists (select 1 from receipts where cheque_id = p_cheque_id) then
        insert into receipts (
          company_id, tower_id, date, contact_id, amount, method,
          cheque_id, against, contract_id, receipt_no)
        values (
          ch.company_id, ch.tower_id, current_date, ch.contact_id, ch.amount, 'cheque',
          ch.id, 'rent', ch.contract_id, 'RV-' || (8000 + floor(random() * 1900))::int);
      end if;
    else
      delete from receipts where cheque_id = p_cheque_id;
    end if;
  end if;

  perform write_audit(v_company, 'cheque.status:' || p_status, 'cheques', p_cheque_id,
                      to_jsonb(ch), (select to_jsonb(c) from cheques c where c.id = p_cheque_id));
end $$;

-- ── replace_cheque ──────────────────────────────────────────────────────────────
create or replace function replace_cheque(
  p_cheque_id uuid, p_due_date date default null,
  p_cheque_no text default null, p_bank_name text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); old cheques%rowtype; v_new uuid;
begin
  select * into old from cheques where id = p_cheque_id and company_id = v_company;
  if not found then raise exception 'cheque % not found', p_cheque_id; end if;

  insert into cheques (
    company_id, tower_id, kind, contract_id, contact_id, amount, due_date,
    bank_name, cheque_no, status, replaces_id)
  values (
    old.company_id, old.tower_id, old.kind, old.contract_id, old.contact_id, old.amount,
    coalesce(p_due_date, old.due_date), coalesce(p_bank_name, old.bank_name),
    coalesce(p_cheque_no, old.cheque_no), 'pending', old.id)
  returning id into v_new;

  update cheques set status = 'replaced', replaced_by_id = v_new where id = old.id;
  perform write_audit(v_company, 'cheque.replace', 'cheques', old.id, to_jsonb(old), null);
  return v_new;
end $$;

-- ── renew_contract ──────────────────────────────────────────────────────────────
create or replace function renew_contract(p_contract_id uuid, p_annual_rent numeric default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); c contracts%rowtype;
begin
  select * into c from contracts where id = p_contract_id and company_id = v_company;
  if not found then raise exception 'contract % not found', p_contract_id; end if;

  update contracts
     set start_date  = c.end_date,
         end_date    = (c.end_date + interval '1 year')::date,
         annual_rent = coalesce(p_annual_rent, c.annual_rent),
         status      = 'active'
   where id = p_contract_id;

  perform _emit_cheques(p_contract_id);
  perform write_audit(v_company, 'contract.renew', 'contracts', p_contract_id, to_jsonb(c), null);
end $$;

-- ── set_bill_paid (pay ↔ voucher) ───────────────────────────────────────────────
create or replace function set_bill_paid(
  p_bill_id uuid, p_paid boolean, p_method payment_method default 'bank'
) returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); b bills%rowtype;
begin
  select * into b from bills where id = p_bill_id and company_id = v_company;
  if not found then raise exception 'bill % not found', p_bill_id; end if;

  if p_paid then
    if b.status = 'paid' then return; end if;
    insert into vouchers (
      company_id, tower_id, date, payee_id, amount, category, method, ref, voucher_no, bill_id)
    values (
      b.company_id, b.tower_id, current_date, b.supplier_id, b.amount, b.category, p_method, b.bill_no,
      'PV-' || (9000 + floor(random() * 900))::int, b.id);
    update bills set status = 'paid', paid_date = current_date where id = p_bill_id;
  else
    delete from vouchers where bill_id = p_bill_id;
    update bills set status = 'unpaid', paid_date = null where id = p_bill_id;
  end if;

  perform write_audit(v_company, 'bill.paid:' || p_paid, 'bills', p_bill_id, to_jsonb(b), null);
end $$;

-- ── delete_cheque (heal replacement links) ──────────────────────────────────────
create or replace function delete_cheque(p_cheque_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid := _require_post(); ch cheques%rowtype;
begin
  select * into ch from cheques where id = p_cheque_id and company_id = v_company;
  if not found then raise exception 'cheque % not found', p_cheque_id; end if;

  -- An original whose replacement is removed goes back to 'bounced'; a stale
  -- replaces_id pointer is cleared. (Then the row's receipt cascades on delete.)
  update cheques
     set replaced_by_id = null,
         status = case when status = 'replaced' then 'bounced'::cheque_status else status end
   where company_id = v_company and replaced_by_id = p_cheque_id;
  update cheques set replaces_id = null
   where company_id = v_company and replaces_id = p_cheque_id;

  delete from cheques where id = p_cheque_id;
  perform write_audit(v_company, 'cheque.delete', 'cheques', p_cheque_id, to_jsonb(ch), null);
end $$;

-- ── grants (clients call these as the authenticated role) ─────────────────────
grant execute on function
  create_contract(uuid, uuid, uuid, numeric, int, date, date, contract_type, numeric, numeric),
  set_cheque_status(uuid, cheque_status),
  replace_cheque(uuid, date, text, text),
  renew_contract(uuid, numeric),
  set_bill_paid(uuid, boolean, payment_method),
  delete_cheque(uuid)
  to authenticated;
