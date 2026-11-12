//! iced adapter (also the base for libcosmic apps): a custom `Theme` built from the palette.
//! Depends on `iced_core` only, so it works with whichever iced backend (wayland/x11, wgpu/tiny-skia) the app picks.
use crate::{Rgb, Scheme};
use ::iced_core::{theme::Palette, Color, Theme};

impl From<Rgb> for Color {
    fn from(c: Rgb) -> Color {
        Color::from_rgb8(c.0, c.1, c.2)
    }
}

/// The Jupiter theme for a scheme.
pub fn theme(scheme: Scheme) -> Theme {
    let p = scheme.palette();
    let name = match scheme {
        Scheme::Light => "Jupiter Light",
        Scheme::Dark => "Jupiter Dark",
    };
    Theme::custom(
        name.to_string(),
        Palette {
            background: p.bg.into(),
            text: p.text.into(),
            primary: p.accent.into(),
            success: p.ok.into(),
            warning: p.warn.into(),
            danger: p.danger.into(),
        },
    )
}
