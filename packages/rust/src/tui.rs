//! ratatui adapter: `Rgb` -> `Color`, and a `Theme` of ready-made `Style`s that mirror the `.jp-*` look.
use crate::{Palette, Rgb, Scheme};
use ratatui::style::{Color, Modifier, Style};

impl From<Rgb> for Color {
    fn from(c: Rgb) -> Color {
        Color::Rgb(c.0, c.1, c.2)
    }
}

/// Semantic styles for one colour scheme.
#[derive(Clone, Copy, Debug)]
pub struct Theme {
    pub palette: &'static Palette,
}

impl Theme {
    pub const fn new(scheme: Scheme) -> Self {
        Theme {
            palette: scheme.palette(),
        }
    }
    pub const fn dark() -> Self {
        Self::new(Scheme::Dark)
    }
    pub const fn light() -> Self {
        Self::new(Scheme::Light)
    }
    /// Default text on the app background.
    pub fn base(&self) -> Style {
        Style::new()
            .fg(self.palette.text.into())
            .bg(self.palette.bg.into())
    }
    pub fn muted(&self) -> Style {
        Style::new().fg(self.palette.text_muted.into())
    }
    /// Raised panel surface.
    pub fn surface(&self) -> Style {
        Style::new()
            .fg(self.palette.text.into())
            .bg(self.palette.surface.into())
    }
    pub fn border(&self) -> Style {
        Style::new().fg(self.palette.border.into())
    }
    pub fn accent(&self) -> Style {
        Style::new().fg(self.palette.accent.into())
    }
    /// Selected row / focused item: on-accent text on the accent colour.
    pub fn selected(&self) -> Style {
        Style::new()
            .fg(self.palette.on_accent.into())
            .bg(self.palette.accent.into())
            .add_modifier(Modifier::BOLD)
    }
    pub fn title(&self) -> Style {
        Style::new()
            .fg(self.palette.text.into())
            .add_modifier(Modifier::BOLD)
    }
    pub fn ok(&self) -> Style {
        Style::new().fg(self.palette.ok.into())
    }
    pub fn warn(&self) -> Style {
        Style::new().fg(self.palette.warn.into())
    }
    pub fn danger(&self) -> Style {
        Style::new().fg(self.palette.danger.into())
    }
    pub fn info(&self) -> Style {
        Style::new().fg(self.palette.info.into())
    }
    /// Status "badge": status colour on its tinted background.
    pub fn badge_ok(&self) -> Style {
        Style::new()
            .fg(self.palette.ok.into())
            .bg(self.palette.ok_bg.into())
    }
    pub fn badge_warn(&self) -> Style {
        Style::new()
            .fg(self.palette.warn.into())
            .bg(self.palette.warn_bg.into())
    }
    pub fn badge_danger(&self) -> Style {
        Style::new()
            .fg(self.palette.danger.into())
            .bg(self.palette.danger_bg.into())
    }
    pub fn badge_info(&self) -> Style {
        Style::new()
            .fg(self.palette.info.into())
            .bg(self.palette.info_bg.into())
    }
}
