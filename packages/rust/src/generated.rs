// Code generated from jupiter.tokens.json (jupiter 1.5.5). DO NOT EDIT.

/// Token set version this file was generated from.
pub const VERSION: &str = "1.5.5";

/// Fixed sizes of application chrome and overlays (logical px), from the chrome tokens.
pub mod chrome {
    pub const SIDEBAR: u32 = 232;
    pub const SIDEBAR_RAIL: u32 = 60;
    pub const TOPBAR: u32 = 48;
    pub const MODAL_SM: u32 = 400;
    pub const MODAL_MD: u32 = 560;
    pub const MODAL_LG: u32 = 820;
    pub const DRAWER: u32 = 440;
    pub const TOAST: u32 = 380;
    pub const ROW_TIGHT: u32 = 28;
    pub const ROW_NORMAL: u32 = 40;
    pub const ROW_TALL: u32 = 56;
}

/// Stacking order, from the z tokens.
pub mod z {
    pub const STICKY: i32 = 20;
    pub const NAV: i32 = 25;
    pub const BAR: i32 = 30;
    pub const MENU: i32 = 40;
    pub const BANNER: i32 = 45;
    pub const OVERLAY: i32 = 50;
    pub const DRAWER: i32 = 55;
    pub const TOAST: i32 = 60;
    pub const POPOVER: i32 = 70;
    pub const TOOLTIP: i32 = 75;
    pub const TOP: i32 = 80;
}

/// An sRGB colour. Convert with the adapters, or use the channels directly.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Rgb(pub u8, pub u8, pub u8);

impl Rgb {
    pub const fn r(self) -> u8 { self.0 }
    pub const fn g(self) -> u8 { self.1 }
    pub const fn b(self) -> u8 { self.2 }
    pub const fn to_array(self) -> [u8; 3] { [self.0, self.1, self.2] }
    /// Channels as 0.0..=1.0 floats (for GPU / shader colour types).
    pub fn to_f32(self) -> [f32; 3] { [self.0 as f32 / 255.0, self.1 as f32 / 255.0, self.2 as f32 / 255.0] }
    /// "#rrggbb"
    pub fn to_hex(self) -> String { format!("#{:02x}{:02x}{:02x}", self.0, self.1, self.2) }
}

/// One colour scheme, keyed by role.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Palette {
    pub bg: Rgb,
    pub surface: Rgb,
    pub surface_raised: Rgb,
    pub border: Rgb,
    pub text: Rgb,
    pub text_muted: Rgb,
    pub accent: Rgb,
    pub on_accent: Rgb,
    pub ok: Rgb,
    pub ok_bg: Rgb,
    pub warn: Rgb,
    pub warn_bg: Rgb,
    pub danger: Rgb,
    pub danger_bg: Rgb,
    pub info: Rgb,
    pub info_bg: Rgb,
}

pub const LIGHT: Palette = Palette {
    bg: Rgb(250, 249, 247),
    surface: Rgb(243, 241, 236),
    surface_raised: Rgb(253, 252, 250),
    border: Rgb(217, 213, 204),
    text: Rgb(22, 23, 29),
    text_muted: Rgb(91, 95, 107),
    accent: Rgb(75, 63, 191),
    on_accent: Rgb(253, 252, 250),
    ok: Rgb(27, 110, 52),
    ok_bg: Rgb(227, 241, 230),
    warn: Rgb(138, 90, 0),
    warn_bg: Rgb(247, 236, 212),
    danger: Rgb(180, 35, 35),
    danger_bg: Rgb(248, 225, 223),
    info: Rgb(11, 107, 125),
    info_bg: Rgb(220, 240, 243),
};

pub const DARK: Palette = Palette {
    bg: Rgb(14, 16, 22),
    surface: Rgb(21, 24, 33),
    surface_raised: Rgb(28, 32, 48),
    border: Rgb(43, 48, 64),
    text: Rgb(230, 228, 223),
    text_muted: Rgb(154, 159, 171),
    accent: Rgb(157, 140, 255),
    on_accent: Rgb(14, 16, 22),
    ok: Rgb(90, 209, 122),
    ok_bg: Rgb(17, 41, 27),
    warn: Rgb(242, 181, 68),
    warn_bg: Rgb(46, 36, 16),
    danger: Rgb(255, 122, 112),
    danger_bg: Rgb(52, 22, 26),
    info: Rgb(79, 209, 224),
    info_bg: Rgb(15, 42, 48),
};

/// Which scheme to use.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Scheme { Light, Dark }

