import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColourPicker, FontPicker } from "./colourtools.tsx";
import { Recorder, ThumbnailPicker, WaveformTrim } from "./media.tsx";
import { parseWavHeader, synthTone } from "./audio.ts";
import { shelfClear } from "./shelf.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); shelfClear(); delete (globalThis as { EyeDropper?: unknown }).EyeDropper; });
const readBlob = (b: Blob): Promise<ArrayBuffer> => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.readAsArrayBuffer(b); });

describe("C042 colour pad", () => {
  it("moves saturation and brightness with the keyboard and keeps every readout in sync", async () => {
    render(<ColourPicker initial="#ff0000" />); const pad = screen.getByRole("slider", { name: "Saturation and brightness" });
    expect(pad).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%"); pad.focus();
    await userEvent.keyboard("{ArrowLeft}"); expect(pad).toHaveAttribute("aria-valuetext", "Saturation 99%, brightness 100%");
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}"); expect(pad).toHaveAttribute("aria-valuetext", "Saturation 99%, brightness 90%");
    await userEvent.keyboard("{Home}"); expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#e6e6e6"); expect(screen.getByLabelText("Red")).toHaveValue(230); expect(screen.getByLabelText("HSL saturation")).toHaveValue(0);
    expect(screen.getByLabelText("Hue")).toHaveValue("0");
    await userEvent.keyboard("{End}"); expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#e60000");
  });
  it("syncs hex, rgb, hsl and alpha", async () => {
    const onChange = vi.fn(); render(<ColourPicker initial="#336699" onChange={onChange} />);
    expect(screen.getByLabelText("HSL hue")).toHaveValue(210); expect(screen.getByLabelText("Hue")).toHaveValue("210"); expect(screen.getByLabelText("Green")).toHaveValue(102);
    fireEvent.change(screen.getByLabelText("Alpha"), { target: { value: "50" } }); expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#33669980"); expect(screen.getByLabelText("Current colour #33669980")).toBeInTheDocument(); expect(screen.getByText("rgb(51 102 153 / 0.5)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Blue"), { target: { value: "0" } }); expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#33660080");
    const hex = screen.getByRole("textbox", { name: "Hex" }); await userEvent.clear(hex); await userEvent.type(hex, "rgb(255 0 0)"); expect(screen.getByLabelText("Current colour #ff0000")).toBeInTheDocument(); expect(onChange).toHaveBeenLastCalledWith("#ff0000");
    fireEvent.change(screen.getByLabelText("HSL lightness"), { target: { value: "25" } }); expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#800000");
  });
  it("shows the eyedropper only when the EyeDropper API exists and applies its result", async () => {
    const { unmount } = render(<ColourPicker />); expect(screen.queryByRole("button", { name: "Eyedropper" })).toBeNull(); expect(screen.getByText(/needs the EyeDropper API/)).toBeInTheDocument(); unmount();
    (globalThis as { EyeDropper?: unknown }).EyeDropper = class { open() { return Promise.resolve({ sRGBHex: "#00ff00" }); } };
    render(<ColourPicker />); await userEvent.click(screen.getByRole("button", { name: "Eyedropper" })); await waitFor(() => expect(screen.getByLabelText("Current colour #00ff00")).toBeInTheDocument());
  });
});

