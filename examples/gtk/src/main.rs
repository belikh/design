//! GTK4 demo: the generated named-colour stylesheet + the `jupiter-theme` palette + recoloured stroke icons.
use gtk::prelude::*;
use gtk::{gdk, gdk_pixbuf, gio, glib};
use jupiter_theme::{Palette, DARK, LIGHT};
use std::cell::{Cell, RefCell};
use std::rc::Rc;

const LIGHT_CSS: &str = include_str!("../assets/jupiter-gtk-light.css");
const DARK_CSS: &str = include_str!("../assets/jupiter-gtk-dark.css");
const WIDGETS_CSS: &str = include_str!("../assets/jupiter-gtk-widgets.css");
const APP_CSS: &str = include_str!("../assets/app.css");

#[derive(Clone, Copy)]
enum Tint {
    Text,
    Muted,
    OnAccent,
    Accent,
}

/// An icon that can be re-rendered when the colour scheme changes.
struct Themed {
    image: gtk::Image,
    path: &'static str,
    px: i32,
    tint: Cell<Tint>,
}

fn palette(dark: bool) -> &'static Palette {
    if dark { &DARK } else { &LIGHT }
}

/// The SVGs are single strokes in `currentColor`; GTK won't recolour them, so bake the colour in.
fn render(path: &str, hex: &str, w: i32, h: i32) -> gdk::Texture {
    let file = format!("{}/assets/svg/{path}.svg", env!("CARGO_MANIFEST_DIR"));
    let svg = std::fs::read_to_string(&file).unwrap_or_else(|e| panic!("{file}: {e}")).replace("currentColor", hex);
    let stream = gio::MemoryInputStream::from_bytes(&glib::Bytes::from_owned(svg.into_bytes()));
    let pb = gdk_pixbuf::Pixbuf::from_stream_at_scale(&stream, w, h, true, gio::Cancellable::NONE).expect("render svg");
    gdk::Texture::for_pixbuf(&pb)
}

struct Ui {
    theme: gtk::CssProvider,
    icons: RefCell<Vec<Rc<Themed>>>,
    dark: Cell<bool>,
}

impl Ui {
    fn icon(&self, path: &'static str, px: i32, tint: Tint) -> Rc<Themed> {
        let it = Rc::new(Themed { image: gtk::Image::new(), path, px, tint: Cell::new(tint) });
        it.image.set_pixel_size(px);
        self.icons.borrow_mut().push(it.clone());
        self.paint(&it);
        it
    }
    fn paint(&self, it: &Themed) {
        let p = palette(self.dark.get());
        let c = match it.tint.get() {
            Tint::Text => p.text,
            Tint::Muted => p.text_muted,
            Tint::OnAccent => p.on_accent,
            Tint::Accent => p.accent,
        };
        it.image.set_paintable(Some(&render(it.path, &c.to_hex(), it.px, it.px)));
    }
    fn apply_scheme(&self, dark: bool) {
        self.dark.set(dark);
        self.theme.load_from_string(if dark { DARK_CSS } else { LIGHT_CSS });
        if let Some(s) = gtk::Settings::default() {
            s.set_gtk_application_prefer_dark_theme(dark);
        }
        for it in self.icons.borrow().iter() {
            self.paint(it);
        }
    }
}

fn label(text: &str, classes: &[&str]) -> gtk::Label {
    let l = gtk::Label::new(Some(text));
    l.set_xalign(0.0);
    for c in classes {
        l.add_css_class(c);
    }
    l
}

fn button(ui: &Rc<Ui>, text: &str, icon: &'static str, primary: bool) -> gtk::Button {
    let content = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    content.set_halign(gtk::Align::Center);
    let tint = if primary { Tint::OnAccent } else { Tint::Text };
    content.append(&ui.icon(icon, 16, tint).image);
    content.append(&gtk::Label::new(Some(text)));
    let b = gtk::Button::new();
    b.set_child(Some(&content));
    b.add_css_class(if primary { "primary" } else { "secondary" });
    b
}

fn stat(label_text: &str, value: &str, delta: &str, good: bool) -> gtk::Box {
    let b = gtk::Box::new(gtk::Orientation::Vertical, 2);
    b.add_css_class("card");
    b.set_hexpand(true);
    for m in [b.clone()] {
        m.set_margin_top(0);
    }
    let inner = gtk::Box::new(gtk::Orientation::Vertical, 2);
    inner.set_margin_top(16);
    inner.set_margin_bottom(16);
    inner.set_margin_start(16);
    inner.set_margin_end(16);
    inner.append(&label(&label_text.to_uppercase(), &["stat-label"]));
    inner.append(&label(value, &["stat-value"]));
    inner.append(&label(delta, &[if good { "good" } else { "bad" }]));
    b.append(&inner);
    b
}

