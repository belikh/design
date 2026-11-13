//! GTK4 demo: eight pages (overview, metrics, alerts, tables, invoice, documents, network, settings) themed from the
//! generated named-colour stylesheet and the `jupiter-theme` palette / density tokens, with recoloured stroke icons.
//!
//!   cargo run -- [--dark] [--compact] [--hide-resolved] [--page <name>] [--toggle dark|compact|resolved] [--screenshot out.png]
use gtk::prelude::*;
use gtk::{gdk, gdk_pixbuf, gio, glib};
use jupiter_theme::{density, Palette, DARK, LIGHT};
use std::cell::{Cell, RefCell};
use std::rc::Rc;

const LIGHT_CSS: &str = include_str!("../assets/jupiter-gtk-light.css");
const DARK_CSS: &str = include_str!("../assets/jupiter-gtk-dark.css");
const WIDGETS_CSS: &str = include_str!("../assets/jupiter-gtk-widgets.css");
const APP_CSS: &str = include_str!("../assets/app.css");

#[allow(dead_code)]
mod sample {
    include!("../../data/sample.rs");
}

const PAGES: [(&str, &str, &str); 8] = [
    ("overview", "Overview", "icon/home"),
    ("metrics", "Metrics", "icon/chart"),
    ("alerts", "Alerts", "icon/bell"),
    ("tables", "Tables", "icon/database"),
    ("invoice", "Invoice", "icon/card"),
    ("documents", "Documents", "icon/file"),
    ("network", "Network", "icon/router"),
    ("settings", "Settings", "icon/settings"),
];

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
    if dark {
        &DARK
    } else {
        &LIGHT
    }
}

/// The SVGs are single strokes in `currentColor`; GTK won't recolour them, so bake the colour in.
fn render(path: &str, hex: &str, w: i32, h: i32) -> gdk::Texture {
    let file = format!("{}/assets/svg/{path}.svg", env!("CARGO_MANIFEST_DIR"));
    let svg = std::fs::read_to_string(&file)
        .unwrap_or_else(|e| panic!("{file}: {e}"))
        .replace("currentColor", hex);
    let stream = gio::MemoryInputStream::from_bytes(&glib::Bytes::from_owned(svg.into_bytes()));
    let pb = gdk_pixbuf::Pixbuf::from_stream_at_scale(&stream, w, h, true, gio::Cancellable::NONE)
        .expect("render svg");
    gdk::Texture::for_pixbuf(&pb)
}

struct Ui {
    theme: gtk::CssProvider,
    density: gtk::CssProvider,
    icons: RefCell<Vec<Rc<Themed>>>,
    dark: Cell<bool>,
    compact: Cell<bool>,
    show_resolved: Cell<bool>,
    /// Called after the colour scheme changes so the two dark switches stay in step.
    on_scheme: RefCell<Vec<Box<dyn Fn(bool)>>>,
    resolved_rows: RefCell<Vec<gtk::Widget>>,
}

