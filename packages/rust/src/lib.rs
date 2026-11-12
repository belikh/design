//! Jupiter design tokens for Rust. The core has no dependencies; enable `ratatui`, `egui` or `iced` for adapters.
//!
//! `generated.rs` is produced from `packages/tokens/jupiter.tokens.json` (`npm run build`). Do not edit it.

#[rustfmt::skip]
mod generated;
pub use generated::*;

#[cfg(feature = "egui")]
pub mod egui_theme;
#[cfg(feature = "iced")]
pub mod iced_theme;
#[cfg(feature = "ratatui")]
pub mod tui;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn palettes_match_the_token_file() {
        assert_eq!(LIGHT.bg.to_hex(), "#faf9f7");
        assert_eq!(LIGHT.accent.to_hex(), "#4b3fbf");
        assert_ne!(LIGHT, DARK);
    }

    #[test]
    fn scales_are_complete() {
        assert_eq!(ANSI16.len(), 16);
        assert_eq!(space::SCALE.len(), 8);
        assert_eq!(font::SIZES[2], font::MD);
        assert!(radius::SM < radius::MD);
    }

    #[test]
    fn scheme_selects_palette() {
        assert_eq!(Scheme::Dark.palette(), &DARK);
        assert_eq!(Scheme::Light.palette(), &LIGHT);
    }

    #[cfg(feature = "ratatui")]
    #[test]
    fn ratatui_conversion() {
        let c: ratatui::style::Color = LIGHT.accent.into();
        assert_eq!(c, ratatui::style::Color::Rgb(0x4b, 0x3f, 0xbf));
        let _ = tui::Theme::dark().selected();
    }

    #[cfg(feature = "egui")]
    #[test]
    fn egui_visuals() {
        let v = egui_theme::visuals(Scheme::Dark);
        assert!(v.dark_mode);
        assert_eq!(v.panel_fill, ::egui::Color32::from(DARK.bg));
    }

    #[cfg(feature = "iced")]
    #[test]
    fn iced_theme_palette() {
        let t = iced_theme::theme(Scheme::Light);
        assert_eq!(t.palette().primary, ::iced_core::Color::from(LIGHT.accent));
    }
}
