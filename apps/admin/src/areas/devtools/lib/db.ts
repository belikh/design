export type ColType = "int" | "text" | "numeric" | "bool";
export type DbCol = { name: string; type: ColType; pk?: boolean; fk?: { table: string; col: string }; nullable?: boolean };
export type DbTable = { name: string; cols: DbCol[]; rows: Record<string, string | number | boolean | null>[]; x: number; y: number };
const names = ["Ava Lin", "Ben Okoro", "Cleo Marsh", "Dev Patel", "Eli Novak", "Fay Brandt", "Gus Rey", "Hana Sato"];
const prods = [["Hub", 129], ["Sensor", 39], ["Gateway", 249], ["Camera", 89], ["Siren", 59]] as const;
export function seedDb(): DbTable[] {
  const customers = names.map((n, i) => ({ id: i + 1, name: n, email: i === 5 ? null : `${n.split(" ")[0].toLowerCase()}@example.test`, active: i !== 3 }));
  const products = prods.map(([name, price], i) => ({ id: i + 1, name, price }));
  const orders = Array.from({ length: 14 }, (_, i) => ({ id: 100 + i, customer_id: (i * 3) % 8 + 1, placed: `2026-10-${String(i + 1).padStart(2, "0")}`, status: ["paid", "paid", "pending", "refunded"][i % 4] }));
  const items = orders.flatMap((o, i) => [{ id: o.id * 10 + 1, order_id: o.id, product_id: (i % 5) + 1, qty: 1 + (i % 3) }, ...(i % 2 ? [{ id: o.id * 10 + 2, order_id: o.id, product_id: ((i + 2) % 5) + 1, qty: 1 }] : [])]);
  return [
    { name: "customers", x: 20, y: 20, rows: customers, cols: [{ name: "id", type: "int", pk: true }, { name: "name", type: "text" }, { name: "email", type: "text", nullable: true }, { name: "active", type: "bool" }] },
    { name: "orders", x: 250, y: 20, rows: orders, cols: [{ name: "id", type: "int", pk: true }, { name: "customer_id", type: "int", fk: { table: "customers", col: "id" } }, { name: "placed", type: "text" }, { name: "status", type: "text" }] },
    { name: "order_items", x: 480, y: 20, rows: items, cols: [{ name: "id", type: "int", pk: true }, { name: "order_id", type: "int", fk: { table: "orders", col: "id" } }, { name: "product_id", type: "int", fk: { table: "products", col: "id" } }, { name: "qty", type: "int" }] },
    { name: "products", x: 480, y: 170, rows: products, cols: [{ name: "id", type: "int", pk: true }, { name: "name", type: "text" }, { name: "price", type: "numeric" }] },
  ];
}
/** Validate a new value for a column: type check, nullability, and foreign key existence. */
export function validateValue(db: DbTable[], table: string, col: DbCol, v: unknown): string | null {
  if (v === "" || v === null || v === undefined) return col.nullable ? null : `${col.name} cannot be empty.`;
  if ((col.type === "int" || col.type === "numeric") && !Number.isFinite(Number(v))) return `${col.name} must be a number.`;
  if (col.type === "int" && !Number.isInteger(Number(v))) return `${col.name} must be a whole number.`;
  if (col.fk) { const t = db.find((x) => x.name === col.fk!.table); if (!t?.rows.some((r) => String(r[col.fk!.col]) === String(v))) return `No ${col.fk.table}.${col.fk.col} = ${String(v)}: the foreign key would break.`; }
  if (col.pk && db.find((t) => t.name === table)?.rows.some((r) => String(r[col.name]) === String(v))) return `${col.name} must be unique.`;
  return null;
}
export const referencing = (db: DbTable[], table: string) => db.flatMap((t) => t.cols.filter((c) => c.fk?.table === table).map((c) => ({ table: t.name, col: c.name, refCol: c.fk!.col })));
export const sqlFor = (t: DbTable) => `CREATE TABLE ${t.name} (\n${t.cols.map((c) => `  ${c.name} ${c.type.toUpperCase()}${c.pk ? " PRIMARY KEY" : c.nullable ? "" : " NOT NULL"}${c.fk ? ` REFERENCES ${c.fk.table}(${c.fk.col})` : ""}`).join(",\n")}\n);`;
