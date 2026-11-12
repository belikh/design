import { useState } from "react";
import { PageHeader, Panel, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, PasswordInput, TextArea, NumberStepper, Slider, RangeSlider, Switch, Checkbox, Radio, RadioCards, Segmented, Select, Combobox, DateRange, FileDrop, OtpInput, Rating, KeyValueEditor } from "@belikh/jupiter-ui/inputs.tsx";

const states = ["default", "success", "warn", "error", "disabled", "readonly", "loading"] as const;
export function InputsGallery() {
  const [t, setT] = useState("Ava"); const [pw, setPw] = useState(""); const [ta, setTa] = useState("A multi-line field that grows as you type."); const [n, setN] = useState(4); const [sl, setSl] = useState(40); const [rg, setRg] = useState<[number, number]>([20, 70]);
  const [sw, setSw] = useState(true); const [cb, setCb] = useState([true, false]); const [rd, setRd] = useState("b"); const [rc, setRc] = useState<"a" | "b">("a"); const [sg, setSg] = useState("week"); const [sel, setSel] = useState("Brisbane"); const [cm, setCm] = useState<string[]>(["Rust"]); const [cm2, setCm2] = useState<string[]>(["nixos"]);
  const [dr, setDr] = useState<[string, string]>(["2026-11-01", "2026-11-12"]); const [otp, setOtp] = useState(""); const [rate, setRate] = useState(4); const [kv, setKv] = useState([{ k: "REGION", v: "ap-southeast-2" }]);
  const [pend, setPend] = useState(false);
  return (
    <>
      <PageHeader title="Input gallery" crumbs={["Library", "Inputs"]} desc="Every input type the template uses, each with its states." />
      <Panel title="Field states (every input shows these)"><div className="adm-grid adm-grid--4">{states.map((s) => (
        <Field key={s} label={s} hint={s === "default" ? "Help text sits here" : undefined} error={s === "error" ? "This value is not valid" : undefined} warn={s === "warn" ? "Looks unusual, double-check" : undefined}>{(id) => <TextInput id={id} value={s === "loading" ? "Checking…" : "Value"} onChange={() => {}} disabled={s === "disabled"} readOnly={s === "readonly"} state={s === "success" ? "success" : s === "warn" ? "warn" : s === "error" ? "error" : undefined} suffix={s === "loading" ? <span className="adm-spin" style={{ width: 12, height: 12 }} /> : undefined} />}</Field>))}</div></Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Text"><div className="adm-stack">
          <Field label="Text with prefix and suffix" hint="Prefix / suffix addons">{(id) => <TextInput id={id} value={t} onChange={setT} prefix="@" suffix=".au" />}</Field>
          <Field label="Password with strength meter">{(id) => <PasswordInput id={id} value={pw} onChange={setPw} />}</Field>
          <Field label="Textarea (auto-grow, counter)" counter={[ta.length, 160]}>{(id) => <TextArea id={id} value={ta} onChange={setTa} max={160} />}</Field>
          <Field label="Search">{(id) => <TextInput id={id} type="search" value="" onChange={() => {}} placeholder="Search…" />}</Field>
        </div></Panel>
        <Panel title="Numeric"><div className="adm-stack">
          <Field label="Number stepper">{() => <NumberStepper value={n} onChange={setN} min={0} max={20} unit="seats" />}</Field>
          <Field label="Slider with marks">{() => <Slider label="Volume" value={sl} onChange={setSl} marks={[0, 25, 50, 75, 100]} fmt={(v) => `${v}%`} />}</Field>
          <Field label="Range slider (dual)">{() => <RangeSlider label="Price" value={rg} onChange={setRg} fmt={(v) => `$${v}`} />}</Field>
          <Field label="Rating">{() => <Rating value={rate} onChange={setRate} />}</Field>
          <Field label="One-time code (paste works)">{() => <OtpInput value={otp} onChange={setOtp} />}</Field>
        </div></Panel>
        <Panel title="Choice"><div className="adm-stack">
          <Switch checked={sw} onChange={setSw} label="Switch" /><Switch checked={pend} onChange={() => { setPend(true); setTimeout(() => setPend(false), 1200); }} label="Switch with pending state" pending={pend} />
          <div className="adm-row"><Checkbox checked={cb[0]} onChange={(v) => setCb([v, cb[1]])} label="Checkbox" /><Checkbox checked={cb[1]} onChange={(v) => setCb([cb[0], v])} label="Another" /><Checkbox checked={cb[0] && cb[1]} indeterminate={cb[0] !== cb[1]} onChange={(v) => setCb([v, v])} label="All (tri-state)" /></div>
          <div className="adm-row">{["a", "b", "c"].map((v) => <Radio key={v} name="r" value={v} current={rd} onChange={setRd} label={`Radio ${v}`} />)}</div>
          <Segmented label="Range" value={sg} onChange={setSg} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
          <RadioCards name="rc" value={rc} onChange={setRc} options={[{ value: "a", title: "Basic", desc: "Good for most", icon: "leaf" }, { value: "b", title: "Advanced", desc: "More control", icon: "sliders", badge: "new" }]} />
        </div></Panel>
        <Panel title="Select, combobox, tags"><div className="adm-stack">
          <Field label="Native select (grouped)">{(id) => <Select id={id} value={sel} onChange={setSel} options={[{ value: "Brisbane", label: "Brisbane", group: "QLD" }, { value: "Cairns", label: "Cairns", group: "QLD" }, { value: "Sydney", label: "Sydney", group: "NSW" }]} />}</Field>
          <Field label="Combobox (async search)" hint="Type to filter; results load after a short delay">{(id) => <Combobox id={id} async options={["Rust", "Go", "Python", "Nix", "C++", "TypeScript", "Verilog", "Zig"]} value={cm} onChange={setCm} />}</Field>
          <Field label="Tags (multi, creatable)">{(id) => <Combobox id={id} multi creatable options={["nixos", "rust", "go", "unifi", "esphome"]} value={cm2} onChange={setCm2} placeholder="Add tag…" />}</Field>
        </div></Panel>
        <Panel title="Date range with presets"><DateRange value={dr} onChange={setDr} /></Panel>
        <Panel title="File upload (drag & drop, progress, validation)"><FileDrop /></Panel>
        <Panel title="Key–value editor (add, reorder, remove)"><KeyValueEditor rows={kv} onChange={setKv} /></Panel>
      </div>
      <div style={{ marginTop: 16 }}><Alert s="info" title="Accessible by default">Each control has a visible label, keyboard support and focus ring; errors use <code>role="alert"</code> and <code>aria-invalid</code>.</Alert></div>
    </>
  );
}
