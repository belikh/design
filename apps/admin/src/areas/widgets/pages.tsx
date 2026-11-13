import { PageHeader } from "@belikh/jupiter-ui/kit.tsx";
import { SpreadsheetGrid } from "./grid.tsx";
import { EmojiReactions, LikertScale, NpsInput, RatingInput } from "./ratings.tsx";
import { EmojiPicker, EntityPicker, GpioPicker, IconPicker, SunOffsets } from "./pickers.tsx";
import { AvailabilityGrid, CronBuilder, RecurrenceBuilder, SchedulePicker, SlotPicker } from "./scheduling.tsx";
import { DrawingCanvas, SignaturePad } from "./canvas.tsx";
import { ColourPicker, FontPicker, PaletteEditor } from "./colourtools.tsx";
import { BoxModelEditor, EasingEditor } from "./designtools.tsx";
import { Recorder, ThumbnailPicker, WaveformTrim } from "./media.tsx";
import { FormulaEditor, QueryBuilder, RegexTester } from "./querytools.tsx";
import { HoldToConfirm, HumanCheck, ScrollToAccept, SlideToConfirm } from "./confirmations.tsx";
import { BBoxDraw, PolygonDraw, RackPicker, RoomPicker, RouteWaypoints } from "./spatial.tsx";
import { AssistantPanel, ChatThread } from "./chat.tsx";
import { CommentsDemo, LiveCursors, PresenceBar, RecordLocks } from "./collabui.tsx";
import { Entry } from "./ui.tsx";

const Page = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
  <div className="lab-page"><PageHeader title={title} desc={desc} eyebrow="Specialised inputs" /><div className="lab-cols">{children}</div></div>
);