fn build(app: &gtk::Application, start_dark: bool, shot: Option<String>) {
    let ui = Rc::new(Ui { theme: gtk::CssProvider::new(), icons: RefCell::new(vec![]), dark: Cell::new(start_dark) });
    let display = gdk::Display::default().expect("display");
    gtk::style_context_add_provider_for_display(&display, &ui.theme, gtk::STYLE_PROVIDER_PRIORITY_APPLICATION);
    let widgets = gtk::CssProvider::new();
    widgets.load_from_string(WIDGETS_CSS);
    gtk::style_context_add_provider_for_display(&display, &widgets, gtk::STYLE_PROVIDER_PRIORITY_APPLICATION);
    let app_css = gtk::CssProvider::new();
    app_css.load_from_string(APP_CSS);
    gtk::style_context_add_provider_for_display(&display, &app_css, gtk::STYLE_PROVIDER_PRIORITY_APPLICATION + 1);

    let win = gtk::ApplicationWindow::new(app);
    win.set_title(Some("Jupiter design system: GTK4 demo"));
    win.set_default_size(1040, 720);
    let root = gtk::Box::new(gtk::Orientation::Horizontal, 0);

    // ---- sidebar
    let side = gtk::Box::new(gtk::Orientation::Vertical, 4);
    side.add_css_class("sidebar");
    side.set_size_request(220, -1);
    let brand = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    brand.set_margin_bottom(16);
    brand.append(&ui.icon("icon/sparkle", 22, Tint::Accent).image);
    brand.append(&label("jupiter /ds", &["brand"]));
    side.append(&brand);
    let navs: Rc<RefCell<Vec<(gtk::Button, Rc<Themed>)>>> = Rc::new(RefCell::new(vec![]));
    for (i, (icon, name)) in [("icon/home", "Overview"), ("icon/chart", "Metrics"), ("icon/bell", "Alerts"), ("icon/settings", "Settings")].into_iter().enumerate() {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 10);
        let ic = ui.icon(icon, 18, if i == 0 { Tint::OnAccent } else { Tint::Text });
        row.append(&ic.image);
        row.append(&gtk::Label::new(Some(name)));
        let b = gtk::Button::new();
        b.set_child(Some(&row));
        b.add_css_class("nav");
        if i == 0 {
            b.add_css_class("active");
        }
        navs.borrow_mut().push((b.clone(), ic));
        side.append(&b);
    }
    {
        let all = navs.borrow().clone();
        for (b, _) in all.iter() {
            let (ui, all2, me) = (ui.clone(), navs.clone(), b.clone());
            b.connect_clicked(move |_| {
                for (btn, ic) in all2.borrow().iter() {
                    let active = *btn == me;
                    if active { btn.add_css_class("active") } else { btn.remove_css_class("active") }
                    ic.tint.set(if active { Tint::OnAccent } else { Tint::Text });
                    ui.paint(ic);
                }
            });
        }
    }
    let spacer = gtk::Box::new(gtk::Orientation::Vertical, 0);
    spacer.set_vexpand(true);
    side.append(&spacer);
    let mode = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let mode_icon = ui.icon(if start_dark { "icon/moon" } else { "icon/sun" }, 18, Tint::Muted);
    let mode_label = label(if start_dark { "Dark" } else { "Light" }, &["mono", "muted"]);
    mode_label.set_hexpand(true);
    let sw = gtk::Switch::new();
    sw.set_active(start_dark);
    {
        let ui = ui.clone();
        let (mi, ml) = (mode_icon.clone(), mode_label.clone());
        sw.connect_active_notify(move |s| {
            let dark = s.is_active();
            ml.set_text(if dark { "Dark" } else { "Light" });
            let p: &'static str = if dark { "icon/moon" } else { "icon/sun" };
            // swap the glyph by re-pointing a fresh render
            let hex = palette(dark).text_muted.to_hex();
            mi.image.set_paintable(Some(&render(p, &hex, mi.px, mi.px)));
            ui.apply_scheme(dark);
        });
    }
    mode.append(&mode_icon.image);
    mode.append(&mode_label);
    mode.append(&sw);
    side.append(&mode);
    root.append(&side);

    // ---- main
    let main = gtk::Box::new(gtk::Orientation::Vertical, 16);
    for m in [main.clone()] {
        m.set_margin_top(24);
        m.set_margin_bottom(24);
        m.set_margin_start(32);
        m.set_margin_end(32);
        m.set_hexpand(true);
    }
    let head = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    let titles = gtk::Box::new(gtk::Orientation::Vertical, 0);
    titles.set_hexpand(true);
    titles.append(&label("OVERVIEW", &["eyebrow"]));
    titles.append(&label("Service status", &["title"]));
    head.append(&titles);
    head.append(&button(&ui, "Refresh", "icon/refresh", false));
    head.append(&button(&ui, "New check", "icon/plus", true));
    main.append(&head);

    let stats = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    stats.set_homogeneous(true);
    stats.append(&stat("Uptime", "99.98%", "+0.02 vs last week", true));
    stats.append(&stat("Latency p95", "182 ms", "+14 ms", false));
    stats.append(&stat("Requests", "4.2M", "+8.1%", true));
    main.append(&stats);

    let rule = gtk::Picture::new();
    rule.set_paintable(Some(&render("rule/wave", &palette(start_dark).border.to_hex(), 240, 24)));
    rule.set_can_shrink(false);
    rule.set_size_request(240, 24);
    rule.set_hexpand(false);
    rule.set_halign(gtk::Align::Start);
    rule.set_content_fit(gtk::ContentFit::ScaleDown);
    main.append(&rule);

    let table = gtk::Box::new(gtk::Orientation::Vertical, 0);
    table.add_css_class("card");
    for (name, region, status, latency) in [
        ("jupiter-api", "ap-southeast-2", "ok", "42 ms"),
        ("media-archive", "brisbane", "warn", "180 ms"),
        ("ha-bridge", "home", "ok", "9 ms"),
        ("pxe-boot", "home", "danger", "timeout"),
    ] {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        row.add_css_class("row");
        let n = label(name, &["mono"]);
        n.set_width_chars(18);
        let r = label(region, &["muted"]);
        r.set_hexpand(true);
        let l = label(latency, &["mono"]);
        l.set_width_chars(8);
        l.set_xalign(1.0);
        let text = match status { "ok" => "HEALTHY", "warn" => "DEGRADED", _ => "DOWN" };
        let badge = label(text, &["badge", &format!("badge-{status}")]);
        badge.set_valign(gtk::Align::Center);
        for w in [n.upcast::<gtk::Widget>(), r.upcast(), l.upcast(), badge.upcast()] {
            row.append(&w);
        }
        table.append(&row);
    }
    main.append(&table);

    let empty = gtk::Box::new(gtk::Orientation::Horizontal, 24);
    empty.append(&ui.icon("spot/koala", 120, Tint::Muted).image);
    let msg = gtk::Box::new(gtk::Orientation::Vertical, 8);
    msg.set_valign(gtk::Align::Center);
    let h = label("No alerts in the last 24 hours", &[]);
    h.add_css_class("heading");
    msg.append(&h);
    msg.append(&label("Spot illustrations use the same stroke, so they follow the theme too.", &["muted"]));
    let cb = button(&ui, "Create alert", "icon/bell", false);
    cb.set_halign(gtk::Align::Start);
    msg.append(&cb);
    empty.append(&msg);
    main.append(&empty);
    root.append(&main);

    win.set_child(Some(&root));
    ui.apply_scheme(start_dark);
    win.present();

    if let Some(path) = shot {
        let (w, app) = (win.clone(), app.clone());
        glib::timeout_add_local_once(std::time::Duration::from_millis(900), move || {
            let (width, height) = (w.width() as f32, w.height() as f32);
            let paintable = gtk::WidgetPaintable::new(Some(&w));
            let snap = gtk::Snapshot::new();
            paintable.snapshot(&snap, width as f64, height as f64);
            if let (Some(node), Some(native)) = (snap.to_node(), w.native()) {
                if let Some(renderer) = native.renderer() {
                    let tex = renderer.render_texture(&node, None);
                    tex.save_to_png(&path).expect("save png");
                    println!("wrote {path} ({}x{})", width as i32, height as i32);
                }
            }
            app.quit();
        });
    }
}

fn main() -> glib::ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let dark = args.iter().any(|a| a == "--dark");
    let shot = args.iter().position(|a| a == "--screenshot").and_then(|i| args.get(i + 1).cloned());
    let app = gtk::Application::builder().application_id("au.jupiter.ds.gtkdemo").flags(gio::ApplicationFlags::NON_UNIQUE).build();
    app.connect_activate(move |a| build(a, dark, shot.clone()));
    app.run_with_args::<&str>(&[])
}
