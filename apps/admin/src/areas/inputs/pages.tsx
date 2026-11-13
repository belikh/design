import { useMemo, useState, type ReactNode } from "react";
import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { AddressField, GeoPointRadius } from "./geo.tsx";
import { CodeEditor, MarkdownEditor, RichTextEditor, SAMPLES } from "./editors.tsx";
import { FiscalPicker, MultiDateCalendar, NaturalDateField, TzPreview, WorkingHours } from "./dates.tsx";
import { CameraCapture, ChunkedUpload, FolderUpload, ImageTools, ScanField, UrlImport } from "./files.tsx";
import { DnsRecords, FirewallRules, NetworkFields, PortForwards, PortRangeField, SshKeyField, SubnetCalculator } from "./network.tsx";
import { AllocationSliders, DimensionsField, DurationField, Knob, MinMaxPair, MoneyField, MoneyRange, RatioField, ScrubNumber, UnitField } from "./numeric.tsx";
import { Cascader, COUNTRIES, GeoPickers, ORG, PeoplePicker, RadioOther, RecordPicker, RelationEditor, RevealRadio, RichSelect, RolePicker, SwitchConfirm, TeamPicker, TransferList, TreeChecklist, TreeSelect, makeAssets, type Rec } from "./pickers.tsx";
import { PasskeyEnrol, TotpSetup } from "./security.tsx";
import { CheckMatrix, ColumnMapper, EditableGridField, FilterPills, OptionListEditor, PermissionsMatrix, QuestionMatrix, RuleBuilder, SchemaForm, SortList, ThresholdChart, TokenSearch, TranslationsEditor } from "./structured.tsx";
import { ChipPaste, ClickToEdit, GhostAutocomplete, MaskedField, MentionField, PasswordGenerator, SecretField, SlugField, UsernameField } from "./text-fields.tsx";
import { DraftPublish, FieldHistory, FieldPermissions, SaveResume } from "./behaviour.tsx";
import "./in2.css";

const S = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => <Panel title={<span>{title} <span className="in2-note">· {id}</span></span>}>{children}</Panel>;
const Page = ({ title, desc, children }: { title: string; desc: string; children: ReactNode }) => <><PageHeader title={title} desc={desc} crumbs={["Forms"]} /><div className="in2-page">{children}</div></>;