impl Scheme {
    pub const fn palette(self) -> &'static Palette {
        match self { Scheme::Light => &LIGHT, Scheme::Dark => &DARK }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AnsiColor { pub index: u8, pub name: &'static str, pub rgb: Rgb }

/// The 16-colour terminal palette (derived from the dark scheme). Index = ANSI colour number.
pub const ANSI16: [AnsiColor; 16] = [
    AnsiColor { index: 0, name: "black", rgb: Rgb(21, 24, 33) },
    AnsiColor { index: 1, name: "red", rgb: Rgb(255, 122, 112) },
    AnsiColor { index: 2, name: "green", rgb: Rgb(90, 209, 122) },
    AnsiColor { index: 3, name: "yellow", rgb: Rgb(242, 181, 68) },
    AnsiColor { index: 4, name: "blue", rgb: Rgb(130, 164, 244) },
    AnsiColor { index: 5, name: "magenta", rgb: Rgb(157, 140, 255) },
    AnsiColor { index: 6, name: "cyan", rgb: Rgb(79, 209, 224) },
    AnsiColor { index: 7, name: "white", rgb: Rgb(154, 159, 171) },
    AnsiColor { index: 8, name: "bright black", rgb: Rgb(43, 48, 64) },
    AnsiColor { index: 9, name: "bright red", rgb: Rgb(255, 155, 148) },
    AnsiColor { index: 10, name: "bright green", rgb: Rgb(131, 221, 155) },
    AnsiColor { index: 11, name: "bright yellow", rgb: Rgb(245, 200, 115) },
    AnsiColor { index: 12, name: "bright blue", rgb: Rgb(161, 187, 247) },
    AnsiColor { index: 13, name: "bright magenta", rgb: Rgb(182, 169, 255) },
    AnsiColor { index: 14, name: "bright cyan", rgb: Rgb(123, 221, 232) },
    AnsiColor { index: 15, name: "bright white", rgb: Rgb(230, 228, 223) },
];
pub const TERMINAL_BG: Rgb = Rgb(14, 16, 22);
pub const TERMINAL_FG: Rgb = Rgb(230, 228, 223);
pub const TERMINAL_CURSOR: Rgb = Rgb(157, 140, 255);

/// Typography. Sizes are logical pixels; the scale is xs, sm, md, lg, xl, 2xl.
pub mod font {
    pub const SANS_FAMILY: &str = "SGI Text";
    pub const MONO_FAMILY: &str = "JetBrains Mono";
    pub const SANS_STACK: &str = "\"SGI Text\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif";
    pub const MONO_STACK: &str = "\"JetBrains Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace";
    pub const SIZES: [f32; 6] = [14.0, 16.0, 18.0, 22.0, 30.0, 42.0];
    pub const XS: f32 = 14.0;
    pub const SM: f32 = 16.0;
    pub const MD: f32 = 18.0;
    pub const LG: f32 = 22.0;
    pub const XL: f32 = 30.0;
    pub const XXL: f32 = 42.0;
    pub const LINE_HEIGHT_BODY: f32 = 1.50;
    pub const LINE_HEIGHT_HEADING: f32 = 1.20;
}

/// Spacing scale in logical pixels (space::S1 = 4).
pub mod space {
    pub const S1: f32 = 4.0;
    pub const S2: f32 = 8.0;
    pub const S3: f32 = 12.0;
    pub const S4: f32 = 16.0;
    pub const S5: f32 = 24.0;
    pub const S6: f32 = 32.0;
    pub const S7: f32 = 48.0;
    pub const S8: f32 = 64.0;
    pub const SCALE: [f32; 8] = [4.0, 8.0, 12.0, 16.0, 24.0, 32.0, 48.0, 64.0];
}

pub mod radius {
    pub const SM: f32 = 2.0;
    pub const MD: f32 = 6.0;
    pub const FULL: f32 = 9999.0;
}

/// Motion durations in milliseconds.
pub mod motion {
    pub const FAST_MS: u32 = 120;
    pub const BASE_MS: u32 = 200;
    pub const SLOW_MS: u32 = 320;
    /// CSS-style easing, for reference.
    pub const EASING: &str = "cubic-bezier(0.2, 0, 0, 1)";
}

pub mod layout {
    pub const READING_MEASURE_CH: u32 = 72;
    pub const COLUMNS: u32 = 12;
    pub const GUTTER: f32 = 16.0;
    pub const BREAKPOINTS: [f32; 3] = [640.0, 960.0, 1280.0];
    /// Default height of buttons, inputs and other controls.
    pub const CONTROL_HEIGHT: f32 = 32.0;
}

/// Density presets (the web data-density attribute): control height, table cell padding, page padding.
pub mod density {
    pub struct Density {
        pub control: f32,
        pub cell_y: f32,
        pub pad: f32,
    }
    pub const COMFORTABLE: Density = Density { control: 32.0, cell_y: 10.0, pad: 24.0 };
    pub const COMPACT: Density = Density { control: 28.0, cell_y: 4.0, pad: 16.0 };
}

/// Touch / kiosk overrides.
pub mod kiosk {
    pub const MIN_TARGET: f32 = 48.0;
    pub const TYPE_SCALE: f32 = 1.25;
    pub const SPACE_SCALE: f32 = 1.5;
}
