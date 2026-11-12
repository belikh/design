//! egui adapter: colours, rounding and spacing from the tokens.
use crate::{font, radius, space, Palette, Rgb, Scheme};
use ::egui::{epaint::CornerRadius, Color32, Context, FontId, Stroke, TextStyle, Visuals};

impl From<Rgb> for Color32 {
    fn from(c: Rgb) -> Color32 {
        Color32::from_rgb(c.0, c.1, c.2)
    }
}

fn c(rgb: Rgb) -> Color32 {
    rgb.into()
}

/// Visuals for a scheme (start from egui's own light/dark so every field has a sane value).
pub fn visuals(scheme: Scheme) -> Visuals {
    let p: &Palette = scheme.palette();
    let mut v = match scheme {
        Scheme::Light => Visuals::light(),
        Scheme::Dark => Visuals::dark(),
    };
    let corner = CornerRadius::same(radius::MD as u8);
    v.override_text_color = None;
    v.hyperlink_color = c(p.accent);
    v.faint_bg_color = c(p.surface);
    v.extreme_bg_color = c(p.surface_raised);
    v.code_bg_color = c(p.surface);
    v.warn_fg_color = c(p.warn);
    v.error_fg_color = c(p.danger);
    v.panel_fill = c(p.bg);
    v.window_fill = c(p.surface_raised);
    v.window_stroke = Stroke::new(1.0, c(p.border));
    v.window_corner_radius = corner;
    v.menu_corner_radius = corner;
    v.selection.bg_fill = c(p.accent);
    v.selection.stroke = Stroke::new(1.0, c(p.on_accent));

    let w = &mut v.widgets;
    w.noninteractive.bg_fill = c(p.bg);
    w.noninteractive.weak_bg_fill = c(p.surface);
    w.noninteractive.bg_stroke = Stroke::new(1.0, c(p.border));
    w.noninteractive.fg_stroke = Stroke::new(1.0, c(p.text));
    for s in [&mut w.inactive, &mut w.hovered, &mut w.active, &mut w.open] {
        s.corner_radius = corner;
    }
    w.noninteractive.corner_radius = corner;
    w.inactive.bg_fill = c(p.surface);
    w.inactive.weak_bg_fill = c(p.surface);
    w.inactive.bg_stroke = Stroke::new(1.0, c(p.border));
    w.inactive.fg_stroke = Stroke::new(1.0, c(p.text));
    w.hovered.bg_fill = c(p.surface_raised);
    w.hovered.weak_bg_fill = c(p.surface_raised);
    w.hovered.bg_stroke = Stroke::new(1.0, c(p.accent));
    w.hovered.fg_stroke = Stroke::new(1.5, c(p.text));
    w.active.bg_fill = c(p.accent);
    w.active.weak_bg_fill = c(p.accent);
    w.active.bg_stroke = Stroke::new(1.0, c(p.accent));
    w.active.fg_stroke = Stroke::new(1.5, c(p.on_accent));
    w.open.bg_fill = c(p.surface_raised);
    w.open.weak_bg_fill = c(p.surface_raised);
    w.open.fg_stroke = Stroke::new(1.0, c(p.text));
    v
}

/// Apply visuals, spacing and type sizes to a context. Call once at startup (and again to switch scheme).
pub fn apply(ctx: &Context, scheme: Scheme) {
    ctx.set_visuals(visuals(scheme));
    ctx.all_styles_mut(|style| {
        style.spacing.item_spacing = ::egui::vec2(space::S2, space::S1 + 2.0);
        style.spacing.button_padding = ::egui::vec2(space::S3, space::S1);
        style.spacing.interact_size.y = crate::layout::CONTROL_HEIGHT;
        style
            .text_styles
            .insert(TextStyle::Small, FontId::proportional(font::XS));
        style
            .text_styles
            .insert(TextStyle::Body, FontId::proportional(font::SM));
        style
            .text_styles
            .insert(TextStyle::Button, FontId::proportional(font::SM));
        style
            .text_styles
            .insert(TextStyle::Heading, FontId::proportional(font::XL));
        style
            .text_styles
            .insert(TextStyle::Monospace, FontId::monospace(font::SM));
    });
}
