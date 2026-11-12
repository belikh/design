import type { Display } from "./types.ts";

/** Common ESPHome display sizes. */
export const DISPLAYS: Display[] = [
  { id: "tft-320x240", label: "TFT 320 x 240 (ILI9341 / ST7789)", width: 320, height: 240, palette: "colour" },
  { id: "tft-480x320", label: "TFT 480 x 320 (ILI9488)", width: 480, height: 320, palette: "colour" },
  { id: "tft-800x480", label: "TFT 800 x 480 (RGB / Waveshare)", width: 800, height: 480, palette: "colour" },
  { id: "epd-296x128", label: "E-paper 2.9\" 296 x 128 (3-colour)", width: 296, height: 128, palette: "epaper3" },
  { id: "epd-400x300", label: "E-paper 4.2\" 400 x 300 (4-colour)", width: 400, height: 300, palette: "epaper4" },
  { id: "oled-128x64", label: "OLED 128 x 64 (SSD1306)", width: 128, height: 64, palette: "mono" },
  { id: "oled-128x32", label: "OLED 128 x 32 (SSD1306)", width: 128, height: 32, palette: "mono" },
];
export const display = (id: string): Display => DISPLAYS.find((d) => d.id === id) ?? DISPLAYS[0];
