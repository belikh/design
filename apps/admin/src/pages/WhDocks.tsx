import { useState } from "react";
import { Link } from "react-router-dom";
import "../warehouse/wh.css";
import { PageHeader, Panel, Btn, Alert, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field, NumberStepper } from "@belikh/jupiter-ui/inputs.tsx";
import { actions, useWhSim } from "../warehouse/store.ts";
import { DIR_LABEL, EQUIPMENT, EQUIP_LABEL, LOAD_CLASSES, LOAD_LABEL, TRUCK_CLASSES, occupant, type Direction, type Dock } from "../warehouse/engine.ts";
import { DirTag, LoadTag, StageChip } from "../warehouse/ui.tsx";

/** Toggle one value in a list. A dock must keep at least one value for each list: an empty list would fit nothing. */
const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? (list.length > 1 ? list.filter((x) => x !== v) : list) : [...list, v]);

/** Per-dock setup. This is how a dock is made to serve any purpose: direction, contents, truck classes, size limits, equipment. */
export function WhDocks() {
  const s = useWhSim(); const [id, setId] = useState(s.docks[0]?.id ?? 1); const d = s.docks.find((x) => x.id === id) ?? s.docks[0];
  const occ = d ? occupant(s, d.id) : undefined;
  return (
    <>
      <PageHeader title="Dock setup" crumbs={["Warehouse", "Dock setup"]} desc="Decide what each dock is for. Trucks are only ever called to a dock that fits them, so these settings are the rules."
        actions={<Btn icon="plus" onClick={() => setId(actions.addDock())}>Add dock</Btn>} />
      <div className="wh-setup adm-section">
        <nav className="wh-setup__list" aria-label="Docks">
          {s.docks.map((x) => { const t = occupant(s, x.id); return (
            <button key={x.id} className="wh-setup__item" aria-current={d?.id === x.id} onClick={() => setId(x.id)}>
              <b>{x.name}</b>
              <span className="adm-row" style={{ gap: 6 }}>{x.dirs.map((dir) => <DirTag key={dir} d={dir} />)}{x.caps.map((c) => <LoadTag key={c} l={c} />)}</span>
              <span>{x.classes.length} truck classes · up to {x.maxHeight} m · {x.maxCube} m³</span>
              <StageChip st={x.status === "blocked" ? "blocked" : t ? t.status : "free"} />
            </button>); })}
        </nav>
        {d && (
          <Panel title={d.name} actions={<><Link to={`/wh/portal/${d.id}`}>Status display</Link>{d.status === "open" ? <Btn sm disabled={!!occ} onClick={() => actions.block(d.id, true)}>Block dock</Btn> : <Btn sm onClick={() => actions.block(d.id, false)}>Reopen dock</Btn>}</>}>
            {occ && <Alert s="warn" title={`${occ.id} (${occ.rego}) is on this dock`}>Setup is locked while a truck is here. Changes apply to the next truck, so wait until it has left.</Alert>}
            <fieldset disabled={!!occ} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>
              <div className="wh-setup__grid">
                <div className="wh-setup__group"><h3>Name</h3><Field label="Dock name">{(fid) => <input id={fid} className="jp-input" value={d.name} onChange={(e) => actions.configDock(d.id, { name: e.target.value })} />}</Field></div>
                <Group title="Direction" hint="Which way trucks move at this dock.">{(["in", "out"] as Direction[]).map((x) => <Chip key={x} on={d.dirs.includes(x)} onClick={() => actions.configDock(d.id, { dirs: toggle(d.dirs, x) })}>{DIR_LABEL[x]}</Chip>)}</Group>
                <Group title="Contents" hint="Loads this dock can handle. Frozen and chilled need refrigerated space.">{LOAD_CLASSES.map((x) => <Chip key={x} on={d.caps.includes(x)} onClick={() => actions.configDock(d.id, { caps: toggle(d.caps, x) })}>{LOAD_LABEL[x]}</Chip>)}</Group>
                <Group title="Truck classes" hint="A class that is not ticked can never be called here.">{TRUCK_CLASSES.map((x) => <Chip key={x.id} on={d.classes.includes(x.id)} onClick={() => actions.configDock(d.id, { classes: toggle(d.classes, x.id) })}>{x.label}</Chip>)}</Group>
                <div className="wh-setup__group"><h3>Size limits</h3><p>Trailer height is measured on the trailer. Volume is the trailer's cargo space.</p>
                  <div className="wh-setup__nums">
                    <Field label="Maximum trailer height">{() => <NumberStepper value={d.maxHeight} onChange={(v) => actions.configDock(d.id, { maxHeight: v })} min={1.5} max={5.5} step={0.1} unit="m" />}</Field>
                    <Field label="Maximum volume">{() => <NumberStepper value={d.maxCube} onChange={(v) => actions.configDock(d.id, { maxCube: v })} min={5} max={300} step={5} unit="m³" />}</Field>
                  </div></div>
                <Group title="Equipment" hint="Tail-lift trucks need a ground-level bay.">{EQUIPMENT.map((x) => <Chip key={x} on={d.equipment.includes(x)} onClick={() => actions.configDock(d.id, { equipment: d.equipment.includes(x) ? d.equipment.filter((e) => e !== x) : [...d.equipment, x] })}>{EQUIP_LABEL[x]}</Chip>)}</Group>
              </div>
            </fieldset>
            <Summary d={d} />
          </Panel>
        )}
      </div>
    </>
  );
}

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => <button type="button" className="wh-chip" aria-pressed={on} onClick={onClick}>{children}</button>;
const Group = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => <div className="wh-setup__group"><h3>{title}</h3><p>{hint}</p><div className="wh-chips" role="group" aria-label={title}>{children}</div></div>;
function Summary({ d }: { d: Dock }) {
  return <p className="jp-muted" style={{ marginTop: 20 }}><Badge>In use</Badge> {d.dirs.map((x) => DIR_LABEL[x].toLowerCase()).join(" and ")} · {d.caps.map((c) => LOAD_LABEL[c].toLowerCase()).join(", ")} · {d.classes.length} truck classes · trailers to {d.maxHeight} m and {d.maxCube} m³.</p>;
}
