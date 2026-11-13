//! Slint demo: eight pages driven by the generated `Jupiter` token global and the shared sample data.
//!
//!   cargo run -- [--dark] [--compact] [--hide-resolved] [--page overview|metrics|alerts|tables|invoice|documents|network|settings]
//!   cargo run -- --page settings --dark --screenshot out.png     # render one frame to a PNG and exit
use slint::{ModelRc, SharedString, VecModel};
use std::cell::RefCell;
use std::rc::Rc;

slint::include_modules!();

#[allow(dead_code)]
mod sample {
    include!("../../data/sample.rs");
}

const PAGES: [&str; 8] = ["overview", "metrics", "alerts", "tables", "invoice", "documents", "network", "settings"];

fn s(v: &str) -> SharedString {
    v.into()
}
fn model<T: Clone + 'static>(v: Vec<T>) -> ModelRc<T> {
    ModelRc::from(Rc::new(VecModel::from(v)))
}

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

/// The editable copy of the invoice table; the Slint model is always rebuilt from it, sorted.
#[derive(Clone)]
struct InvRow {
    src: &'static sample::Invoice,
    client: String,
    status: String,
    cents: i64,
}
type Rows = Rc<RefCell<Vec<InvRow>>>;
const STATUSES: [&str; 5] = ["draft", "sent", "overdue", "paid", "void"];

fn initial_rows() -> Rows {
    Rc::new(RefCell::new(sample::INVOICES.iter().map(|i| InvRow { src: i, client: i.client.to_string(), status: i.status.to_string(), cents: i.total_cents }).collect()))
}

fn sorted_invoices(rows: &Rows, col: i32) -> Vec<Invoice> {
    let mut v = rows.borrow().clone();
    match col {
        0 => v.sort_by_key(|i| i.src.number),
        1 => v.sort_by_key(|i| i.client.clone()),
        2 => v.sort_by_key(|i| -i.cents),
        _ => v.sort_by_key(|i| i.status.clone()),
    }
    v.into_iter()
        .map(|i| Invoice { number: s(i.src.number), client: s(&i.client), issued: s(i.src.issued), due: s(i.src.due), status: s(&i.status), subtotal: s(i.src.subtotal), tax: s(i.src.tax), total: s(&money(i.cents)) })
        .collect()
}