describe("C042 font picker", () => {
  it("lists the shipped families first with availability from the FontFace API", async () => {
    const load = vi.fn(async (spec: string) => (spec.includes("JetBrains") ? [{ status: "loaded" }] : spec.includes("SGI Alt") && spec.includes("400 ") ? [{ status: "loaded" }] : [{ status: "error" }]));
    Object.defineProperty(document, "fonts", { configurable: true, value: { load } }); try {
      render(<FontPicker />);
      const jb = await screen.findByRole("radio", { name: /JetBrains Mono.*Available/ }); expect(jb).toBeChecked();
      expect(await screen.findByRole("radio", { name: /SGI Text.*Not found/ })).toBeInTheDocument(); expect(await screen.findByRole("radio", { name: /SGI Alt.*Available/ })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("radio", { name: /SGI Text/ })); expect(await screen.findByText(/SGI Text 400 is not available/)).toBeInTheDocument(); expect(screen.getByText(/font: 400 1.25rem "SGI Text", system-ui, sans-serif;/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("radio", { name: /SGI Alt/ })); fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "800" } }); expect(await screen.findByText(/SGI Alt 800 is not available/)).toBeInTheDocument(); expect(load).toHaveBeenCalledWith('800 16px "SGI Alt"', "Aa");
      fireEvent.change(screen.getByLabelText("Size"), { target: { value: "40" } }); const st = screen.getByLabelText("Preview in SGI Alt").getAttribute("style") ?? ""; expect(st).toContain("font-size: 2.5rem"); expect(st).toContain("font-weight: 800");
    } finally { delete (document as { fonts?: unknown }).fonts; }
  });
  it("reports 'not checked' when the FontFace API is missing", async () => { render(<FontPicker />); expect((await screen.findAllByText("Not checked")).length).toBeGreaterThan(0); });
});

describe("C043 live recorder", () => {
  class FakeRecorder { static isTypeSupported = () => true; state = "inactive"; mimeType = "audio/webm"; ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null; onerror = null; start() { this.state = "recording"; } pause() { this.state = "paused"; } resume() { this.state = "recording"; } stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["abcdef"], { type: "audio/webm" }) }); this.onstop?.(); } }
  const track = { stop: vi.fn() };
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", FakeRecorder); Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track], getAudioTracks: () => [] }), enumerateDevices: vi.fn().mockResolvedValue([{ kind: "audioinput", deviceId: "m1", label: "Fake Mic" }, { kind: "videoinput", deviceId: "c1", label: "Fake Cam" }]), addEventListener: vi.fn(), removeEventListener: vi.fn() } });
    URL.createObjectURL = vi.fn(() => "blob:clip"); URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined }); });
  it("lists devices, records, pauses, resumes, stops, and offers playback and download", async () => {
    render(<Recorder maxSeconds={20} />); expect(screen.getByText("Live device")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("option", { name: "Fake Mic" })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText("Microphone"), "m1");
    await userEvent.click(screen.getByRole("button", { name: "Start recording" })); expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: "m1" } }, video: false });
    expect(await screen.findByText("Recording…")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Pause" })); expect(screen.getByText("Paused")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resume" })); await userEvent.click(screen.getByRole("button", { name: "Stop and save" }));
    const list = await screen.findByRole("list", { name: "Recordings" }); expect(within(list).getByText("Audio clip 1")).toBeInTheDocument(); expect(within(list).queryByText(/simulated/)).toBeNull();
    expect(screen.getByLabelText("Play clip 1")).toHaveAttribute("src", "blob:clip"); const dl = screen.getByRole("link", { name: "Download clip 1" }); expect(dl).toHaveAttribute("download", "audio-clip-1.webm"); expect(track.stop).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete clip 1" })); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:clip");
  });
  it("explains a missing device and offers the simulated fallback explicitly", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(Object.assign(new Error("x"), { name: "NotFoundError" }));
    render(<Recorder />); await userEvent.click(screen.getByRole("button", { name: "Start recording" })); expect(await screen.findByText(/No microphone or camera was found/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use simulated recording" })); expect(screen.getByText("Simulated")).toBeInTheDocument(); expect(screen.queryByText(/No microphone/)).toBeNull();
  });
});