impl Ui {
    fn icon(&self, path: &'static str, px: i32, tint: Tint) -> Rc<Themed> {
        let it = Rc::new(Themed {
            image: gtk::Image::new(),
            path,
            px,
            tint: Cell::new(tint),
        });
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
        it.image
            .set_paintable(Some(&render(it.path, &c.to_hex(), it.px, it.px)));
    }
    /// Density comes from the generated `density` tokens (control height, cell padding), not from literals here.
    fn apply_density(&self, compact: bool) {
        self.compact.set(compact);
        let d = if compact {
            &density::COMPACT
        } else {
            &density::COMFORTABLE
        };
        self.density.load_from_string(&format!(
            ".row {{ padding: {cy}px 16px; }} button.primary, button.secondary {{ min-height: {c}px; }} .page {{ margin: {pad}px; }}",
            cy = d.cell_y,
            c = d.control,
            pad = d.pad
        ));
    }
    fn apply_scheme(&self, dark: bool) {
        self.dark.set(dark);
        self.theme
            .load_from_string(if dark { DARK_CSS } else { LIGHT_CSS });
        if let Some(s) = gtk::Settings::default() {
            s.set_gtk_application_prefer_dark_theme(dark);
        }
        for it in self.icons.borrow().iter() {
            self.paint(it);
        }
        for f in self.on_scheme.borrow().iter() {
            f(dark);
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

// ---- table helpers: a card holding header and body rows; row padding comes from the density tokens via `.row`
fn cell(text: &str, classes: &[&str], chars: i32, expand: bool, right: bool) -> gtk::Label {
    let l = label(text, classes);
    l.set_ellipsize(gtk::pango::EllipsizeMode::End);
    if chars > 0 {
        l.set_width_chars(chars);
        l.set_max_width_chars(chars);
    }
    l.set_hexpand(expand);
    if right {
        l.set_xalign(1.0);
    }
    l
}
fn row_of(cells: &[gtk::Widget]) -> gtk::Box {
    let r = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    r.add_css_class("row");
    for c in cells {
        r.append(c);
    }
    r
}
fn head_row(cols: &[(&str, i32, bool, bool)]) -> gtk::Box {
    let cells: Vec<gtk::Widget> = cols
        .iter()
        .map(|(t, w, e, r)| cell(&t.to_uppercase(), &["th"], *w, *e, *r).upcast())
        .collect();
    let r = row_of(&cells);
    r.add_css_class("thead");
    r
}
fn status_badge(text: &str, kind: &str) -> gtk::Label {
    let b = label(&text.to_uppercase(), &["badge", &format!("badge-{kind}")]);
    b.set_valign(gtk::Align::Center);
    b.set_halign(gtk::Align::Start);
    b.set_width_chars(10);
    b
}
fn card() -> gtk::Box {
    let c = gtk::Box::new(gtk::Orientation::Vertical, 0);
    c.add_css_class("card");
    c.set_overflow(gtk::Overflow::Hidden);
    c
}
fn page_head(ui: &Rc<Ui>, eyebrow: &str, title: &str, action: Option<gtk::Widget>) -> gtk::Box {
    let head = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    let titles = gtk::Box::new(gtk::Orientation::Vertical, 0);
    titles.set_hexpand(true);
    titles.append(&label(&eyebrow.to_uppercase(), &["eyebrow"]));
    titles.append(&label(title, &["title"]));
    head.append(&titles);
    if let Some(a) = action {
        a.set_valign(gtk::Align::Start);
        head.append(&a);
    }
    let _ = ui;
    head
}
fn page_box() -> gtk::Box {
    let b = gtk::Box::new(gtk::Orientation::Vertical, 16);
    b.add_css_class("page");
    b.set_valign(gtk::Align::Start);
    b
}
fn kind_of(status: &str) -> &'static str {
    match status {
        "ok" | "online" | "resolved" | "paid" => "ok",
        "warn" | "updating" | "disabled" | "sent" | "firing" | "draft" => "warn",
        _ => "danger",
    }
}
fn badge_text(status: &str) -> &str {
    match status {
        "ok" => "healthy",
        "warn" => "degraded",
        "danger" => "down",
        s => s,
    }
}

fn overview(ui: &Rc<Ui>) -> gtk::Box {
    let p = page_box();
    p.append(&page_head(
        ui,
        "Overview",
        "Service status",
        Some(button(ui, "Refresh", "icon/refresh", false).upcast()),
    ));
    let stats = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    stats.set_homogeneous(true);
    let up = sample::SERVICES.iter().map(|s| s.uptime).sum::<f32>() / sample::SERVICES.len() as f32;
    let open = sample::ALERTS
        .iter()
        .filter(|a| a.kind == "incident" && a.state == "open")
        .count();
    let firing = sample::ALERTS
        .iter()
        .filter(|a| a.state == "firing")
        .count();
    stats.append(&stat(
        "Uptime (90 d)",
        &format!("{up:.2}%"),
        "average across services",
        true,
    ));
    stats.append(&stat(
        "Open incidents",
        &open.to_string(),
        &format!("as of {}", sample::AS_OF),
        open == 0,
    ));
    stats.append(&stat(
        "Rules firing",
        &firing.to_string(),
        "alert rules",
        firing == 0,
    ));
    p.append(&stats);
    let rule = gtk::Picture::new();
    rule.set_paintable(Some(&render(
        "rule/wave",
        &palette(ui.dark.get()).border.to_hex(),
        240,
        24,
    )));
    rule.set_can_shrink(false);
    rule.set_size_request(240, 24);
    rule.set_halign(gtk::Align::Start);
    rule.set_content_fit(gtk::ContentFit::ScaleDown);
    p.append(&rule);
    let t = card();
    t.append(&head_row(&[
        ("Service", 18, false, false),
        ("Owner", 0, true, false),
        ("Uptime", 10, false, true),
        ("p95", 8, false, true),
        ("Status", 10, false, false),
    ]));
    for s in sample::SERVICES {
        let p95 = if s.p95 == 0 {
            "-".to_string()
        } else {
            format!("{} ms", s.p95)
        };
        t.append(&row_of(&[
            cell(s.name, &["mono"], 18, false, false).upcast(),
            cell(s.owner, &["muted"], 0, true, false).upcast(),
            cell(&format!("{:.3}%", s.uptime), &["mono"], 10, false, true).upcast(),
            cell(&p95, &["mono"], 8, false, true).upcast(),
            status_badge(badge_text(s.status), kind_of(s.status)).upcast(),
        ]));
    }
    p.append(&t);
    p
}

/// A bar sparkline drawn with cairo in the current palette's accent (redrawn when the scheme changes).
fn spark(ui: &Rc<Ui>, points: &'static [f32]) -> gtk::DrawingArea {
    let da = gtk::DrawingArea::new();
    da.set_content_height(32);
    da.set_hexpand(true);
    let ui2 = ui.clone();
    da.set_draw_func(move |_, cr, w, h| {
        let c = palette(ui2.dark.get()).accent;
        cr.set_source_rgb(c.0 as f64 / 255.0, c.1 as f64 / 255.0, c.2 as f64 / 255.0);
        let max = points.iter().cloned().fold(1.0_f32, f32::max) as f64;
        let n = points.len() as f64;
        let bw = (w as f64 - (n - 1.0) * 2.0) / n;
        for (i, v) in points.iter().enumerate() {
            let bh = ((*v as f64 / max) * h as f64).max(2.0);
            cr.rectangle(i as f64 * (bw + 2.0), h as f64 - bh, bw, bh);
        }
        let _ = cr.fill();
    });
    let da2 = da.clone();
    ui.on_scheme
        .borrow_mut()
        .push(Box::new(move |_| da2.queue_draw()));
    da
}

fn metrics(ui: &Rc<Ui>) -> gtk::Box {
    let p = page_box();
    p.append(&page_head(ui, "Metrics", "Latency and error budget", None));
    p.append(&label("p95 latency over the last 24 hours (bars scaled to each service's own peak) and the share of the 90-day error budget used.", &["muted"]));
    let t = card();
    t.append(&head_row(&[
        ("Service", 16, false, false),
        ("Latency p95, 24 h", 0, true, false),
        ("Last / max", 16, false, true),
        ("Budget used", 16, false, false),
    ]));
    let keys = ["api", "media", "ha", "pxe", "wg", "dns"];
    for (svc, key) in sample::SERVICES.iter().zip(keys) {
        let m = sample::METRICS
            .iter()
            .find(|m| m.svc == key && m.metric == "latency")
            .expect("latency series");
        let used = svc.budget_used_pct;
        let bar = gtk::ProgressBar::new();
        bar.set_fraction((used as f64 / 100.0).min(1.0));
        bar.add_css_class(if used >= 100 {
            "meter-danger"
        } else if used > 50 {
            "meter-warn"
        } else {
            "meter-ok"
        });
        let budget = gtk::Box::new(gtk::Orientation::Vertical, 2);
        budget.set_size_request(150, -1);
        budget.append(&bar);
        budget.append(&label(&format!("{used}%"), &["mono", "muted", "small"]));
        t.append(&row_of(&[
            cell(svc.name, &["mono"], 16, false, false).upcast(),
            spark(ui, m.points).upcast(),
            cell(
                &format!("{} / {} ms", m.last, m.max),
                &["mono"],
                16,
                false,
                true,
            )
            .upcast(),
            budget.upcast(),
        ]));
    }
    p.append(&t);
    p
}

fn alerts(ui: &Rc<Ui>) -> gtk::Box {
    let p = page_box();
    p.append(&page_head(
        ui,
        "Alerts",
        "Incidents and rules",
        Some(button(ui, "Create alert", "icon/bell", true).upcast()),
    ));
    p.append(&label(
        "Resolved incidents can be hidden in Settings.",
        &["muted"],
    ));
    let t = card();
    t.append(&head_row(&[
        ("Id", 8, false, false),
        ("Title", 0, true, false),
        ("Service", 14, false, false),
        ("Sev", 5, false, false),
        ("State", 10, false, false),
        ("Duration", 16, false, true),
    ]));
    for a in sample::ALERTS {
        let sev_class = match a.sev {
            1 => "bad",
            2 => "warnc",
            _ => "infoc",
        };
        let row = row_of(&[
            cell(a.id, &["mono"], 8, false, false).upcast(),
            cell(a.title, &[], 0, true, false).upcast(),
            cell(a.svc, &["muted"], 14, false, false).upcast(),
            cell(
                &format!("SEV{}", a.sev),
                &["mono", sev_class],
                5,
                false,
                false,
            )
            .upcast(),
            status_badge(a.state, kind_of(a.state)).upcast(),
            cell(a.duration, &["muted"], 16, false, true).upcast(),
        ]);
        if a.state == "resolved" {
            row.set_visible(ui.show_resolved.get());
            ui.resolved_rows.borrow_mut().push(row.clone().upcast());
        }
        t.append(&row);
    }
    p.append(&t);
    p
}

#[derive(Clone)]
struct InvRow {
    src: &'static sample::Invoice,
    client: String,
    status: String,
    cents: i64,
}
const STATUSES: [&str; 5] = ["draft", "sent", "overdue", "paid", "void"];

fn money(c: i64) -> String {
    let d = (c / 100).to_string();
    let mut out = String::new();
    for (i, ch) in d.chars().enumerate() {
        if i > 0 && (d.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    format!("${out}.{:02}", c % 100)
}

/// State of the Tables page: an editable copy of the invoices, the sort column and the cell widgets (for `--edit`).
struct TableCtx {
    body: gtk::Box,
    rows: RefCell<Vec<InvRow>>,
    sort: Cell<usize>,
    err: gtk::Label,
    /// per displayed row: the (stack, entry) of its editable cells: client, status, total
    cells: RefCell<Vec<[(gtk::Stack, gtk::Entry); 3]>>,
}

/// Validate and apply one edit; returns an error message or "".
fn apply_edit(ctx: &TableCtx, number: &str, col: usize, text: &str) -> String {
    let text = text.trim();
    let mut rows = ctx.rows.borrow_mut();
    let Some(r) = rows.iter_mut().find(|r| r.src.number == number) else {
        return "Unknown invoice".into();
    };
    match col {
        0 if text.is_empty() => "Client is required".into(),
        0 => {
            r.client = text.to_string();
            String::new()
        }
        1 if STATUSES.contains(&text) => {
            r.status = text.to_string();
            String::new()
        }
        1 => format!("Status must be one of {}", STATUSES.join(", ")),
        _ => match text.trim_start_matches('$').replace(',', "").parse::<f64>() {
            Ok(v) if v > 0.0 && v < 1e9 => {
                r.cents = (v * 100.0).round() as i64;
                String::new()
            }
            _ => "Total must be a positive number".into(),
        },
    }
}

/// A cell that shows a label and swaps to an entry on click: Enter commits, Escape cancels.
fn editable_cell(
    ctx: &Rc<TableCtx>,
    number: &'static str,
    col: usize,
    text: &str,
    classes: &[&str],
    chars: i32,
    expand: bool,
    right: bool,
) -> (gtk::Stack, gtk::Entry) {
    let stack = gtk::Stack::new();
    stack.set_hexpand(expand);
    let l = cell(text, classes, chars, expand, right);
    l.add_css_class("editable");
    let entry = gtk::Entry::new();
    entry.add_css_class("cell-entry");
    entry.set_width_chars(chars.max(8));
    stack.add_named(&l, Some("l"));
    stack.add_named(&entry, Some("e"));
    stack.set_visible_child_name("l");
    let start = {
        let (stack, entry, text) = (stack.clone(), entry.clone(), text.to_string());
        let err = ctx.err.clone();
        move || {
            entry.set_text(&text);
            err.set_text("");
            stack.set_visible_child_name("e");
            entry.grab_focus();
        }
    };
    let click = gtk::GestureClick::new();
    click.connect_pressed(move |_, _, _, _| start());
    l.add_controller(click);
    {
        let (ctx, stack) = (ctx.clone(), stack.clone());
        entry.connect_activate(move |e| {
            let msg = apply_edit(&ctx, number, col, &e.text());
            ctx.err.set_text(&msg);
            if msg.is_empty() {
                rebuild(&ctx);
            } else {
                stack.set_visible_child_name("e");
            }
        });
    }
    {
        let (ctx, stack) = (ctx.clone(), stack.clone());
        let keys = gtk::EventControllerKey::new();
        keys.connect_key_pressed(move |_, key, _, _| {
            if key == gdk::Key::Escape {
                stack.set_visible_child_name("l");
                ctx.err.set_text("");
                glib::Propagation::Stop
            } else {
                glib::Propagation::Proceed
            }
        });
        entry.add_controller(keys);
    }
    (stack, entry)
}

fn rebuild(ctx: &Rc<TableCtx>) {
    while let Some(c) = ctx.body.first_child() {
        ctx.body.remove(&c);
    }
    ctx.cells.borrow_mut().clear();
    let mut v = ctx.rows.borrow().clone();
    match ctx.sort.get() {
        0 => v.sort_by_key(|i| i.src.number),
        1 => v.sort_by_key(|i| i.client.clone()),
        2 => v.sort_by_key(|i| -i.cents),
        _ => v.sort_by_key(|i| i.status.clone()),
    }
    for i in v {
        let n = i.src.number;
        let c0 = editable_cell(ctx, n, 0, &i.client, &[], 0, true, false);
        let c1 = editable_cell(ctx, n, 1, &i.status, &["mono"], 10, false, false);
        let c2 = editable_cell(ctx, n, 2, &money(i.cents), &["mono"], 12, false, true);
        let row = row_of(&[
            cell(n, &["mono"], 10, false, false).upcast(),
            c0.0.clone().upcast(),
            cell(i.src.issued, &["mono", "muted"], 11, false, false).upcast(),
            cell(i.src.due, &["mono", "muted"], 11, false, false).upcast(),
            c1.0.clone().upcast(),
            c2.0.clone().upcast(),
        ]);
        ctx.cells.borrow_mut().push([c0, c1, c2]);
        // click a row to select it
        let click = gtk::GestureClick::new();
        let (l, r) = (ctx.body.clone(), row.clone());
        click.connect_pressed(move |_, _, _, _| {
            let mut c = l.first_child();
            while let Some(w) = c {
                w.remove_css_class("selected");
                c = w.next_sibling();
            }
            r.add_css_class("selected");
        });
        row.add_controller(click);
        ctx.body.append(&row);
    }
}

fn tables(ui: &Rc<Ui>) -> (gtk::Box, Rc<TableCtx>) {
    let p = page_box();
    p.append(&page_head(ui, "Tables", "Invoices", None));
    p.append(&label(
        "Click a column header to sort, a row to select it, or a Client, Status or Total cell to edit it (Enter commits, Escape cancels). Row padding follows the density setting.",
        &["muted"],
    ));
    let err = label("", &["bad"]);
    p.append(&err);
    let t = card();
    let ctx = Rc::new(TableCtx {
        body: gtk::Box::new(gtk::Orientation::Vertical, 0),
        rows: RefCell::new(
            sample::INVOICES
                .iter()
                .map(|i| InvRow {
                    src: i,
                    client: i.client.to_string(),
                    status: i.status.to_string(),
                    cents: i.total_cents,
                })
                .collect(),
        ),
        sort: Cell::new(0),
        err,
        cells: RefCell::new(vec![]),
    });
    rebuild(&ctx);
    let body = ctx.body.clone();
    let head = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    head.add_css_class("row");
    head.add_css_class("thead");
    let cols: [(&str, i32, bool, bool, Option<usize>); 6] = [
        ("Number", 10, false, false, Some(0)),
        ("Client", 0, true, false, Some(1)),
        ("Issued", 11, false, false, None),
        ("Due", 11, false, false, None),
        ("Status", 10, false, false, Some(3)),
        ("Total", 12, false, true, Some(2)),
    ];
    let heads: Rc<RefCell<Vec<(gtk::Button, &'static str)>>> = Rc::new(RefCell::new(vec![]));
    for (name, w, e, r, sort) in cols {
        match sort {
            Some(col) => {
                let b = gtk::Button::with_label(&name.to_uppercase());
                b.add_css_class("th-sort");
                b.set_hexpand(e);
                if let Some(l) = b.child().and_downcast::<gtk::Label>() {
                    l.set_xalign(if r { 1.0 } else { 0.0 });
                    if w > 0 {
                        l.set_width_chars(w + 1);
                    }
                }
                let (ctx2, heads2, me) = (ctx.clone(), heads.clone(), b.clone());
                b.connect_clicked(move |_| {
                    ctx2.sort.set(col);
                    rebuild(&ctx2);
                    for (hb, n) in heads2.borrow().iter() {
                        hb.set_label(&if *hb == me {
                            format!("{} v", n.to_uppercase())
                        } else {
                            n.to_uppercase()
                        });
                        if *hb == me {
                            hb.add_css_class("active")
                        } else {
                            hb.remove_css_class("active")
                        }
                    }
                });
                if col == 0 {
                    b.set_label("NUMBER v");
                    b.add_css_class("active");
                }
                heads.borrow_mut().push((b.clone(), name));
                head.append(&b);
            }
            None => head.append(&cell(&name.to_uppercase(), &["th"], w, e, r)),
        }
    }
    t.append(&head);
    t.append(&body);
    p.append(&t);
    (p, ctx)
}

fn invoice(ui: &Rc<Ui>) -> gtk::Box {
    let inv = &sample::INVOICES[0];
    let p = page_box();
    p.append(&page_head(
        ui,
        "Billing",
        &format!("Invoice {}", inv.number),
        Some(status_badge(inv.status, kind_of(inv.status)).upcast()),
    ));
    let meta = gtk::Box::new(gtk::Orientation::Horizontal, 24);
    let to = gtk::Box::new(gtk::Orientation::Vertical, 0);
    to.set_hexpand(true);
    to.append(&label("BILL TO", &["eyebrow"]));
    to.append(&label(inv.client, &[]));
    let dates = gtk::Box::new(gtk::Orientation::Vertical, 0);
    dates.append(&label(&format!("ISSUED  {}", inv.issued), &["mono"]));
    dates.append(&label(&format!("DUE     {}", inv.due), &["mono"]));
    meta.append(&to);
    meta.append(&dates);
    p.append(&meta);
    let t = card();
    t.append(&head_row(&[
        ("Description", 0, true, false),
        ("Qty", 6, false, true),
        ("Unit", 12, false, true),
        ("Amount", 12, false, true),
    ]));
    for l in sample::INVOICE_LINES {
        t.append(&row_of(&[
            cell(l.desc, &[], 0, true, false).upcast(),
            cell(&l.qty.to_string(), &["mono"], 6, false, true).upcast(),
            cell(l.unit, &["mono"], 12, false, true).upcast(),
            cell(l.amount, &["mono"], 12, false, true).upcast(),
        ]));
    }
    p.append(&t);
    let totals = gtk::Box::new(gtk::Orientation::Vertical, 4);
    totals.set_halign(gtk::Align::End);
    totals.set_size_request(280, -1);
    for (k, v, strong) in [
        ("Subtotal", inv.subtotal, false),
        ("GST (10%)", inv.tax, false),
        ("Total due", inv.total, true),
    ] {
        let r = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        let kl = label(k, if strong { &["strong"] } else { &["muted"] });
        kl.set_hexpand(true);
        r.append(&kl);
        r.append(&label(
            v,
            if strong {
                &["mono", "accent-text"]
            } else {
                &["mono"]
            },
        ));
        totals.append(&r);
    }
    p.append(&totals);
    p
}

/// Documents list with a LaTeX source preview of the selected row. Returns the page and a `select(index)` function.
fn documents(ui: &Rc<Ui>) -> (gtk::Box, Rc<dyn Fn(usize)>) {
    let p = page_box();
    p.append(&page_head(
        ui,
        "Documents",
        "Letters, resumes, notes and PDFs",
        None,
    ));
    p.append(&label("Templates are the jupiter-* LaTeX classes; PDFs are their compiled output. Click a row to preview its source.", &["muted"]));
    let t = card();
    let rows: Rc<RefCell<Vec<gtk::Box>>> = Rc::new(RefCell::new(vec![]));
    let src_title = label("", &["eyebrow"]);
    let src = label("", &["mono", "source"]);
    src.set_selectable(true);
    src.set_wrap(false);
    src.set_ellipsize(gtk::pango::EllipsizeMode::End);
    src.set_max_width_chars(90);
    let select: Rc<dyn Fn(usize)> = {
        let (rows, src_title, src) = (rows.clone(), src_title.clone(), src.clone());
        Rc::new(move |i| {
            for (k, r) in rows.borrow().iter().enumerate() {
                if k == i {
                    r.add_css_class("selected")
                } else {
                    r.remove_css_class("selected")
                }
            }
            src_title.set_text(&format!(
                "LATEX SOURCE: {}",
                sample::DOCUMENTS[i].name.to_uppercase()
            ));
            src.set_text(sample::DOCUMENTS[i].source);
        })
    };
    for (i, d) in sample::DOCUMENTS.iter().enumerate() {
        let icon = ui.icon(
            if d.kind == "PDF" {
                "icon/download"
            } else {
                "icon/file"
            },
            16,
            Tint::Muted,
        );
        let row = row_of(&[
            icon.image.clone().upcast(),
            cell(d.name, &[], 30, false, false).upcast(),
            cell(d.kind, &["mono", "accent-text"], 16, false, false).upcast(),
            cell(d.detail, &["muted"], 0, true, false).upcast(),
        ]);
        let click = gtk::GestureClick::new();
        let sel = select.clone();
        click.connect_pressed(move |_, _, _, _| sel(i));
        row.add_controller(click);
        rows.borrow_mut().push(row.clone());
        t.append(&row);
    }
    p.append(&t);
    p.append(&src_title);
    let pre = card();
    pre.add_css_class("source-card");
    src.set_margin_top(12);
    src.set_margin_bottom(12);
    src.set_margin_start(16);
    src.set_margin_end(16);
    pre.append(&src);
    p.append(&pre);
    select(0);
    (p, select)
}

/// The device topology drawn from each device's uplink: boxes coloured by status joined by elbow connectors.
fn topology(ui: &Rc<Ui>) -> gtk::DrawingArea {
    const ROW: f64 = 34.0;
    const INDENT: f64 = 30.0;
    let da = gtk::DrawingArea::new();
    da.set_content_height((sample::TOPOLOGY.len() as f64 * ROW + 16.0) as i32);
    da.set_hexpand(true);
    let ui2 = ui.clone();
    da.set_draw_func(move |_, cr, _w, _h| {
        let pal = palette(ui2.dark.get());
        let rgb =
            |c: jupiter_theme::Rgb| (c.0 as f64 / 255.0, c.1 as f64 / 255.0, c.2 as f64 / 255.0);
        cr.set_font_size(13.0);
        let mut boxes: Vec<(f64, f64, f64, f64)> = vec![]; // x, y, w, h
        for (i, n) in sample::TOPOLOGY.iter().enumerate() {
            let label = format!("{} ({})", n.name, n.kind);
            let tw = cr.text_extents(&label).map(|e| e.width()).unwrap_or(120.0);
            let (x, y, w, h) = (
                16.0 + n.depth as f64 * INDENT,
                8.0 + i as f64 * ROW,
                tw + 20.0,
                24.0,
            );
            boxes.push((x, y, w, h));
        }
        // connectors first, so the boxes cover their ends
        let (r, g, b) = rgb(pal.text_muted);
        cr.set_source_rgb(r, g, b);
        cr.set_line_width(1.0);
        for (i, n) in sample::TOPOLOGY.iter().enumerate() {
            if n.parent >= 0 {
                let p = boxes[n.parent as usize];
                let c = boxes[i];
                let gx = p.0 + 12.0;
                cr.move_to(gx, p.1 + p.3);
                cr.line_to(gx, c.1 + c.3 / 2.0);
                cr.line_to(c.0, c.1 + c.3 / 2.0);
                let _ = cr.stroke();
            }
        }
        for (n, (x, y, w, h)) in sample::TOPOLOGY.iter().zip(boxes) {
            let (edge, fill) = match n.status {
                "online" => (pal.ok, pal.ok_bg),
                "updating" => (pal.warn, pal.warn_bg),
                _ => (pal.danger, pal.danger_bg),
            };
            let (r, g, b) = rgb(fill);
            cr.set_source_rgb(r, g, b);
            cr.rectangle(x, y, w, h);
            let _ = cr.fill();
            let (r, g, b) = rgb(edge);
            cr.set_source_rgb(r, g, b);
            cr.rectangle(x + 0.5, y + 0.5, w - 1.0, h - 1.0);
            let _ = cr.stroke();
            let (r, g, b) = rgb(pal.text);
            cr.set_source_rgb(r, g, b);
            cr.move_to(x + 10.0, y + 16.5);
            let _ = cr.show_text(&format!("{} ({})", n.name, n.kind));
        }
    });
    let da2 = da.clone();
    ui.on_scheme
        .borrow_mut()
        .push(Box::new(move |_| da2.queue_draw()));
    da
}

fn network(ui: &Rc<Ui>) -> gtk::Box {
    let p = page_box();
    p.append(&page_head(
        ui,
        "Network",
        "VLANs, devices and firewall",
        None,
    ));
    let topo = card();
    topo.append(&head_row(&[(
        "Topology (from each device's uplink)",
        0,
        true,
        false,
    )]));
    topo.append(&topology(ui));
    p.append(&topo);
    let v = card();
    v.append(&head_row(&[
        ("VLAN", 5, false, false),
        ("Name", 14, false, false),
        ("Subnet", 16, false, false),
        ("Purpose", 0, true, false),
        ("Mode", 10, false, true),
    ]));
    for x in sample::VLANS {
        v.append(&row_of(&[
            cell(&x.vid.to_string(), &["mono"], 5, false, false).upcast(),
            cell(x.name, &[], 14, false, false).upcast(),
            cell(x.subnet, &["mono"], 16, false, false).upcast(),
            cell(x.purpose, &["muted"], 0, true, false).upcast(),
            cell(
                if x.isolated { "isolated" } else { "routed" },
                &["mono"],
                10,
                false,
                true,
            )
            .upcast(),
        ]));
    }
    p.append(&v);
    let d = card();
    d.append(&head_row(&[
        ("Device", 0, true, false),
        ("Kind", 9, false, false),
        ("Address", 13, false, false),
        ("Uptime", 7, false, true),
        ("Status", 10, false, false),
    ]));
    for x in sample::DEVICES {
        d.append(&row_of(&[
            cell(x.name, &[], 0, true, false).upcast(),
            cell(x.kind, &["muted"], 9, false, false).upcast(),
            cell(x.ip, &["mono"], 13, false, false).upcast(),
            cell(&format!("{} d", x.uptime_days), &["mono"], 7, false, true).upcast(),
            status_badge(x.status, kind_of(x.status)).upcast(),
        ]));
    }
    p.append(&d);
    let f = card();
    f.append(&head_row(&[
        ("Firewall rule", 0, true, false),
        ("Action", 7, false, false),
        ("Proto/port", 12, false, false),
        ("Hits", 8, false, true),
        ("State", 5, false, true),
    ]));
    for x in sample::FIREWALL {
        f.append(&row_of(&[
            cell(x.name, &[], 0, true, false).upcast(),
            cell(
                x.action,
                &["mono", if x.action == "Allow" { "good" } else { "bad" }],
                7,
                false,
                false,
            )
            .upcast(),
            cell(
                &format!("{}/{}", x.proto, x.port),
                &["mono"],
                12,
                false,
                false,
            )
            .upcast(),
            cell(&x.hits.to_string(), &["mono"], 8, false, true).upcast(),
            cell(
                if x.enabled { "on" } else { "off" },
                &["mono", "muted"],
                5,
                false,
                true,
            )
            .upcast(),
        ]));
    }
    p.append(&f);
    p
}

/// One settings row: title, hint and a switch. Returns the switch so other controls can mirror it.
fn setting(title: &str, hint: &str, on: bool) -> (gtk::Box, gtk::Switch, gtk::Label) {
    let r = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    r.add_css_class("row");
    let text = gtk::Box::new(gtk::Orientation::Vertical, 2);
    text.set_hexpand(true);
    text.append(&label(title, &["strong"]));
    let h = label(hint, &["muted"]);
    text.append(&h);
    let sw = gtk::Switch::new();
    sw.set_valign(gtk::Align::Center);
    sw.set_active(on);
    r.append(&text);
    r.append(&sw);
    (r, sw, h)
}

struct SettingsPage {
    page: gtk::Box,
    dark: gtk::Switch,
    compact: gtk::Switch,
    resolved: gtk::Switch,
}

fn density_hint(compact: bool) -> String {
    let d = if compact {
        &density::COMPACT
    } else {
        &density::COMFORTABLE
    };
    format!(
        "Control height {} px, cell padding {} px, page padding {} px (the density tokens).",
        d.control, d.cell_y, d.pad
    )
}

fn settings(ui: &Rc<Ui>) -> SettingsPage {
    let p = page_box();
    p.append(&page_head(ui, "Settings", "Appearance and behaviour", None));
    let t = card();
    let (r1, dark, _) = setting(
        "Dark theme",
        "Switches every colour token to its dark value.",
        ui.dark.get(),
    );
    let (r2, compact, hint) = setting(
        "Compact density",
        &density_hint(ui.compact.get()),
        ui.compact.get(),
    );
    let (r3, resolved, _) = setting(
        "Show resolved incidents",
        "When off, the Alerts page lists only open incidents and live rules.",
        ui.show_resolved.get(),
    );
    for r in [&r1, &r2, &r3] {
        t.append(r);
    }
    {
        let ui = ui.clone();
        compact.connect_active_notify(move |s| {
            ui.apply_density(s.is_active());
            hint.set_text(&density_hint(s.is_active()));
        });
    }
    {
        let ui = ui.clone();
        resolved.connect_active_notify(move |s| {
            ui.show_resolved.set(s.is_active());
            for w in ui.resolved_rows.borrow().iter() {
                w.set_visible(s.is_active());
            }
        });
    }
    p.append(&t);
    SettingsPage {
        page: p,
        dark,
        compact,
        resolved,
    }
}

struct Args {
    dark: bool,
    compact: bool,
    hide_resolved: bool,
    page: String,
    toggles: Vec<String>,
    /// documents: preview this row; tables: `row,col,text` edits (col 0 client, 1 status, 2 total) applied through the cell's own entry
    select: Option<usize>,
    edits: Vec<(usize, usize, String)>,
    shot: Option<String>,
}

fn build(app: &gtk::Application, a: &Args) {
    let ui = Rc::new(Ui {
        theme: gtk::CssProvider::new(),
        density: gtk::CssProvider::new(),
        icons: RefCell::new(vec![]),
        dark: Cell::new(a.dark),
        compact: Cell::new(a.compact),
        show_resolved: Cell::new(!a.hide_resolved),
        on_scheme: RefCell::new(vec![]),
        resolved_rows: RefCell::new(vec![]),
    });
    let display = gdk::Display::default().expect("display");
    gtk::style_context_add_provider_for_display(
        &display,
        &ui.theme,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
    let widgets = gtk::CssProvider::new();
    widgets.load_from_string(WIDGETS_CSS);
    gtk::style_context_add_provider_for_display(
        &display,
        &widgets,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
    let app_css = gtk::CssProvider::new();
    app_css.load_from_string(APP_CSS);
    gtk::style_context_add_provider_for_display(
        &display,
        &app_css,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION + 1,
    );
    gtk::style_context_add_provider_for_display(
        &display,
        &ui.density,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION + 2,
    );
    ui.apply_density(a.compact);

    let win = gtk::ApplicationWindow::new(app);
    win.set_title(Some("Jupiter design system: GTK4 demo"));
    win.set_default_size(1180, 860);
    let root = gtk::Box::new(gtk::Orientation::Horizontal, 0);

    // ---- pages
    let stack = gtk::Stack::new();
    let settings_page = settings(&ui);
    stack.add_named(&overview(&ui), Some("overview"));
    stack.add_named(&metrics(&ui), Some("metrics"));
    stack.add_named(&alerts(&ui), Some("alerts"));
    let (tables_page, table_ctx) = tables(&ui);
    stack.add_named(&tables_page, Some("tables"));
    stack.add_named(&invoice(&ui), Some("invoice"));
    let (docs_page, select_doc) = documents(&ui);
    stack.add_named(&docs_page, Some("documents"));
    stack.add_named(&network(&ui), Some("network"));
    stack.add_named(&settings_page.page, Some("settings"));
    let start = PAGES
        .iter()
        .position(|(id, _, _)| *id == a.page)
        .unwrap_or_else(|| {
            eprintln!(
                "unknown page {}; one of: {}",
                a.page,
                PAGES.iter().map(|p| p.0).collect::<Vec<_>>().join(", ")
            );
            std::process::exit(2);
        });
    stack.set_visible_child_name(PAGES[start].0);

    // ---- sidebar
    let side = gtk::Box::new(gtk::Orientation::Vertical, 4);
    side.add_css_class("sidebar");
    side.set_size_request(220, -1);
    side.set_hexpand(false); // children are hexpand; keep the sidebar at its width
    let brand = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    brand.set_margin_bottom(16);
    brand.append(&ui.icon("icon/sparkle", 22, Tint::Accent).image);
    brand.append(&label("jupiter /ds", &["brand"]));
    side.append(&brand);
    let navs: Rc<RefCell<Vec<(gtk::Button, Rc<Themed>)>>> = Rc::new(RefCell::new(vec![]));
    for (i, (_, name, icon)) in PAGES.iter().enumerate() {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 10);
        let ic = ui.icon(
            icon,
            18,
            if i == start {
                Tint::OnAccent
            } else {
                Tint::Text
            },
        );
        row.append(&ic.image);
        row.append(&gtk::Label::new(Some(name)));
        let b = gtk::Button::new();
        b.set_child(Some(&row));
        b.add_css_class("nav");
        if i == start {
            b.add_css_class("active");
        }
        navs.borrow_mut().push((b.clone(), ic));
        side.append(&b);
    }
    {
        let all = navs.borrow().clone();
        for (i, (b, _)) in all.iter().enumerate() {
            let (ui, all2, me, stack) = (ui.clone(), navs.clone(), b.clone(), stack.clone());
            b.connect_clicked(move |_| {
                stack.set_visible_child_name(PAGES[i].0);
                for (btn, ic) in all2.borrow().iter() {
                    let active = *btn == me;
                    if active {
                        btn.add_css_class("active")
                    } else {
                        btn.remove_css_class("active")
                    }
                    ic.tint
                        .set(if active { Tint::OnAccent } else { Tint::Text });
                    ui.paint(ic);
                }
            });
        }
    }
    let spacer = gtk::Box::new(gtk::Orientation::Vertical, 0);
    spacer.set_vexpand(true);
    side.append(&spacer);
    let mode = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let mode_icon = ui.icon(
        if a.dark { "icon/moon" } else { "icon/sun" },
        18,
        Tint::Muted,
    );
    let mode_label = label(if a.dark { "Dark" } else { "Light" }, &["mono", "muted"]);
    mode_label.set_hexpand(true);
    let sw = gtk::Switch::new();
    sw.set_active(a.dark);
    mode.append(&mode_icon.image);
    mode.append(&mode_label);
    mode.append(&sw);
    side.append(&mode);
    root.append(&side);

    // Both dark switches (sidebar and Settings) go through one handler and mirror each other.
    for s in [&sw, &settings_page.dark] {
        let ui = ui.clone();
        let (mi, ml) = (mode_icon.clone(), mode_label.clone());
        let others: Vec<gtk::Switch> = [&sw, &settings_page.dark].into_iter().cloned().collect();
        s.connect_active_notify(move |s| {
            let dark = s.is_active();
            if ui.dark.get() == dark && ml.text() == if dark { "Dark" } else { "Light" } {
                return;
            }
            ml.set_text(if dark { "Dark" } else { "Light" });
            let p: &'static str = if dark { "icon/moon" } else { "icon/sun" };
            let hex = palette(dark).text_muted.to_hex();
            mi.image.set_paintable(Some(&render(p, &hex, mi.px, mi.px)));
            ui.apply_scheme(dark);
            for o in &others {
                if o.is_active() != dark {
                    o.set_active(dark);
                }
            }
        });
    }

    let scroller = gtk::ScrolledWindow::new();
    scroller.set_hexpand(true);
    scroller.set_hscrollbar_policy(gtk::PolicyType::Never);
    scroller.set_child(Some(&stack));
    root.append(&scroller);

    win.set_child(Some(&root));
    ui.apply_scheme(a.dark);
    win.present();

    if let Some(i) = a.select {
        select_doc(i.min(sample::DOCUMENTS.len() - 1));
    }
    // `--edit row,col,text`: start the edit on that cell, type into its entry and press Enter (same handlers as the mouse path).
    for (r, c, text) in &a.edits {
        let cell = table_ctx
            .cells
            .borrow()
            .get(*r)
            .map(|row| row[(*c).min(2)].clone());
        if let Some((stack, entry)) = cell {
            if let Some(l) = stack.child_by_name("l") {
                // the label's click gesture is the one place that starts an edit
                stack.set_visible_child_name("e");
                entry.set_text(&text.replace("\\n", ""));
                let _ = l;
                entry.emit_activate();
            }
        }
    }
    // `--toggle dark|compact|resolved` flips the same Settings switches a person would click.
    for t in &a.toggles {
        let sw = match t.as_str() {
            "dark" => &settings_page.dark,
            "compact" => &settings_page.compact,
            "resolved" => &settings_page.resolved,
            other => {
                eprintln!("unknown toggle {other}");
                std::process::exit(2);
            }
        };
        sw.set_active(!sw.is_active());
    }

    if let Some(path) = a.shot.clone() {
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
    let argv: Vec<String> = std::env::args().collect();
    let val = |f: &str| {
        argv.iter()
            .position(|a| a == f)
            .and_then(|i| argv.get(i + 1).cloned())
    };
    let args = Rc::new(Args {
        dark: argv.iter().any(|a| a == "--dark"),
        compact: argv.iter().any(|a| a == "--compact"),
        hide_resolved: argv.iter().any(|a| a == "--hide-resolved"),
        page: val("--page")
            .unwrap_or_else(|| "overview".into())
            .to_lowercase(),
        toggles: argv
            .windows(2)
            .filter(|w| w[0] == "--toggle")
            .map(|w| w[1].clone())
            .collect(),
        select: val("--select").and_then(|v| v.parse().ok()),
        edits: argv
            .windows(2)
            .filter(|w| w[0] == "--edit")
            .filter_map(|w| {
                let mut it = w[1].splitn(3, ',');
                Some((
                    it.next()?.parse().ok()?,
                    it.next()?.parse().ok()?,
                    it.next()?.to_string(),
                ))
            })
            .collect(),
        shot: val("--screenshot"),
    });
    let app = gtk::Application::builder()
        .application_id("au.jupiter.ds.gtkdemo")
        .flags(gio::ApplicationFlags::NON_UNIQUE)
        .build();
    app.connect_activate(move |a| build(a, &args));
    app.run_with_args::<&str>(&[])
}