export const SpreadsheetPage = () => (
  <Page title="Spreadsheet grid" desc="An editable grid with a formula engine, cell ranges, a fill handle and clipboard support.">
    <Entry id="B014" title="Spreadsheet grid" desc="Cell ranges, formulas, fill handle and copy/paste. Try changing a quantity in column B and watch the totals recalculate."><SpreadsheetGrid /></Entry>
  </Page>
);
export const RatingsPage = () => (
  <Page title="Ratings and reactions" desc="Ways to ask how someone feels, from a quick reaction to a full survey scale.">
    <Entry id="C015" title="Rating (stars, hearts)" desc="Radio groups with arrow keys. Click the current value again to clear it."><div className="lab-stack"><RatingInput label="Overall quality" /><RatingInput label="Would you recommend it" icon="heart" max={5} /></div></Entry>
    <Entry id="C015" title="NPS 0 to 10"><NpsInput /></Entry>
    <Entry id="C015" title="Likert scale"><LikertScale /></Entry>
    <Entry id="C015" title="Emoji reaction"><EmojiReactions /></Entry>
  </Page>
);
export const ConfirmPage = () => (
  <Page title="Confirmation gestures" desc="Deliberate-action patterns that slow down risky actions without trapping anyone who cannot use a gesture.">
    <Entry id="C071" title="Scroll-to-accept"><ScrollToAccept /></Entry>
    <Entry id="C071" title="Hold-to-confirm"><HoldToConfirm /></Entry>
    <Entry id="C071" title="Slide-to-confirm"><SlideToConfirm /></Entry>
    <Entry id="C057" title="CAPTCHA / human check placeholder"><HumanCheck /></Entry>
  </Page>
);
export const IconEmojiPage = () => (
  <Page title="Icon and emoji pickers" desc="Searchable pickers with keyboard navigation.">
    <Entry id="C027" title="Icon picker" desc="Icons come from the Jupiter icon set. Arrow keys move through the grid."><IconPicker /></Entry>
    <Entry id="C027" title="Emoji picker" desc="Search by name or keyword, filter by category, pick a skin tone. Recent picks are remembered for the session."><EmojiPicker /></Entry>
  </Page>
);
export const DeviceGpioPage = () => (
  <Page title="Device, pin and sun pickers" desc="Pickers for smart-home and microcontroller work.">
    <Entry id="C066" title="Device and entity picker" desc="Fictional entities. Filter by domain or area; low batteries are flagged."><EntityPicker /></Entry>
    <Entry id="C066" title="GPIO pin picker" desc="Pins that cannot serve the chosen need are disabled with the reason spoken in their label."><GpioPicker /></Entry>
    <Entry id="C066" title="Sunrise and sunset offsets"><SunOffsets /></Entry>
  </Page>
);
export const SchedulePage = () => (
  <Page title="Schedules and recurrence" desc="Build when something runs: cron, calendar rules, availability and bookable slots. All times are UTC.">
    <Entry id="C037" title="Cron expression builder" desc="Pick a preset or type the expression; it is validated field by field and the next five runs are listed."><CronBuilder /></Entry>
    <Entry id="C037" title="Recurrence rule builder" desc="A subset of iCalendar RRULE: daily, weekly, monthly (by day or nth weekday) and yearly."><RecurrenceBuilder /></Entry>
    <Entry id="C037" title="Weekly availability grid"><AvailabilityGrid /></Entry>
    <Entry id="C055" title="Schedule picker"><SchedulePicker /></Entry>
    <Entry id="C055" title="Calendar slot picker"><SlotPicker /></Entry>
  </Page>
);
export const DrawingPage = () => (
  <Page title="Signature and drawing" desc="Ink capture with pointer and keyboard input.">
    <Entry id="C041" title="Signature pad" desc="Draw or type. The pad also works from the keyboard: focus it, move with the arrow keys and press Space to put the pen down."><SignaturePad /></Entry>
    <Entry id="C041" title="Drawing canvas"><DrawingCanvas /></Entry>
  </Page>
);
export const DesignToolsPage = () => (
  <Page title="Colour, type and spacing tools" desc="Design-token style editors with live output.">
    <Entry id="C042" title="Colour picker" desc="Swatches, hex, HSL sliders and gradients."><ColourPicker /></Entry>
    <Entry id="C042" title="Font picker"><FontPicker /></Entry>
    <Entry id="C044" title="Palette editor with contrast check" desc="Edit a palette and see WCAG contrast for the pairs that matter."><PaletteEditor /></Entry>
    <Entry id="C045" title="Box-model spacing editor"><BoxModelEditor /></Entry>
    <Entry id="C045" title="Easing-curve editor"><EasingEditor /></Entry>
  </Page>
);
export const MediaPage = () => (
  <Page title="Audio and video" desc="Record and trim media in the browser. Nothing leaves your device.">
    <Entry id="C043" title="Audio / video recorder" desc="Uses MediaRecorder when the browser and permissions allow it; otherwise a simulated mode."><Recorder /></Entry>
    <Entry id="C048" title="Audio waveform trim"><WaveformTrim /></Entry>
    <Entry id="C048" title="Video thumbnail picker"><ThumbnailPicker /></Entry>
  </Page>
);
export const LogicPage = () => (
  <Page title="Query, regex and formula builders" desc="Logic editors with instant feedback.">
    <Entry id="C050" title="Query / filter builder (AND / OR groups)" desc="Nested groups compile to a live filter over sample rows, a sentence and SQL."><QueryBuilder /></Entry>
    <Entry id="C050" title="Regex tester"><RegexTester /></Entry>
    <Entry id="C050" title="Formula editor" desc="A safe expression parser with variables, functions and error positions."><FormulaEditor /></Entry>
  </Page>
);
export const SpatialPage = () => (
  <Page title="Drawing on plans and racks" desc="Shapes, routes, rooms and rack units. Each drawing surface has a coordinate form for keyboard use.">
    <Entry id="C064" title="Polygon draw"><PolygonDraw /></Entry>
    <Entry id="C064" title="Bounding-box draw"><BBoxDraw /></Entry>
    <Entry id="C064" title="Route waypoints"><RouteWaypoints /></Entry>
    <Entry id="C064" title="Room picker"><RoomPicker /></Entry>
    <Entry id="C064" title="Rack-unit picker"><RackPicker /></Entry>
  </Page>
);
export const ChatPage = () => (
  <Page title="Chat and assistant" desc="A conversation thread and an assistant that streams answers with citations and tool calls. Everything is simulated locally.">
    <Entry id="E030" title="Chat thread and composer"><ChatThread /></Entry>
    <Entry id="E030" title="Assistant panel" desc="Streaming answer, citations and tool-call cards. No model or network is called."><AssistantPanel /></Entry>
  </Page>
);
export const PresencePage = () => (
  <Page title="Presence and collaboration" desc="Who is here, where they are, what they have locked and what they have said. Collaborators are simulated.">
    <Entry id="F012" title="Presence avatars"><PresenceBar /></Entry>
    <Entry id="F012" title="Live cursors"><LiveCursors /></Entry>
    <Entry id="F012" title="Record locks"><RecordLocks /></Entry>
    <Entry id="F012" title="Comments on anything"><CommentsDemo /></Entry>
  </Page>
);