describe("C048 waveform trim (decoded audio)", () => {
  const SR = 8000; const tone = synthTone(SR, 4, 0.5); let captured: Blob | null = null; let closed = 0;
  class FakeAC { currentTime = 0; destination = {}; decodeAudioData = vi.fn(async () => ({ duration: 4, numberOfChannels: 1, sampleRate: SR, getChannelData: () => tone })); createBufferSource() { return { buffer: null, connect() {}, start: vi.fn(), stop() {}, onended: null }; } resume() { return Promise.resolve(); } close() { closed++; return Promise.resolve(); } }
  beforeEach(() => { captured = null; closed = 0; vi.stubGlobal("AudioContext", FakeAC); URL.createObjectURL = vi.fn((b: Blob) => { captured = b; return "blob:wav"; }); URL.revokeObjectURL = vi.fn(); });
  it("decodes an uploaded file, draws peaks, trims with the keyboard and exports a valid WAV", async () => {
    render(<WaveformTrim />); expect(screen.getByText(/Load an audio file/)).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText("Choose audio file"), new File([new Uint8Array(100)], "voice.wav", { type: "audio/wav" }));
    const wave = await screen.findByRole("img", { name: /Waveform of voice.wav, 0:04.00 long/ }); expect(wave.querySelectorAll("rect").length).toBe(320); expect(closed).toBeGreaterThan(0);
    const start = screen.getByRole("slider", { name: "Trim start" }), end = screen.getByRole("slider", { name: "Trim end" }); expect(end).toHaveAttribute("aria-valuenow", "4");
    start.focus(); await userEvent.keyboard("{ArrowRight}{ArrowRight}"); expect(start).toHaveAttribute("aria-valuenow", "0.2"); await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}"); expect(start).toHaveAttribute("aria-valuenow", "1.2");
    end.focus(); await userEvent.keyboard("{ArrowLeft}"); expect(end).toHaveAttribute("aria-valuenow", "3.9"); await userEvent.keyboard("{Home}"); expect(end).toHaveAttribute("aria-valuenow", "1.25");
    await userEvent.keyboard("{End}"); const endField = screen.getByLabelText("End (seconds)"); await userEvent.clear(endField); await userEvent.type(endField, "3.2{Enter}"); expect(end).toHaveAttribute("aria-valuenow", "3.2");
    expect(screen.getByText(/Keeps 0:02.00 of 0:04.00/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Export WAV" })); expect(await screen.findByRole("link", { name: "Download WAV" })).toHaveAttribute("download", "voice-trim.wav"); expect(screen.getByText(/16-bit PCM, 8000 Hz, 1 channel/)).toBeInTheDocument();
    const h = parseWavHeader(await readBlob(captured!))!; expect(h.sampleRate).toBe(SR); expect(h.seconds).toBeCloseTo(2, 2);
  });
  it("trims silence from the decoded envelope and starts playback of the selection", async () => {
    render(<WaveformTrim />); await userEvent.click(screen.getByRole("button", { name: "Load a sample tone" }));
    const start = await screen.findByRole("slider", { name: "Trim start" }); await userEvent.click(screen.getByRole("button", { name: "Trim silence" }));
    expect(Number(start.getAttribute("aria-valuenow"))).toBeGreaterThan(0.3); expect(Number(screen.getByRole("slider", { name: "Trim end" }).getAttribute("aria-valuenow"))).toBeLessThan(3.8);
    await userEvent.click(screen.getByRole("button", { name: "Play selection" })); expect(screen.getByRole("button", { name: "Stop playback" })).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Reset" })); expect(start).toHaveAttribute("aria-valuenow", "0");
  });
  it("shows a clear error for a file that cannot be decoded", async () => {
    vi.stubGlobal("AudioContext", class extends FakeAC { decodeAudioData = vi.fn().mockRejectedValue(new Error("Unable to decode audio data")); });
    render(<WaveformTrim />); await userEvent.upload(screen.getByLabelText("Choose audio file"), new File(["nope"], "notes.txt", { type: "audio/wav" })); expect(await screen.findByText(/"notes.txt" could not be decoded as audio/)).toBeInTheDocument();
  });
});

describe("C048 video thumbnail picker", () => {
  it("starts empty and points at the ways to load a video", () => { render(<ThumbnailPicker />); expect(screen.getByLabelText("Choose video file")).toBeInTheDocument(); expect(screen.getByText(/Load a video file/)).toBeInTheDocument(); expect(screen.queryByRole("radiogroup")).toBeNull(); });
});
