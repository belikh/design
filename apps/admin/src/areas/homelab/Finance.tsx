import { useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStore, Sheet, opts, money } from "./lib.tsx";
import { BILLS, SUBS, BUDGETS, billState, budgetState, monthly, monthlyTotal, applyPayment, dueIn14, renewingSoon, type Bill, type Sub, type Budget } from "./finance.data.ts";

const CATS = ["Utilities", "Home", "Insurance", "Tech", "Entertainment"];
export function Finance() {
  const [tab, setTab] = useState("bills"); const { toast } = usePrefs();
  const bills = useStore("fin-b", BILLS), subs = useStore("fin-s", SUBS), bud = useStore("fin-g", BUDGETS);
  const setPaid = (b: Bill, paid: boolean) => { bills.patch(b.id, { status: paid ? "Paid" : "Unpaid" }); const next = applyPayment(bud.rows, b, paid ? 1 : -1); next.forEach((g, i) => { if (g.spent !== bud.rows[i].spent) bud.patch(g.id, { spent: g.spent }); }); toast({ kind: "ok", title: paid ? `Paid ${b.payee}` : `Reopened ${b.payee}`, body: money(b.amount), undo: () => setPaid(b, !paid) }); };
  const billCols: Col<Bill>[] = [
    { key: "payee", header: "Payee", width: 180, editor: { type: "text" }, validate: (v) => (String(v).trim() ? null : "A payee is required") }, { key: "category", header: "Category", width: 130, editor: { type: "select", options: opts(...CATS) } },
    { key: "amount", header: "Amount", width: 110, align: "right", editor: { type: "number", currency: "AUD", min: 0 }, fmt: (v) => money(Number(v)), validate: (v) => (Number(v) >= 0 ? null : "Can't be negative") }, { key: "due", header: "Due", width: 130, editor: { type: "date" } },
    { key: "state", header: "State", width: 120, render: (r) => { const s = billState(r); return <Badge s={s === "paid" ? "ok" : s === "overdue" ? "danger" : s === "due soon" ? "warn" : "info"}>{s}</Badge>; }, value: (r) => billState(r) },
    { key: "autopay", header: "Autopay", width: 90, editor: { type: "boolean" }, value: (r) => (r.autopay ? "Yes" : "No") },
    { key: "act", header: "", width: 110, render: (r) => <Btn sm variant={r.status === "Paid" ? "ghost" : "primary"} aria-label={`${r.status === "Paid" ? "Reopen" : "Mark paid"} ${r.payee}`} onClick={() => setPaid(r, r.status !== "Paid")}>{r.status === "Paid" ? "Reopen" : "Mark paid"}</Btn> },
  ];
  const subCols: Col<Sub>[] = [
    { key: "name", header: "Subscription", width: 190, editor: { type: "text" } }, { key: "category", header: "Category", width: 130, editor: { type: "select", options: opts(...CATS) } }, { key: "cost", header: "Cost", width: 100, align: "right", editor: { type: "number", currency: "AUD", min: 0 }, fmt: (v) => money(Number(v)) },
    { key: "cycle", header: "Cycle", width: 100, editor: { type: "select", options: opts("Monthly", "Yearly") } }, { key: "mo", header: "Per month", width: 110, align: "right", value: (r) => monthly(r), fmt: (v) => money(Number(v)) }, { key: "renews", header: "Renews", width: 130, editor: { type: "date" } }, { key: "active", header: "Active", width: 90, editor: { type: "boolean" }, value: (r) => (r.active ? "Yes" : "Cancelled") },
  ];
  const budCols: Col<Budget>[] = [
    { key: "category", header: "Category", width: 150 }, { key: "limit", header: "Monthly limit", width: 130, align: "right", editor: { type: "number", currency: "AUD", min: 0 }, fmt: (v) => money(Number(v)) }, { key: "spent", header: "Spent", width: 110, align: "right", editor: { type: "number", currency: "AUD", min: 0 }, fmt: (v) => money(Number(v)) },
    { key: "left", header: "Left", width: 110, align: "right", value: (r) => Math.round((r.limit - r.spent) * 100) / 100, fmt: (v) => money(Number(v)) }, { key: "st", header: "Status", width: 110, render: (r) => { const s = budgetState(r); return <Badge s={s === "ok" ? "ok" : s === "warn" ? "warn" : "danger"}>{s}</Badge>; }, value: (r) => budgetState(r) },
  ];
  const overdue = bills.rows.filter((b) => billState(b) === "overdue"), soon = renewingSoon(subs.rows), over = bud.rows.filter((g) => budgetState(g) === "over");
  return (
    <>
      <PageHeader title="Household finance" crumbs={["Household", "Finance"]} desc="Bills, subscriptions and monthly budgets. Marking a bill paid updates its category budget."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "bills", label: "Bills", count: bills.rows.filter((b) => b.status === "Unpaid").length }, { id: "subs", label: "Subscriptions" }, { id: "budgets", label: "Budgets" }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Due in 14 days" value={money(dueIn14(bills.rows))} /><StatTile label="Overdue" value={String(overdue.length)} invert /><StatTile label="Subscriptions / month" value={money(monthlyTotal(subs.rows))} /><StatTile label="Budgets over" value={String(over.length)} invert /></div>
      <div className="adm-section adm-stack">
        {overdue.length > 0 && <Alert s="danger" title={`${overdue.length} overdue`}>{overdue.map((b) => b.payee).join(", ")}</Alert>}
        {soon.length > 0 && <Alert s="info" title="Renewing within a week">{soon.map((s) => `${s.name} (${s.renews})`).join(", ")}</Alert>}
        {tab === "bills" && <Sheet t={bills} title="Bills" cols={billCols} name="bills" blank={{ payee: "New bill", category: "Utilities", amount: 0, due: "2026-12-01", status: "Unpaid", autopay: false }} />}
        {tab === "subs" && <Sheet t={subs} title="Subscriptions" cols={subCols} name="subscriptions" blank={{ name: "New subscription", category: "Tech", cost: 0, cycle: "Monthly", renews: "2026-12-01", active: true }} />}
        {tab === "budgets" && <><Panel title="This month">{bud.rows.map((g) => <ProgressBar key={g.id} value={Math.min(g.spent, g.limit)} max={g.limit} s={budgetState(g) === "over" ? "danger" : budgetState(g) === "warn" ? "warn" : "ok"} label={`${g.category}: ${money(g.spent)} of ${money(g.limit)}`} />)}</Panel><Sheet t={bud} title="Budgets" cols={budCols} name="budgets" /></>}
      </div>
    </>
  );
}