export function SecurityPage() {
  const [pw, setPw] = useState("");
  return <Page title="Secrets and security" desc="API keys, generated passwords, authenticator setup with a real QR code, recovery codes and passkeys.">
    <S id="C006" title="Secret and API key field"><SecretField /></S>
    <S id="C008" title="Password generator"><PasswordGenerator onUse={setPw} />{pw && <p className="in2-note" role="status">Chosen: {"•".repeat(pw.length)} ({pw.length} characters)</p>}</S>
    <S id="C008" title="Authenticator app (TOTP) and recovery codes"><TotpSetup /></S>
    <S id="C008" title="Passkey enrolment"><PasskeyEnrol /></S>
  </Page>;
}
export function TextPage() {
  const [saved, setSaved] = useState("Quarterly planning");
  return <Page title="Text entry" desc="Input masks, async validation, click-to-edit, recents with ghost completion, pasted lists and mentions.">
    <S id="C007" title="Card, IBAN, BSB, ABN, phone and plate masks"><div className="in2-grid"><MaskedField kind="card" /><MaskedField kind="iban" /><MaskedField kind="bsb" /><MaskedField kind="abn" /><MaskedField kind="phone" /><MaskedField kind="plate" /></div></S>
    <S id="C009" title="Async availability check and slug"><div className="in2-grid"><UsernameField /><SlugField /></div></S>
    <S id="C010" title="Click-to-edit with optimistic save"><div className="in2-stack"><ClickToEdit label="Project name" value={saved} onSave={(v) => setSaved(v)} required /><ClickToEdit label="Description" value="Type “fail” anywhere to see the rollback." multiline max={160} /></div></S>
    <S id="C028" title="Autocomplete with recents and ghost text"><GhostAutocomplete options={["Billing", "Billing exports", "Auth service", "Audit log", "Edge cache", "Email relay", "Inventory sync"]} /></S>
    <S id="C029" title="Multi-value paste into validated chips"><ChipPaste /></S>
    <S id="C004" title="@mentions and slash commands"><MentionField initial="Hi @" /></S>
  </Page>;
}
export function EditorsPage() {
  return <Page title="Editors" desc="Markdown, rich text, and code with linting, formatting and a diff before saving.">
    <S id="C003" title="Markdown editor with live preview"><MarkdownEditor /></S>
    <S id="C011" title="Rich text with tables, variables, snippets and attachments"><RichTextEditor /></S>
    <S id="C012" title="Code editor: highlight, lint, format, diff before save"><CodeEditor lang="json" initial={SAMPLES.json} /></S>
  </Page>;
}
export function NumbersPage() {
  const [n, setN] = useState(42); const [k, setK] = useState(65);
  return <Page title="Numbers and money" desc="Scrubbing, knobs, ranges, allocations that always total 100, money with currency, units and durations.">
    <S id="C016" title="Scrub number and knob"><div className="in2-row" style={{ gap: 32 }}><ScrubNumber label="Opacity" value={n} onChange={setN} min={0} max={100} unit="%" /><Knob label="Gain" value={k} onChange={setK} unit=" dB" /></div></S>
    <S id="C017" title="Min/max, aspect ratio and dimensions"><div className="in2-grid"><MinMaxPair /><RatioField /><DimensionsField /></div></S>
    <S id="C018" title="Allocation sliders that sum to 100"><AllocationSliders /></S>
    <S id="C019" title="Money with currency, and money ranges"><div className="in2-grid"><MoneyField /><MoneyRange /></div></S>
    <S id="C020" title="Unit switching"><div className="in2-grid"><UnitField kind="length" /><UnitField kind="mass" /><UnitField kind="temperature" /><UnitField kind="data" /></div></S>
    <S id="C036" title="Duration"><DurationField /></S>
  </Page>;
}
export function DatesPage() {
  return <Page title="Dates and time zones" desc="Natural-language dates, financial years, multi-date selection with blackout days, zone conversion and working-hour overlap.">
    <S id="C038" title="Natural-language date"><NaturalDateField /></S>
    <S id="C038" title="Fiscal year and quarter"><FiscalPicker /></S>
    <S id="C038" title="Multi-date picker with blackout dates"><MultiDateCalendar /></S>
    <S id="C039" title="Time-zone conversion preview"><TzPreview /></S>
    <S id="C039" title="Working hours and overlap"><WorkingHours /></S>
  </Page>;
}
export function PickersPage() {
  const items = useMemo(() => ["Auth", "Billing", "Catalog", "Delivery", "Email", "Search", "Telemetry", "Webhooks"].map((l) => ({ id: l.toLowerCase(), label: l })), []); const assets = useMemo(() => makeAssets(5000), []); const [rec, setRec] = useState<Rec | null>(null);
  return <Page title="Pickers" desc="Transfer lists, trees, geography, rich option lists, people and records.">
    <S id="C024" title="Transfer list"><TransferList items={items} initialRight={["auth", "billing"]} /></S>
    <S id="C025" title="Tree select, cascader and hierarchical checklist"><div className="in2-grid"><TreeSelect nodes={ORG} /><Cascader nodes={ORG} /><TreeChecklist nodes={ORG} /></div></S>
    <S id="C026" title="Country, region, time zone and language"><GeoPickers /></S>
    <S id="C032" title="Rich options, virtualised, with select all"><RichSelect options={assets} label="Assets (5,000)" /></S>
    <S id="C033" title="People, roles and teams"><div className="in2-stack"><PeoplePicker withRoles /><div className="in2-grid"><TeamPicker /><RolePicker /></div></div></S>
    <S id="C034" title="Record reference and relation editor"><div className="in2-stack"><RecordPicker value={rec} onChange={setRec} /><RelationEditor /></div></S>
    <p className="in2-note">{COUNTRIES.length} countries available.</p>
  </Page>;
}
export function ChoicesPage() {
  return <Page title="Choices and ordering" desc="Switches that wait for the server, radios with a reveal, drag-sort ranking and matrices.">
    <S id="C030" title="Switch with confirm and pending state"><div className="in2-stack"><SwitchConfirm label="Maintenance mode" risky description="Visitors see a holding page until this is turned off." /><SwitchConfirm label="Email notifications" risky={false} /></div></S>
    <S id="C031" title="Radio with “other” and conditional reveal"><div className="in2-grid"><RadioOther /><RevealRadio /></div></S>
    <S id="C056" title="Drag to sort and ranking"><SortList /></S>
    <S id="C056" title="Matrix of questions"><QuestionMatrix /></S>
    <S id="C061" title="Checkbox matrix"><CheckMatrix /></S>
  </Page>;
}
export function FilesPage() {
  return <Page title="Files and media" desc="Folder and URL import, camera and barcode capture, resumable chunked uploads and image tools.">
    <S id="C046" title="Folder upload"><FolderUpload /></S>
    <S id="C046" title="Import from a URL"><UrlImport /></S>
    <S id="C046" title="Camera capture"><CameraCapture /></S>
    <S id="C046" title="Barcode and QR scan"><ScanField /></S>
    <S id="C046" title="Chunked, resumable upload"><ChunkedUpload /></S>
    <S id="C047" title="Focal point, alt text, redaction and light/dark preview"><ImageTools /></S>
  </Page>;
}
export function DataPage() {
  return <Page title="Structured data" desc="Schema-driven forms, filters, search syntax, rule builders, grids, translations and imports.">
    <S id="C051" title="JSON-schema form"><SchemaForm /></S>
    <S id="C059" title="Filter pills with operators"><FilterPills /></S>
    <S id="C060" title="Tokenised search, scopes and saved queries"><TokenSearch /></S>
    <S id="C061" title="Editable grid as a form field"><EditableGridField /></S>
    <S id="C062" title="Rule builder"><RuleBuilder /></S>
    <S id="C062" title="Threshold editor on a chart"><ThresholdChart /></S>
    <S id="C063" title="Column mapping for imports"><ColumnMapper /></S>
    <S id="C063" title="Option-list editor"><OptionListEditor /></S>
    <S id="C058" title="Per-locale translations"><TranslationsEditor /></S>
  </Page>;
}
export function AccessPage() {
  return <Page title="Access, drafts and history" desc="Permission matrices, field-level access, save and resume, publishing and per-field history.">
    <S id="C054" title="Permissions matrix"><PermissionsMatrix /></S>
    <S id="C073" title="Field-level permissions"><FieldPermissions /></S>
    <S id="C073" title="Field history"><FieldHistory /></S>
    <S id="C072" title="Save and resume"><SaveResume /></S>
    <S id="C072" title="Draft and publish"><DraftPublish /></S>
  </Page>;
}
export function NetworkPage() {
  return <Page title="Network fields" desc="IPs, CIDR, MACs, ports, subnets, firewall and DNS rows, port forwards and SSH keys.">
    <S id="C053" title="IP, CIDR, MAC, hostname and VLAN"><NetworkFields /></S>
    <S id="C053" title="Port ranges"><PortRangeField /></S>
    <S id="C065" title="Subnet calculator and VLSM planner"><SubnetCalculator /></S>
    <S id="C065" title="Firewall rules"><FirewallRules /></S>
    <S id="C065" title="DNS records"><DnsRecords /></S>
    <S id="C065" title="Port forwards"><PortForwards /></S>
    <S id="C065" title="SSH public key and fingerprint"><SshKeyField /></S>
  </Page>;
}
export function LocationPage() {
  return <Page title="Location" desc="Address autocomplete with a map confirmation step, and a point with a radius.">
    <S id="C052" title="Address autocomplete and map confirmation"><AddressField /></S>
    <S id="C052" title="Geo point and radius"><GeoPointRadius /></S>
  </Page>;
}
