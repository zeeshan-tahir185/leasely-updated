// Builds the seeded, internally-consistent demo database for the prototype.
// Everything is dated relative to today so the app always looks current:
// cheques fall due around now, contracts are mid-term, a couple expire soon.
import { isoOf } from "../lib/format";

const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth();
const D = now.getDate();
const daysFrom = (n) => isoOf(new Date(Y, M, D + n));
const monthsFrom = (n, day = 1) => isoOf(new Date(Y, M + n, day));
const pad = (n) => String(n).padStart(2, "0");
const periodOf = (iso) => iso.slice(0, 7);

let _n = 0;
const uid = (p) => `${p}-${(++_n).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export function buildSeed() {
  // ---- companies & people ----------------------------------------------------
  const companies = [
    { id: "co-westwood", name: "Westwood Real Estate LLC", license: "CN-1184422", address: "Marasi Drive, Business Bay, Dubai", phone: "+971 4 555 1100", email: "info@westwood.ae", trn: "100412559800003", brandText: "Westwood" },
    { id: "co-marina", name: "Marina Asset Management", license: "CN-2290117", address: "Marina Plaza, Dubai Marina", phone: "+971 4 555 7720", email: "office@marina-am.ae", trn: "100558810400003", brandText: "Marina AM" },
  ];

  const users = [
    { id: "u-sarah", companyId: "co-westwood", name: "Sarah Mansour", email: "sarah@westwood.ae", role: "manager", title: "Property Manager", phone: "+971 50 555 0148" },
    { id: "u-ahmed", companyId: "co-westwood", name: "Ahmed Al-Futtaim", email: "ahmed@westwood.ae", role: "owner", title: "Managing Director", phone: "+971 50 555 0101" },
    { id: "u-layla", companyId: "co-westwood", name: "Layla Haddad", email: "layla@westwood.ae", role: "employee", title: "Leasing Agent", phone: "+971 52 555 0162" },
    { id: "u-george", companyId: "co-westwood", name: "George Saliba", email: "george@westwood.ae", role: "accountant", title: "Accountant", phone: "+971 55 555 0133" },
    { id: "u-marina", companyId: "co-marina", name: "Noura Khalil", email: "noura@marina-am.ae", role: "manager", title: "Portfolio Manager", phone: "+971 50 555 0900" },
  ];

  // ---- towers & units --------------------------------------------------------
  const towers = [
    { id: "tw-heights", companyId: "co-westwood", name: "Marina Heights", area: "Dubai Marina", address: "Marina Walk, Tower 2", plot: "DM-228", floors: 24, type: "Residential", ownerName: "Al-Futtaim Holdings" },
    { id: "tw-blvd", companyId: "co-westwood", name: "Boulevard Residences", area: "Downtown Dubai", address: "Sheikh Mohammed bin Rashid Blvd", plot: "DT-094", floors: 18, type: "Mixed Use", ownerName: "Westwood Holdings" },
    { id: "tw-canal", companyId: "co-westwood", name: "Canal Court", area: "Business Bay", address: "Marasi Drive", plot: "BB-451", floors: 12, type: "Residential", ownerName: "Marasi Investments" },
    { id: "tw-pearl", companyId: "co-marina", name: "Pearl Tower", area: "Dubai Marina", address: "Marina Promenade", plot: "DM-310", floors: 30, type: "Residential", ownerName: "Marina AM" },
  ];

  const unitDefs = [
    // Marina Heights
    ["tw-heights", "1204", 12, "2BHK", 2, 2, 1180, 130000],
    ["tw-heights", "1806", 18, "1BHK", 1, 1, 820, 95000],
    ["tw-heights", "2203", 22, "3BHK", 3, 3, 1650, 195000],
    ["tw-heights", "0902", 9, "1BHK", 1, 1, 800, 92000],
    ["tw-heights", "1501", 15, "2BHK", 2, 2, 1200, 135000],
    ["tw-heights", "0405", 4, "Studio", 0, 1, 540, 62000],
    // Boulevard Residences
    ["tw-blvd", "G-04", 0, "Retail Shop", 0, 1, 1100, 320000],
    ["tw-blvd", "1102", 11, "2BHK", 2, 2, 1240, 165000],
    ["tw-blvd", "1407", 14, "1BHK", 1, 1, 860, 110000],
    ["tw-blvd", "0508", 5, "Office", 0, 2, 1400, 180000],
    // Canal Court
    ["tw-canal", "0301", 3, "2BHK", 2, 2, 1150, 125000],
    ["tw-canal", "0705", 7, "1BHK", 1, 1, 810, 98000],
    ["tw-canal", "1002", 10, "3BHK", 3, 3, 1700, 210000],
    // Pearl Tower (co-marina)
    ["tw-pearl", "2504", 25, "2BHK", 2, 2, 1300, 150000],
    ["tw-pearl", "1808", 18, "1BHK", 1, 1, 880, 105000],
  ];
  const units = unitDefs.map(([towerId, label, floor, unitType, beds, baths, sqft, annualMarket]) => ({
    id: uid("un"),
    towerId,
    label,
    floor,
    unitType,
    beds,
    baths,
    sqft,
    annualRent: annualMarket, // market asking rent (yearly, AED)
  }));
  const unitByLabel = (towerId, label) => units.find((u) => u.towerId === towerId && u.label === label);

  // ---- contacts (tenants, owners, suppliers, buyers) -------------------------
  const contacts = [
    { id: "c-maya", companyId: "co-westwood", kind: ["tenant"], name: "Maya Alvarez", email: "maya.alvarez@gmail.com", phone: "+971 50 555 0148", emiratesId: "784-1989-1234567-1", nationality: "Spain" },
    { id: "c-daniel", companyId: "co-westwood", kind: ["tenant"], name: "Daniel Okafor", email: "d.okafor@outlook.com", phone: "+971 52 555 0192", emiratesId: "784-1985-2233445-2", nationality: "Nigeria" },
    { id: "c-priya", companyId: "co-westwood", kind: ["tenant"], name: "Priya Nair", email: "priya.nair@gmail.com", phone: "+971 50 555 0173", emiratesId: "784-1990-3344556-3", nationality: "India" },
    { id: "c-omar", companyId: "co-westwood", kind: ["tenant"], name: "Omar Haddad", email: "haddad.home@gmail.com", phone: "+971 55 555 0119", emiratesId: "784-1982-4455667-4", nationality: "Lebanon" },
    { id: "c-yusuf", companyId: "co-westwood", kind: ["tenant", "buyer"], name: "Yusuf Al-Karim", email: "yusuf.karim@gmail.com", phone: "+971 50 555 0136", emiratesId: "784-1979-5566778-5", nationality: "UAE" },
    { id: "c-sofia", companyId: "co-westwood", kind: ["tenant"], name: "Sofia Romano", email: "sofia.romano@gmail.com", phone: "+971 50 555 0166", emiratesId: "784-1991-6677889-6", nationality: "Italy" },
    { id: "c-marcus", companyId: "co-westwood", kind: ["tenant"], name: "Marcus Webb", email: "marcus.webb@gmail.com", phone: "+971 52 555 0131", emiratesId: "784-1987-7788990-7", nationality: "UK" },
    { id: "c-aisha", companyId: "co-westwood", kind: ["tenant"], name: "Aisha Demir", email: "aisha.demir@gmail.com", phone: "+971 55 555 0127", emiratesId: "784-1984-8899001-8", nationality: "Turkey" },
    { id: "c-novapx", companyId: "co-westwood", kind: ["tenant"], name: "Nova FZ-LLC", email: "ops@nova.ae", phone: "+971 4 555 2210", company: "Nova FZ-LLC", nationality: "Free Zone" },
    // owners (landlords)
    { id: "c-futtaim", companyId: "co-westwood", kind: ["owner"], name: "Al-Futtaim Holdings", email: "leasing@alfuttaim.ae", phone: "+971 4 555 9000", company: "Al-Futtaim Holdings" },
    { id: "c-marasi", companyId: "co-westwood", kind: ["owner"], name: "Marasi Investments", email: "info@marasi.ae", phone: "+971 4 555 9100", company: "Marasi Investments" },
    // suppliers
    { id: "c-cooltech", companyId: "co-westwood", kind: ["supplier"], name: "CoolTech AC Services", email: "service@cooltech.ae", phone: "+971 4 555 3300", company: "CoolTech LLC" },
    { id: "c-brightclean", companyId: "co-westwood", kind: ["supplier"], name: "BrightClean Facilities", email: "accounts@brightclean.ae", phone: "+971 4 555 3400", company: "BrightClean FM" },
    { id: "c-dewa", companyId: "co-westwood", kind: ["supplier"], name: "DEWA", email: "billing@dewa.gov.ae", phone: "+971 4 601 9999", company: "Dubai Electricity & Water" },
    { id: "c-securefix", companyId: "co-westwood", kind: ["supplier"], name: "SecureFix Maintenance", email: "jobs@securefix.ae", phone: "+971 4 555 3500", company: "SecureFix LLC" },
    // leads / prospective tenants
    { id: "c-lead-hana", companyId: "co-westwood", kind: ["lead"], name: "Hana Schmidt", email: "h.schmidt@gmail.com", phone: "+971 55 555 0155", nationality: "Germany" },
    { id: "c-lead-raj", companyId: "co-westwood", kind: ["lead"], name: "Raj Patel", email: "raj.patel@gmail.com", phone: "+971 50 555 0188", nationality: "India" },
    { id: "c-lead-grace", companyId: "co-westwood", kind: ["lead", "buyer"], name: "Grace Kim", email: "grace.kim@gmail.com", phone: "+971 56 555 0142", nationality: "South Korea" },
    { id: "c-lead-sophie", companyId: "co-westwood", kind: ["lead"], name: "Sophie Laurent", email: "s.laurent@gmail.com", phone: "+971 50 555 0211", nationality: "France" },
    { id: "c-lead-tariq", companyId: "co-westwood", kind: ["lead"], name: "Tariq Mansoor", email: "tariq.m@gmail.com", phone: "+971 55 555 0233", nationality: "UAE" },
    { id: "c-lead-mei", companyId: "co-westwood", kind: ["lead"], name: "Mei Chen", email: "mei.chen@gmail.com", phone: "+971 52 555 0277", nationality: "China" },
    { id: "c-lead-james", companyId: "co-westwood", kind: ["lead"], name: "James Carter", email: "j.carter@gmail.com", phone: "+971 50 555 0299", nationality: "USA" },
    { id: "c-lead-fatima", companyId: "co-westwood", kind: ["lead"], name: "Fatima Al-Suwaidi", email: "fatima.s@gmail.com", phone: "+971 56 555 0301", nationality: "UAE" },
    // co-marina
    { id: "c-marina-t1", companyId: "co-marina", kind: ["tenant"], name: "Oliver Bennett", email: "oliver.b@gmail.com", phone: "+971 50 555 0909", nationality: "UK" },
  ];

  // ---- contracts (tenancy) ---------------------------------------------------
  // [company, tower, unitLabel, tenantId, annualRent, installments, startMonthsAgo, termMonths, status]
  const contractDefs = [
    ["co-westwood", "tw-heights", "1204", "c-maya", 130000, 4, -8, 12, "active"],
    ["co-westwood", "tw-heights", "1806", "c-daniel", 92000, 12, -5, 12, "active"],
    ["co-westwood", "tw-heights", "2203", "c-priya", 195000, 2, -10, 12, "expiring"],
    ["co-westwood", "tw-heights", "1501", "c-omar", 135000, 4, -3, 12, "active"],
    ["co-westwood", "tw-blvd", "G-04", "c-novapx", 320000, 4, -7, 24, "active"],
    ["co-westwood", "tw-blvd", "1102", "c-sofia", 165000, 2, -11, 12, "expiring"],
    ["co-westwood", "tw-blvd", "0508", "c-marcus", 180000, 4, -2, 12, "active"],
    ["co-westwood", "tw-canal", "0301", "c-aisha", 125000, 4, -6, 12, "active"],
    ["co-westwood", "tw-canal", "1002", "c-yusuf", 210000, 1, -14, 12, "expired"],
    ["co-marina", "tw-pearl", "2504", "c-marina-t1", 150000, 4, -4, 12, "active"],
  ];

  const contracts = [];
  const cheques = [];
  const receipts = [];
  let contractSeq = 1000;
  let chequeSeq = 5000;
  let receiptSeq = 8000;

  for (const [companyId, towerId, unitLabel, tenantId, annualRent, installments, startMo, termMonths, status] of contractDefs) {
    const unit = unitByLabel(towerId, unitLabel);
    const cid = uid("ct");
    const startDate = monthsFrom(startMo, 1);
    const endDate = monthsFrom(startMo + termMonths, 1);
    const deposit = Math.round(annualRent * 0.05);
    contracts.push({
      id: cid,
      companyId,
      towerId,
      unitId: unit.id,
      tenantId,
      contractNo: `WW-${++contractSeq}`,
      type: unit.unitType === "Office" || unit.unitType === "Retail Shop" ? "Commercial" : "Residential",
      annualRent,
      installments,
      startDate,
      endDate,
      deposit,
      commission: Math.round(annualRent * 0.05),
      status,
    });

    // Generate the installment cheques across the term. Split so they sum to the
    // annual rent EXACTLY (leftover dirhams spread +1 across the first cheques).
    const monthsPer = Math.max(1, Math.round(12 / installments));
    const base = Math.floor(annualRent / installments);
    const remainder = annualRent - base * installments;
    const amountFor = (k) => base + (k % installments < remainder ? 1 : 0);
    const banks = ["Emirates NBD", "ADCB", "Mashreq", "FAB", "DIB"];
    for (let m = 0, k = 0; m < termMonths; m += monthsPer, k++) {
      const dueIso = monthsFrom(startMo + m, 1); // cheques track the contract start day (the 1st)
      const due = new Date(dueIso);
      let chStatus = "pending";
      let clearedDate;
      if (due < new Date(Y, M, D)) {
        // past cheque: mostly cleared, occasional bounce
        chStatus = (k === 1 && tenantId === "c-daniel") ? "bounced" : "cleared";
        if (chStatus === "cleared") clearedDate = dueIso;
      }
      const chId = uid("chq");
      cheques.push({
        id: chId,
        companyId,
        towerId,
        kind: "in",
        contractId: cid,
        contactId: tenantId,
        amount: amountFor(k),
        dueDate: dueIso,
        bankName: banks[(contractSeq + k) % banks.length],
        chequeNo: String(100000 + (chequeSeq += 7)),
        status: chStatus,
        clearedDate,
      });
      // A cleared incoming cheque produces a rent receipt.
      if (chStatus === "cleared") {
        receipts.push({
          id: uid("rcp"),
          companyId,
          towerId,
          date: clearedDate,
          contactId: tenantId,
          amount: amountFor(k),
          method: "cheque",
          chequeId: chId,
          against: "rent",
          contractId: cid,
          voucherNo: `RV-${++receiptSeq}`,
        });
      }
    }
  }

  // A standalone deposit receipt (bank transfer) for the newest contract.
  receipts.push({
    id: uid("rcp"), companyId: "co-westwood", towerId: "tw-blvd", date: monthsFrom(-2, 3),
    contactId: "c-marcus", amount: 9000, method: "bank", against: "deposit",
    contractId: contracts.find((c) => c.tenantId === "c-marcus")?.id, voucherNo: `RV-${++receiptSeq}`,
  });

  // ---- suppliers' bills & payment vouchers (money out) -----------------------
  const bills = [
    { id: uid("bill"), companyId: "co-westwood", towerId: "tw-heights", supplierId: "c-cooltech", date: daysFrom(-20), dueDate: daysFrom(10), amount: 14500, category: "maintenance", status: "unpaid", billNo: "CT-7782" },
    { id: uid("bill"), companyId: "co-westwood", towerId: "tw-blvd", supplierId: "c-brightclean", date: daysFrom(-35), dueDate: daysFrom(-5), amount: 8200, category: "cleaning", status: "overdue", billNo: "BC-3391" },
    { id: uid("bill"), companyId: "co-westwood", towerId: "tw-canal", supplierId: "c-dewa", date: daysFrom(-12), dueDate: daysFrom(8), amount: 21750, category: "utility", status: "unpaid", billNo: "DEWA-55120" },
    { id: uid("bill"), companyId: "co-westwood", towerId: "tw-heights", supplierId: "c-securefix", date: daysFrom(-50), dueDate: daysFrom(-25), amount: 6400, category: "maintenance", status: "paid", billNo: "SF-1180" },
  ];

  let voucherSeq = 9000;
  const vouchers = [
    { id: uid("pv"), companyId: "co-westwood", towerId: "tw-heights", date: daysFrom(-24), payeeId: "c-securefix", amount: 6400, category: "maintenance", method: "cheque", ref: "SF-1180", voucherNo: `PV-${++voucherSeq}` },
    { id: uid("pv"), companyId: "co-westwood", towerId: "tw-blvd", date: daysFrom(-40), payeeId: "c-brightclean", amount: 8200, category: "cleaning", method: "bank", ref: "BC-3300", voucherNo: `PV-${++voucherSeq}` },
    { id: uid("pv"), companyId: "co-westwood", towerId: "tw-canal", date: monthsFrom(-1, 28), payeeId: "c-dewa", amount: 19300, category: "utility", method: "bank", ref: "DEWA-54880", voucherNo: `PV-${++voucherSeq}` },
    { id: uid("pv"), companyId: "co-westwood", towerId: "tw-heights", date: monthsFrom(-1, 2), payeeId: "c-futtaim", amount: 58000, category: "owner-payout", method: "bank", ref: "Owner remittance", voucherNo: `PV-${++voucherSeq}` },
  ];

  // ---- maintenance / claims --------------------------------------------------
  const maintenance = [
    { id: uid("mt"), companyId: "co-westwood", towerId: "tw-heights", unitId: unitByLabel("tw-heights", "1204").id, reporterId: "c-maya", category: "AC / Cooling", priority: "high", status: "in_progress", assignee: "CoolTech AC Services", cost: 14500, title: "AC not cooling in master bedroom", createdAt: daysFrom(-3) },
    { id: uid("mt"), companyId: "co-westwood", towerId: "tw-blvd", unitId: unitByLabel("tw-blvd", "1102").id, reporterId: "c-sofia", category: "Plumbing", priority: "urgent", status: "new", title: "Water leak under kitchen sink", createdAt: daysFrom(-1) },
    { id: uid("mt"), companyId: "co-westwood", towerId: "tw-canal", unitId: unitByLabel("tw-canal", "0301").id, reporterId: "c-aisha", category: "Electrical", priority: "medium", status: "assigned", assignee: "SecureFix Maintenance", title: "Living room sockets not working", createdAt: daysFrom(-5) },
    { id: uid("mt"), companyId: "co-westwood", towerId: "tw-heights", unitId: unitByLabel("tw-heights", "1806").id, reporterId: "c-daniel", category: "General", priority: "low", status: "resolved", assignee: "SecureFix Maintenance", cost: 850, title: "Replace bathroom door handle", createdAt: daysFrom(-14) },
  ];

  // ---- leads (CRM pipeline) --------------------------------------------------
  const leads = [
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-hana", source: "Property Finder", interest: "1BHK · Marina", budget: 100000, stage: "viewing", towerId: "tw-heights", createdAt: daysFrom(-6), owner: "u-layla" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-raj", source: "Bayut", interest: "2BHK · Business Bay", budget: 130000, stage: "negotiation", towerId: "tw-canal", createdAt: daysFrom(-9), owner: "u-layla" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-grace", source: "Referral", interest: "Buy · 3BHK", budget: 2400000, stage: "new", towerId: "tw-heights", createdAt: daysFrom(-2), owner: "u-sarah" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-sophie", source: "Dubizzle", interest: "Studio · Downtown", budget: 65000, stage: "new", towerId: "tw-blvd", createdAt: daysFrom(-1), owner: "u-layla" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-tariq", source: "Walk-in", interest: "2BHK · Marina", budget: 140000, stage: "contacted", towerId: "tw-heights", createdAt: daysFrom(-4), owner: "u-layla" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-mei", source: "Website", interest: "1BHK · Business Bay", budget: 95000, stage: "viewing", towerId: "tw-canal", createdAt: daysFrom(-7), owner: "u-sarah" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-james", source: "Referral", interest: "Office · Downtown", budget: 180000, stage: "negotiation", towerId: "tw-blvd", createdAt: daysFrom(-11), owner: "u-sarah" },
    { id: uid("ld"), companyId: "co-westwood", contactId: "c-lead-fatima", source: "Bayut", interest: "3BHK · Marina", budget: 200000, stage: "won", towerId: "tw-heights", createdAt: daysFrom(-15), owner: "u-layla" },
  ];

  // ---- bookings --------------------------------------------------------------
  const bookings = [
    { id: uid("bk"), companyId: "co-westwood", unitId: unitByLabel("tw-heights", "0902").id, contactId: "c-lead-hana", amount: 95000, status: "held", date: daysFrom(-2), expiresAt: daysFrom(5) },
    { id: uid("bk"), companyId: "co-westwood", unitId: unitByLabel("tw-blvd", "1407").id, contactId: "c-lead-raj", amount: 110000, status: "confirmed", date: daysFrom(-4), expiresAt: daysFrom(3) },
  ];

  // ---- legal / police cases --------------------------------------------------
  const cases = [
    { id: uid("cs"), companyId: "co-westwood", type: "legal", title: "Rent recovery — Unit 1002 (expired, unpaid)", contactId: "c-yusuf", towerId: "tw-canal", status: "in_court", refNo: "RDC-2026-1187", openedAt: daysFrom(-22) },
    { id: uid("cs"), companyId: "co-westwood", type: "police", title: "Bounced cheque — Daniel Okafor", contactId: "c-daniel", towerId: "tw-heights", status: "open", refNo: "PD-2026-9931", openedAt: daysFrom(-8) },
  ];

  // ---- HR & payroll ----------------------------------------------------------
  const employees = [
    { id: "e-sarah", companyId: "co-westwood", name: "Sarah Mansour", title: "Property Manager", department: "Operations", salary: 22000, joinDate: monthsFrom(-30, 1), status: "active" },
    { id: "e-layla", companyId: "co-westwood", name: "Layla Haddad", title: "Leasing Agent", department: "Leasing", salary: 12000, joinDate: monthsFrom(-14, 1), status: "active" },
    { id: "e-george", companyId: "co-westwood", name: "George Saliba", title: "Accountant", department: "Finance", salary: 16000, joinDate: monthsFrom(-20, 1), status: "active" },
    { id: "e-faisal", companyId: "co-westwood", name: "Faisal Noor", title: "Maintenance Supervisor", department: "Operations", salary: 9000, joinDate: monthsFrom(-9, 1), status: "active" },
  ];
  const curPeriod = `${Y}-${pad(M + 1)}`;
  const prevPeriod = periodOf(monthsFrom(-1, 1));
  const payroll = [];
  for (const e of employees) {
    for (const [period, status] of [[prevPeriod, "paid"], [curPeriod, "pending"]]) {
      const allowances = Math.round(e.salary * 0.15);
      const deductions = Math.round(e.salary * 0.05);
      payroll.push({ id: uid("pr"), companyId: e.companyId, employeeId: e.id, period, basic: e.salary, allowances, deductions, net: e.salary + allowances - deductions, status });
    }
  }

  // ---- purchasing & inventory ------------------------------------------------
  const inventoryItems = [
    { id: uid("inv"), companyId: "co-westwood", name: "Split AC filter (24k BTU)", sku: "AC-F-24", category: "HVAC", qty: 18, unitCost: 85, reorderLevel: 10 },
    { id: uid("inv"), companyId: "co-westwood", name: "LED panel 600x600", sku: "EL-LED-66", category: "Electrical", qty: 6, unitCost: 120, reorderLevel: 12 },
    { id: uid("inv"), companyId: "co-westwood", name: "Mixer tap (chrome)", sku: "PL-TAP-CR", category: "Plumbing", qty: 22, unitCost: 95, reorderLevel: 8 },
  ];
  const purchaseOrders = [
    { id: uid("po"), companyId: "co-westwood", supplierId: "c-cooltech", date: daysFrom(-10), total: 4250, status: "received", ref: "PO-3320" },
    { id: uid("po"), companyId: "co-westwood", supplierId: "c-securefix", date: daysFrom(-3), total: 1900, status: "ordered", ref: "PO-3321" },
  ];

  // ---- DMS / documents -------------------------------------------------------
  const documents = [
    { id: uid("doc"), companyId: "co-westwood", name: "Tenancy Contract — Maya Alvarez.pdf", type: "pdf", category: "Contracts", linkedType: "contract", addedAt: monthsFrom(-8, 2), sizeKb: 420 },
    { id: uid("doc"), companyId: "co-westwood", name: "Trade License 2026.pdf", type: "pdf", category: "Company", addedAt: monthsFrom(-5, 1), sizeKb: 880 },
    { id: uid("doc"), companyId: "co-westwood", name: "Marina Heights — Title Deed.pdf", type: "pdf", category: "Towers", linkedType: "tower", addedAt: monthsFrom(-40, 1), sizeKb: 1240 },
    { id: uid("doc"), companyId: "co-westwood", name: "DEWA Bill — Canal Court.jpg", type: "image", category: "Utilities", linkedType: "bill", addedAt: daysFrom(-12), sizeKb: 310 },
  ];

  return {
    schema: 2,
    activeCompanyId: "co-westwood",
    currentUserId: "u-sarah",
    settings: { renewalLeadDays: 60, chequeAlertDays: 7, emailAlerts: true, smsAlerts: true },
    companies,
    users,
    towers,
    units,
    contacts,
    contracts,
    cheques,
    receipts,
    vouchers,
    bills,
    maintenance,
    leads,
    bookings,
    cases,
    employees,
    payroll,
    inventoryItems,
    purchaseOrders,
    documents,
    notifications: [],
    outbox: [],
  };
}
