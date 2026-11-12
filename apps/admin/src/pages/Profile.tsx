import { PageHeader, Panel, Badge, Avatar, AvatarStack } from "@belikh/jupiter-ui/kit.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";

const store = createCollection([{ id: "me", name: "Ava Nguyen", role: "Platform engineer · Brisbane", about: "Builds and runs the household fleet: NixOS hosts, a segmented UniFi network, ESP32 sensors and the odd restored SGI workstation. Prefers declarative configuration and thin line drawings." }]);
import { CalendarHeat, Ring, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Rule } from "@belikh/jupiter-ui/Icon.tsx";
import { calendarValues, people } from "../data/fixtures.ts";

export function Profile() {
  const { rows: [me], save } = useCollection(store);
  return (
    <>
      <PageHeader title="Profile" crumbs={["Records", "Profile"]} />
      <div className="adm-grid adm-grid--12">
        <Panel><div className="adm-stack" style={{ alignItems: "center", textAlign: "center" }}><Avatar name="Ava Nguyen" size={96} s="ok" /><div><h2><Editable value={me?.name ?? ""} editor={{ type: "text" }} label="Name" onSave={(v) => save(me, "name", v)} /></h2><div className="jp-muted"><Editable value={me?.role ?? ""} editor={{ type: "text" }} label="Role" onSave={(v) => save(me, "role", v)} /></div></div><div className="adm-row"><Badge s="ok">online</Badge><Badge>admin</Badge><Badge s="info">UTC+10</Badge></div><Rule name="swash" /><dl className="adm-dl" style={{ width: "100%", textAlign: "left" }}><dt>Email</dt><dd>ava@example.com</dd><dt>Team</dt><dd><AvatarStack names={people.slice(0, 6)} /></dd><dt>Joined</dt><dd>Mar 2019</dd></dl></div></Panel>
        <div className="adm-stack">
          <Panel title="About"><Editable value={me?.about ?? ""} editor={{ type: "textarea", rows: 4, maxLength: 400 }} label="About" onSave={(v) => save(me, "about", v)} /><div className="adm-row" style={{ marginTop: 12 }}>{["NixOS", "Rust", "Go", "UniFi", "ESPHome", "FPGA", "Home Assistant"].map((s) => <Badge key={s} pill>{s}</Badge>)}</div></Panel>
          <Panel title="Contributions (26 weeks)"><CalendarHeat values={calendarValues} /></Panel>
          <div className="adm-grid adm-grid--3"><Panel title="Profile complete"><div className="adm-row" style={{ justifyContent: "center" }}><Ring value={84} size={96} /></div></Panel><Panel title="Reviews closed"><div className="adm-row" style={{ justifyContent: "center" }}><Ring value={62} size={96} /></div></Panel><Panel title="On-call load"><ProgressBar value={35} label="On-call load" /><p className="jp-muted" style={{ marginTop: 8 }}>3 of 8 shifts this month</p></Panel></div>
        </div>
      </div>
    </>
  );
}