/// Validate and apply one cell edit; returns an error message or "".
fn apply_edit(rows: &Rows, number: &str, col: i32, text: &str) -> String {
    let text = text.trim();
    let mut rows = rows.borrow_mut();
    let Some(r) = rows.iter_mut().find(|r| r.src.number == number) else { return "Unknown invoice".into() };
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

fn invoice_row(i: &sample::Invoice) -> Invoice {
    Invoice { number: s(i.number), client: s(i.client), issued: s(i.issued), due: s(i.due), status: s(i.status), subtotal: s(i.subtotal), tax: s(i.tax), total: s(i.total) }
}

fn fill(data: &Data<'_>, rows: &Rows) {
    data.set_as_of(s(sample::AS_OF));
    data.set_services(model(
        sample::SERVICES
            .iter()
            .map(|x| Service {
                name: s(x.name),
                owner: s(x.owner),
                uptime: s(&format!("{:.3}%", x.uptime)),
                p95: s(&if x.p95 == 0 { "-".to_string() } else { format!("{} ms", x.p95) }),
                status: s(x.status),
                budget: x.budget_used_pct as i32,
            })
            .collect(),
    ));
    // one latency series per service, in the same order as sample::SERVICES (the Metrics page pairs them by index)
    let keys = ["api", "media", "ha", "pxe", "wg", "dns"];
    data.set_latency(model(
        keys.iter()
            .map(|k| {
                let m = sample::METRICS.iter().find(|m| m.svc == *k && m.metric == "latency").expect("latency series");
                let max = m.points.iter().cloned().fold(1.0_f32, f32::max);
                Series { name: s(sample::SERVICES[keys.iter().position(|x| x == k).unwrap()].name), last: s(&m.last.to_string()), max: s(&m.max.to_string()), bars: model(m.points.iter().map(|p| p / max).collect()) }
            })
            .collect(),
    ));
    data.set_alerts(model(sample::ALERTS.iter().map(|a| Alert { id: s(a.id), title: s(a.title), svc: s(a.svc), sev: s(&a.sev.to_string()), state: s(a.state), duration: s(a.duration) }).collect()));
    data.set_invoices(model(sorted_invoices(rows, 0)));
    data.set_invoice(invoice_row(&sample::INVOICES[0]));
    data.set_lines(model(sample::INVOICE_LINES.iter().map(|l| Line { desc: s(l.desc), qty: s(&l.qty.to_string()), unit: s(l.unit), amount: s(l.amount) }).collect()));
    data.set_documents(model(sample::DOCUMENTS.iter().map(|d| Doc { name: s(d.name), kind: s(d.kind), detail: s(d.detail), source: s(d.source) }).collect()));
    data.set_topology(model(
        sample::TOPOLOGY
            .iter()
            .enumerate()
            .map(|(i, n)| {
                let is_last = |idx: usize| !sample::TOPOLOGY[idx + 1..].iter().any(|m| m.parent == sample::TOPOLOGY[idx].parent);
                // one guide per ancestor level below the root: does that ancestor still have siblings after it?
                let mut guides = vec![];
                let mut cur = n.parent;
                while cur >= 0 {
                    guides.push(!is_last(cur as usize));
                    cur = sample::TOPOLOGY[cur as usize].parent;
                }
                guides.pop(); // the root has no guide column
                guides.reverse();
                Node { name: s(n.name), kind: s(n.kind), status: s(n.status), depth: n.depth as i32, last: is_last(i), guides: model(guides) }
            })
            .collect(),
    ));
    data.set_vlans(model(sample::VLANS.iter().map(|v| Vlan { vid: s(&v.vid.to_string()), name: s(v.name), subnet: s(v.subnet), purpose: s(v.purpose), mode: s(if v.isolated { "isolated" } else { "routed" }) }).collect()));
    data.set_devices(model(sample::DEVICES.iter().map(|d| Device { name: s(d.name), kind: s(d.kind), ip: s(d.ip), uptime: s(&format!("{} d", d.uptime_days)), status: s(d.status) }).collect()));
    data.set_firewall(model(sample::FIREWALL.iter().map(|r| Fw { name: s(r.name), action: s(r.action), proto: s(&format!("{}/{}", r.proto, r.port)), hits: s(&r.hits.to_string()), state: s(if r.enabled { "on" } else { "off" }) }).collect()));
    let up = sample::SERVICES.iter().map(|x| x.uptime).sum::<f32>() / sample::SERVICES.len() as f32;
    data.set_avg_uptime(s(&format!("{up:.2}%")));
    data.set_open_count(s(&sample::ALERTS.iter().filter(|a| a.kind == "incident" && a.state == "open").count().to_string()));
    data.set_firing_count(s(&sample::ALERTS.iter().filter(|a| a.state == "firing").count().to_string()));
}

fn main() {
    let ui = App::new().expect("create window");
    let args: Vec<String> = std::env::args().collect();
    let flag = |f: &str| args.iter().any(|a| a == f);
    ui.global::<Jupiter>().set_dark(flag("--dark"));
    ui.global::<Jupiter>().set_compact(flag("--compact"));
    let data = ui.global::<Data>();
    let rows = initial_rows();
    fill(&data, &rows);
    data.set_show_resolved(!flag("--hide-resolved"));
    {
        let (weak, rows) = (ui.as_weak(), rows.clone());
        data.on_sort(move |col| {
            if let Some(ui) = weak.upgrade() {
                let d = ui.global::<Data>();
                d.set_sort_col(col);
                d.set_invoices(model(sorted_invoices(&rows, col)));
            }
        });
    }
    {
        let (weak, rows) = (ui.as_weak(), rows.clone());
        data.on_edit_commit(move |number, col, text| {
            let err = apply_edit(&rows, &number, col, &text);
            if err.is_empty() {
                if let Some(ui) = weak.upgrade() {
                    let d = ui.global::<Data>();
                    d.set_invoices(model(sorted_invoices(&rows, d.get_sort_col())));
                }
            }
            s(&err)
        });
    }
    if let Some(i) = args.iter().position(|a| a == "--page") {
        let name = args.get(i + 1).map(|x| x.to_lowercase()).unwrap_or_default();
        match PAGES.iter().position(|p| *p == name) {
            Some(n) => ui.set_page(n as i32),
            None => {
                eprintln!("unknown page {name}; one of: {}", PAGES.join(", "));
                std::process::exit(2);
            }
        }
    }

    // `--click x,y` sends a real pointer press and release; `--type text` sends key presses (use $'\n' for Enter and
    // $'\e' for Escape). Both are repeatable and run in command-line order, so a whole editing session can be scripted
    // before the screenshot without a person at the keyboard.
    enum Act {
        Click(f32, f32),
        Key(char),
    }
    let mut acts: Vec<Act> = vec![];
    for w in args.windows(2) {
        match w[0].as_str() {
            "--click" => {
                if let Some((x, y)) = w[1].split_once(',').and_then(|(x, y)| Some((x.parse().ok()?, y.parse().ok()?))) {
                    acts.push(Act::Click(x, y));
                }
            }
            "--type" => acts.extend(w[1].chars().map(Act::Key)),
            _ => {}
        }
    }
    let n_acts = acts.len() as u64;
    for (n, act) in acts.into_iter().enumerate() {
        let weak = ui.as_weak();
        slint::Timer::single_shot(std::time::Duration::from_millis(250 + 150 * n as u64), move || {
            let Some(ui) = weak.upgrade() else { return };
            let w = ui.window();
            match act {
                Act::Click(x, y) => {
                    let position = slint::LogicalPosition::new(x, y);
                    w.dispatch_event(slint::platform::WindowEvent::PointerMoved { position });
                    w.dispatch_event(slint::platform::WindowEvent::PointerPressed { position, button: slint::platform::PointerEventButton::Left });
                    w.dispatch_event(slint::platform::WindowEvent::PointerReleased { position, button: slint::platform::PointerEventButton::Left });
                }
                Act::Key(ch) => {
                    let t = SharedString::from(ch.to_string());
                    w.dispatch_event(slint::platform::WindowEvent::KeyPressed { text: t.clone() });
                    w.dispatch_event(slint::platform::WindowEvent::KeyReleased { text: t });
                }
            }
        });
    }
    let settle = 250 + 150 * n_acts + 500;

    // `--screenshot out.png` renders one frame to a file and exits (handy for CI and visual diffs).
    if let Some(i) = args.iter().position(|a| a == "--screenshot") {
        let path = args.get(i + 1).cloned().unwrap_or_else(|| "slint-demo.png".into());
        let weak = ui.as_weak();
        slint::Timer::single_shot(std::time::Duration::from_millis(settle.max(800)), move || {
            if let Some(ui) = weak.upgrade() {
                let shot = ui.window().take_snapshot().expect("snapshot");
                image::save_buffer(&path, shot.as_bytes(), shot.width(), shot.height(), image::ColorType::Rgba8).expect("write png");
                println!("wrote {path} ({}x{})", shot.width(), shot.height());
            }
            slint::quit_event_loop().ok();
        });
    }
    ui.run().expect("run");
}
