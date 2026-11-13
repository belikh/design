//! A runnable terminal dashboard themed only from the `jupiter-theme` tokens (palette, `Theme`, density).
//!
//!   cargo run --features ratatui --example tui_dashboard                 # interactive
//!   cargo run --features ratatui --example tui_dashboard -- --dump metrics --light --compact
//!                                                                         # one frame as text, no TTY needed
//!
//! Pages: 1 Overview, 2 Metrics, 3 Alerts, 4 Tables, 5 Invoice, 6 Documents, 7 Network, 8 Settings.
//! Keys: Tab / 1-6 page, Up / Down select, Space / Enter toggle a setting, t theme, d density, r resolved, s sort, q quit.
//! The data is `examples/data/sample.rs`, generated from the same fixtures as the web dashboards.
use jupiter_theme::density;
use jupiter_theme::tui::Theme;
use ratatui::{
    crossterm::event::{self, Event, KeyCode, KeyEventKind},
    layout::{Constraint, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{
        Block, Cell, Gauge, List, ListItem, ListState, Paragraph, Row, Sparkline, Table, TableState,
    },
    Frame,
};

#[allow(dead_code)]
mod sample {
    include!("../../../examples/data/sample.rs");
}
use sample::*;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Page {
    Overview,
    Metrics,
    Alerts,
    Tables,
    Invoice,
    Documents,
    Network,
    Settings,
}
const PAGES: [(Page, &str); 8] = [
    (Page::Overview, "Overview"),
    (Page::Metrics, "Metrics"),
    (Page::Alerts, "Alerts"),
    (Page::Tables, "Tables"),
    (Page::Invoice, "Invoice"),
    (Page::Documents, "Documents"),
    (Page::Network, "Network"),
    (Page::Settings, "Settings"),
];
const SETTINGS: [&str; 3] = ["Dark theme", "Compact density", "Show resolved incidents"];
const SORTS: [&str; 4] = ["number", "client", "total", "status"];

pub struct App {
    pub page: Page,
    pub dark: bool,
    pub compact: bool,
    pub show_resolved: bool,
    pub sort: usize,
    pub row: usize,
    pub quit: bool,
    /// Editable copy of the invoice table (the sample consts are read-only).
    pub rows: Vec<InvRow>,
    /// Selected editable column on the Tables page: 0 client (text), 1 status (choice), 2 total (number).
    pub col: usize,
    pub edit: Option<Edit>,
    pub error: Option<String>,
}

#[derive(Clone, Debug)]
pub struct InvRow {
    pub number: &'static str,
    pub client: String,
    pub issued: &'static str,
    pub due: &'static str,
    pub status: String,
    pub cents: i64,
}

#[derive(Clone, Debug)]
pub struct Edit {
    pub buf: String,
}

const STATUSES: [&str; 5] = ["draft", "sent", "overdue", "paid", "void"];

fn money(c: i64) -> String {
    let (d, r) = (c / 100, c % 100);
    let s = d.to_string();
    let mut out = String::new();
    for (i, ch) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    format!("${out}.{r:02}")
}

/// Tree prefix ("|-", "`-" with guide lines) for each topology node, drawn from the uplinks.
fn tree_lines() -> Vec<String> {
    TOPOLOGY
        .iter()
        .enumerate()
        .map(|(i, n)| {
            let is_last = |idx: usize| {
                !TOPOLOGY[idx + 1..]
                    .iter()
                    .any(|m| m.parent == TOPOLOGY[idx].parent)
            };
            let mut guides = vec![];
            let mut cur = n.parent;
            while cur >= 0 {
                guides.push(if is_last(cur as usize) {
                    "   "
                } else {
                    "\u{2502}  "
                });
                cur = TOPOLOGY[cur as usize].parent;
            }
            guides.reverse();
            let branch = if n.depth == 0 {
                ""
            } else if is_last(i) {
                "\u{2514}\u{2500} "
            } else {
                "\u{251c}\u{2500} "
            };
            // the root has no guide column of its own
            let g: String = guides.iter().skip(1).copied().collect();
            format!("{g}{branch}{} ({})", n.name, n.kind)
        })
        .collect()
}

impl App {
    pub fn new(dark: bool, compact: bool) -> Self {
        App {
            rows: INVOICES
                .iter()
                .map(|i| InvRow {
                    number: i.number,
                    client: i.client.to_string(),
                    issued: i.issued,
                    due: i.due,
                    status: i.status.to_string(),
                    cents: i.total_cents,
                })
                .collect(),
            col: 0,
            edit: None,
            error: None,
            page: Page::Overview,
            dark,
            compact,
            show_resolved: true,
            sort: 0,
            row: 0,
            quit: false,
        }
    }
    fn theme(&self) -> Theme {
        if self.dark {
            Theme::dark()
        } else {
            Theme::light()
        }
    }
    /// Token-driven row spacing: the density preset's cell padding decides whether rows get a blank line.
    fn row_margin(&self) -> u16 {
        let d = if self.compact {
            &density::COMPACT
        } else {
            &density::COMFORTABLE
        };
        u16::from(d.cell_y >= 8.0)
    }
    fn page_len(&self) -> usize {
        match self.page {
            Page::Alerts => self.alerts().len(),
            Page::Tables => INVOICES.len(),
            Page::Invoice => INVOICE_LINES.len(),
            Page::Documents => DOCUMENTS.len(),
            Page::Network => VLANS.len() + DEVICES.len(),
            Page::Settings => SETTINGS.len(),
            _ => SERVICES.len(),
        }
    }
    fn alerts(&self) -> Vec<&'static Alert> {
        ALERTS
            .iter()
            .filter(|a| self.show_resolved || a.state != "resolved")
            .collect()
    }
    pub fn invoices(&self) -> Vec<&InvRow> {
        let mut v: Vec<&InvRow> = self.rows.iter().collect();
        match self.sort {
            0 => v.sort_by_key(|i| i.number),
            1 => v.sort_by_key(|i| i.client.clone()),
            2 => v.sort_by_key(|i| -i.cents),
            _ => v.sort_by_key(|i| i.status.clone()),
        }
        v
    }
    fn commit(&mut self) {
        let Some(e) = self.edit.take() else { return };
        let number = self.invoices()[self.row.min(self.rows.len() - 1)].number;
        let row = self
            .rows
            .iter_mut()
            .find(|r| r.number == number)
            .expect("row");
        let text = e.buf.trim();
        let res: Result<(), String> = match self.col {
            0 if text.is_empty() => Err("Client is required".into()),
            0 => {
                row.client = text.to_string();
                Ok(())
            }
            1 if STATUSES.contains(&text) => {
                row.status = text.to_string();
                Ok(())
            }
            1 => Err(format!("Status must be one of {}", STATUSES.join(", "))),
            _ => match text.trim_start_matches('$').replace(',', "").parse::<f64>() {
                Ok(v) if v > 0.0 && v < 1e9 => {
                    row.cents = (v * 100.0).round() as i64;
                    Ok(())
                }
                _ => Err("Total must be a positive number".into()),
            },
        };
        match res {
            Ok(()) => self.error = None,
            Err(m) => {
                self.error = Some(m);
                self.edit = Some(e); // stay in edit mode, like the web table, until valid or cancelled
            }
        }
    }
    fn edit_key(&mut self, k: KeyCode) {
        match k {
            KeyCode::Esc => {
                self.edit = None;
                self.error = None;
            }
            KeyCode::Enter => self.commit(),
            KeyCode::Backspace => {
                if let Some(e) = &mut self.edit {
                    e.buf.pop();
                }
            }
            KeyCode::Up | KeyCode::Down if self.col == 1 => {
                if let Some(e) = &mut self.edit {
                    let i = STATUSES.iter().position(|s| *s == e.buf).unwrap_or(0);
                    let n = if k == KeyCode::Down {
                        (i + 1) % STATUSES.len()
                    } else {
                        (i + STATUSES.len() - 1) % STATUSES.len()
                    };
                    e.buf = STATUSES[n].to_string();
                }
            }
            KeyCode::Char(c) => {
                if let Some(e) = &mut self.edit {
                    e.buf.push(c);
                }
            }
            _ => {}
        }
    }
    fn toggle(&mut self, i: usize) {
        match i {
            0 => self.dark = !self.dark,
            1 => self.compact = !self.compact,
            _ => self.show_resolved = !self.show_resolved,
        }
    }
    fn go(&mut self, p: Page) {
        self.page = p;
        self.row = 0;
    }
    pub fn on_key(&mut self, k: KeyCode) {
        if self.edit.is_some() {
            return self.edit_key(k);
        }
        if self.page == Page::Tables {
            match k {
                KeyCode::Left | KeyCode::Char('h') => return self.col = self.col.saturating_sub(1),
                KeyCode::Right | KeyCode::Char('l') => return self.col = (self.col + 1).min(2),
                KeyCode::Enter | KeyCode::Char('e') => {
                    let r = self.invoices()[self.row.min(self.rows.len() - 1)];
                    let buf = match self.col {
                        0 => r.client.clone(),
                        1 => r.status.clone(),
                        _ => format!("{:.2}", r.cents as f64 / 100.0),
                    };
                    self.edit = Some(Edit { buf });
                    return;
                }
                _ => {}
            }
        }
        let idx = PAGES.iter().position(|(p, _)| *p == self.page).unwrap_or(0);
        match k {
            KeyCode::Char('q') | KeyCode::Esc => self.quit = true,
            KeyCode::Tab => self.go(PAGES[(idx + 1) % PAGES.len()].0),
            KeyCode::BackTab => self.go(PAGES[(idx + PAGES.len() - 1) % PAGES.len()].0),
            KeyCode::Char(c @ '1'..='8') => self.go(PAGES[c as usize - '1' as usize].0),
            KeyCode::Down | KeyCode::Char('j') => {
                self.row = (self.row + 1).min(self.page_len().saturating_sub(1))
            }
            KeyCode::Up | KeyCode::Char('k') => self.row = self.row.saturating_sub(1),
            KeyCode::Char('t') => self.toggle(0),
            KeyCode::Char('d') => self.toggle(1),
            KeyCode::Char('r') => self.toggle(2),
            KeyCode::Char('s') => self.sort = (self.sort + 1) % SORTS.len(),
            KeyCode::Enter | KeyCode::Char(' ') if self.page == Page::Settings => {
                self.toggle(self.row)
            }
            _ => {}
        }
    }
}

fn badge(t: &Theme, status: &str) -> Span<'static> {
    let (style, text) = match status {
        "ok" | "online" | "resolved" | "paid" => (t.badge_ok(), status),
        "warn" | "updating" | "disabled" | "sent" | "firing" => (
            t.badge_warn(),
            if status == "warn" { "degraded" } else { status },
        ),
        "info" => (t.badge_info(), status),
        _ => (
            t.badge_danger(),
            if status == "danger" { "down" } else { status },
        ),
    };
    Span::styled(format!(" {} ", text.to_uppercase()), style)
}
fn sev(t: &Theme, n: u8) -> Span<'static> {
    Span::styled(
        format!("SEV{n}"),
        match n {
            1 => t.danger(),
            2 => t.warn(),
            _ => t.info(),
        },
    )
}
fn panel(t: &Theme, title: &str) -> Block<'static> {
    Block::bordered()
        .border_style(t.border())
        .style(t.surface())
        .title(Span::styled(format!(" {title} "), t.title()))
}
fn header<'a>(t: &Theme, cols: &[&'a str]) -> Row<'a> {
    Row::new(cols.iter().map(|c| Cell::from(c.to_uppercase()))).style(t.muted())
}
fn select(
    t: &Theme,
    rows: Vec<Row<'static>>,
    widths: Vec<Constraint>,
    head: Row<'static>,
    block: Block<'static>,
    sel: usize,
    margin: u16,
) -> (Table<'static>, TableState) {
    let rows = rows
        .into_iter()
        .map(|r| r.bottom_margin(margin))
        .collect::<Vec<_>>();
    (
        Table::new(rows, widths)
            .header(head)
            .block(block)
            .row_highlight_style(t.selected()),
        TableState::default().with_selected(Some(sel)),
    )
}

pub fn draw(f: &mut Frame, app: &App) {
    let t = app.theme();
    f.render_widget(Block::new().style(t.base()), f.area());
    let [side, main] =
        Layout::horizontal([Constraint::Length(20), Constraint::Min(40)]).areas(f.area());
    let items: Vec<ListItem> = PAGES
        .iter()
        .enumerate()
        .map(|(i, (_, n))| ListItem::new(format!(" {} {n}", i + 1)))
        .collect();
    let cur = PAGES.iter().position(|(p, _)| *p == app.page);
    let mut ls = ListState::default().with_selected(cur);
    f.render_stateful_widget(
        List::new(items)
            .block(panel(&t, "jupiter /ds"))
            .highlight_style(t.selected()),
        side,
        &mut ls,
    );
    let [body, foot] = Layout::vertical([Constraint::Min(5), Constraint::Length(1)]).areas(main);
    let mode = format!(
        "{} / {}",
        if app.dark { "dark" } else { "light" },
        if app.compact {
            "compact"
        } else {
            "comfortable"
        }
    );
    f.render_widget(
        Paragraph::new(format!(
            " q quit  tab page  t theme  d density  r resolved  s sort  [{mode}]"
        ))
        .style(t.muted()),
        foot,
    );
    match app.page {
        Page::Overview => overview(f, body, app, &t),
        Page::Metrics => metrics(f, body, app, &t),
        Page::Alerts => alerts(f, body, app, &t),
        Page::Tables => tables(f, body, app, &t),
        Page::Invoice => invoice(f, body, app, &t),
        Page::Documents => documents(f, body, app, &t),
        Page::Network => network(f, body, app, &t),
        Page::Settings => settings(f, body, app, &t),
    }
}

fn overview(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let [stats, list] = Layout::vertical([Constraint::Length(5), Constraint::Min(5)]).areas(area);
    let up = SERVICES.iter().map(|s| s.uptime).sum::<f32>() / SERVICES.len() as f32;
    let open = ALERTS
        .iter()
        .filter(|a| a.kind == "incident" && a.state == "open")
        .count();
    let firing = ALERTS.iter().filter(|a| a.state == "firing").count();
    let cols = Layout::horizontal([Constraint::Ratio(1, 3); 3]).split(stats);
    for (r, (label, value, st)) in cols.iter().zip([
        ("Uptime (90 d)", format!("{up:.2}%"), t.ok()),
        (
            "Open incidents",
            open.to_string(),
            if open > 0 { t.danger() } else { t.ok() },
        ),
        (
            "Rules firing",
            firing.to_string(),
            if firing > 0 { t.warn() } else { t.ok() },
        ),
    ]) {
        f.render_widget(
            Paragraph::new(vec![
                Line::styled(value, st.add_modifier(ratatui::style::Modifier::BOLD)),
                Line::styled(label.to_uppercase(), t.muted()),
            ])
            .block(panel(t, "Status")),
            *r,
        );
    }
    let rows = SERVICES
        .iter()
        .map(|s| {
            Row::new(vec![
                Cell::from(s.name),
                Cell::from(s.owner),
                Cell::from(format!("{:.3}%", s.uptime)),
                Cell::from(if s.p95 == 0 {
                    "-".to_string()
                } else {
                    format!("{} ms", s.p95)
                }),
                Cell::from(badge(t, s.status)),
            ])
        })
        .collect();
    let (tbl, mut st) = select(
        t,
        rows,
        vec![
            Constraint::Length(18),
            Constraint::Length(16),
            Constraint::Length(10),
            Constraint::Length(9),
            Constraint::Min(10),
        ],
        header(t, &["Service", "Owner", "Uptime", "p95", "Status"]),
        panel(t, "Service status"),
        app.row,
        app.row_margin(),
    );
    f.render_stateful_widget(tbl, list, &mut st);
}

fn metrics(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let block = panel(t, "Latency p95, last 24 h (ms) and error budget used");
    let inner = block.inner(area);
    f.render_widget(block, area);
    let rows = Layout::vertical(vec![Constraint::Length(3); SERVICES.len()]).split(inner);
    for (r, s) in rows.iter().zip(SERVICES.iter()) {
        let [name, spark, gauge] = Layout::horizontal([
            Constraint::Length(22),
            Constraint::Min(20),
            Constraint::Length(24),
        ])
        .areas(*r);
        let m = METRICS
            .iter()
            .find(|m| m.svc == s.name_id() && m.metric == "latency");
        let line = match m {
            Some(m) => format!("{}\nlast {} max {}", s.name, m.last, m.max),
            None => s.name.to_string(),
        };
        f.render_widget(Paragraph::new(line).style(t.base()), name);
        if let Some(m) = m {
            let data: Vec<u64> = m.points.iter().map(|v| v.round() as u64).collect();
            f.render_widget(Sparkline::default().data(data).style(t.accent()), spark);
        }
        let used = (s.budget_used_pct as f64 / 100.0).min(1.0);
        let style = if used >= 1.0 {
            t.danger()
        } else if used > 0.5 {
            t.warn()
        } else {
            t.ok()
        };
        f.render_widget(
            Gauge::default()
                .ratio(used)
                .gauge_style(
                    Style::new()
                        .fg(style.fg.unwrap_or_default())
                        .bg(t.surface().bg.unwrap_or_default()),
                )
                .label(format!("budget {}%", s.budget_used_pct)),
            Rect {
                y: gauge.y + 1,
                height: 1,
                ..gauge
            },
        );
    }
    let _ = app;
}

fn alerts(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let list = app.alerts();
    let rows = list
        .iter()
        .map(|a| {
            Row::new(vec![
                Cell::from(a.id),
                Cell::from(a.title),
                Cell::from(a.svc),
                Cell::from(sev(t, a.sev)),
                Cell::from(badge(t, a.state)),
                Cell::from(a.duration),
            ])
        })
        .collect();
    let title = if app.show_resolved {
        "Alerts and incidents"
    } else {
        "Alerts and incidents (open only)"
    };
    let (tbl, mut st) = select(
        t,
        rows,
        vec![
            Constraint::Length(8),
            Constraint::Min(30),
            Constraint::Length(14),
            Constraint::Length(5),
            Constraint::Length(12),
            Constraint::Length(18),
        ],
        header(t, &["Id", "Title", "Service", "Sev", "State", "Duration"]),
        panel(t, title),
        app.row.min(list.len().saturating_sub(1)),
        app.row_margin(),
    );
    f.render_stateful_widget(tbl, area, &mut st);
}

fn tables(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let rows = app
        .invoices()
        .iter()
        .enumerate()
        .map(|(ri, i)| {
            let editing = |c: usize| ri == app.row && app.col == c;
            let shown = |c: usize, v: String| -> Cell<'static> {
                match (&app.edit, editing(c)) {
                    (Some(e), true) => Cell::from(format!("{}\u{258f}", e.buf)).style(
                        t.accent()
                            .add_modifier(ratatui::style::Modifier::UNDERLINED),
                    ),
                    (None, true) => Cell::from(format!("[{v}]")),
                    _ => Cell::from(v),
                }
            };
            Row::new(vec![
                Cell::from(i.number),
                shown(0, i.client.clone()),
                Cell::from(i.issued),
                Cell::from(i.due),
                if editing(1) {
                    shown(1, i.status.clone())
                } else {
                    Cell::from(badge(t, &i.status))
                },
                shown(2, format!("{:>12}", money(i.cents))),
            ])
        })
        .collect();
    let hint = match (&app.edit, &app.error) {
        (_, Some(e)) => format!("{e} (Enter retry, Esc cancel)"),
        (Some(_), _) => "editing: Enter commit, Esc cancel".to_string(),
        _ => "left/right column, Enter edit".to_string(),
    };
    let title = format!(
        "Invoices (sorted by {}, s to change; {hint})",
        SORTS[app.sort]
    );
    let (tbl, mut st) = select(
        t,
        rows,
        vec![
            Constraint::Length(10),
            Constraint::Min(18),
            Constraint::Length(12),
            Constraint::Length(12),
            Constraint::Length(10),
            Constraint::Length(14),
        ],
        header(t, &["Number", "Client", "Issued", "Due", "Status", "Total"]),
        panel(t, &title),
        app.row,
        app.row_margin(),
    );
    f.render_stateful_widget(tbl, area, &mut st);
}

fn invoice(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let inv = &INVOICES[0];
    let [meta, lines, totals] = Layout::vertical([
        Constraint::Length(5),
        Constraint::Min(INVOICE_LINES.len() as u16 + 3),
        Constraint::Length(6),
    ])
    .areas(area);
    f.render_widget(
        Paragraph::new(vec![
            Line::from(vec![
                Span::styled(format!("Invoice {}  ", inv.number), t.title()),
                badge(t, inv.status),
            ]),
            Line::styled(format!("Bill to {}", inv.client), t.base()),
            Line::styled(
                format!("Issued {}   Due {}", inv.issued, inv.due),
                t.muted(),
            ),
        ])
        .block(panel(t, "Billing")),
        meta,
    );
    let rows = INVOICE_LINES
        .iter()
        .map(|l| {
            Row::new(vec![
                Cell::from(l.desc),
                Cell::from(format!("{:>4}", l.qty)),
                Cell::from(format!("{:>12}", l.unit)),
                Cell::from(format!("{:>12}", l.amount)),
            ])
        })
        .collect();
    let (tbl, mut st) = select(
        t,
        rows,
        vec![
            Constraint::Min(30),
            Constraint::Length(6),
            Constraint::Length(14),
            Constraint::Length(14),
        ],
        header(t, &["Description", "Qty", "Unit", "Amount"]),
        panel(t, "Line items"),
        app.row.min(INVOICE_LINES.len().saturating_sub(1)),
        app.row_margin(),
    );
    f.render_stateful_widget(tbl, lines, &mut st);
    f.render_widget(
        Paragraph::new(vec![
            Line::styled(format!("Subtotal  {:>12}", inv.subtotal), t.base()),
            Line::styled(format!("GST (10%) {:>12}", inv.tax), t.muted()),
            Line::styled(
                format!("Total due {:>12}", inv.total),
                t.accent().add_modifier(ratatui::style::Modifier::BOLD),
            ),
        ])
        .block(panel(t, "Totals")),
        totals,
    );
}

fn documents(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let sel = app.row.min(DOCUMENTS.len().saturating_sub(1));
    let [top, bottom] = Layout::vertical([
        Constraint::Length(DOCUMENTS.len() as u16 + 3),
        Constraint::Min(5),
    ])
    .areas(area);
    let rows = DOCUMENTS
        .iter()
        .map(|d| {
            Row::new(vec![
                Cell::from(d.name),
                Cell::from(d.kind),
                Cell::from(d.detail),
            ])
        })
        .collect();
    let (tbl, mut st) = select(
        t,
        rows,
        vec![
            Constraint::Length(36),
            Constraint::Length(16),
            Constraint::Min(20),
        ],
        header(t, &["Name", "Kind", "Detail"]),
        panel(t, "Templates, letters and PDFs"),
        sel,
        0,
    );
    f.render_stateful_widget(tbl, top, &mut st);
    let d = &DOCUMENTS[sel];
    f.render_widget(
        Paragraph::new(d.source)
            .style(t.base())
            .block(panel(t, &format!("LaTeX source: {}", d.name))),
        bottom,
    );
}

fn network(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let [a, b, c] = Layout::vertical([
        Constraint::Length((TOPOLOGY.len() as u16 + 2).max(VLANS.len() as u16 + 3)),
        Constraint::Length(DEVICES.len() as u16 + 3),
        Constraint::Min(3),
    ])
    .areas(area);
    let [a, topo] =
        Layout::horizontal([Constraint::Percentage(64), Constraint::Percentage(36)]).areas(a);
    let lines: Vec<Line> = tree_lines()
        .into_iter()
        .zip(TOPOLOGY.iter())
        .map(|(l, n)| {
            let st = match n.status {
                "online" => t.ok(),
                "updating" => t.warn(),
                _ => t.danger(),
            };
            Line::styled(l, st)
        })
        .collect();
    f.render_widget(
        Paragraph::new(lines).block(panel(t, "Topology (from uplinks)")),
        topo,
    );
    let vl = VLANS.iter().enumerate().map(|(i, v)| {
        Row::new(vec![
            Cell::from(v.vid.to_string()),
            Cell::from(v.name),
            Cell::from(v.subnet),
            Cell::from(v.purpose),
            Cell::from(if v.isolated { "isolated" } else { "routed" }),
        ])
        .style(if i == app.row { t.selected() } else { t.base() })
    });
    f.render_widget(
        Table::new(
            vl,
            [
                Constraint::Length(6),
                Constraint::Length(14),
                Constraint::Length(18),
                Constraint::Length(12),
                Constraint::Min(8),
            ],
        )
        .header(header(t, &["VLAN", "Name", "Subnet", "Purpose", "Mode"]))
        .block(panel(t, "VLANs")),
        a,
    );
    let dv = DEVICES.iter().map(|d| {
        Row::new(vec![
            Cell::from(d.name),
            Cell::from(d.kind),
            Cell::from(d.ip),
            Cell::from(format!("{} d", d.uptime_days)),
            Cell::from(badge(t, d.status)),
        ])
    });
    f.render_widget(
        Table::new(
            dv,
            [
                Constraint::Length(20),
                Constraint::Length(10),
                Constraint::Length(14),
                Constraint::Length(8),
                Constraint::Min(10),
            ],
        )
        .header(header(
            t,
            &["Device", "Kind", "Address", "Uptime", "Status"],
        ))
        .block(panel(t, "Devices")),
        b,
    );
    let fw = FIREWALL.iter().map(|r| {
        Row::new(vec![
            Cell::from(r.name),
            Cell::from(r.action),
            Cell::from(format!("{}/{}", r.proto, r.port)),
            Cell::from(r.hits.to_string()),
            Cell::from(if r.enabled { "on" } else { "off" }),
        ])
    });
    f.render_widget(
        Table::new(
            fw,
            [
                Constraint::Min(24),
                Constraint::Length(8),
                Constraint::Length(12),
                Constraint::Length(8),
                Constraint::Length(5),
            ],
        )
        .header(header(
            t,
            &["Firewall rule", "Action", "Proto/port", "Hits", "State"],
        ))
        .block(panel(t, "Firewall")),
        c,
    );
}

fn settings(f: &mut Frame, area: Rect, app: &App, t: &Theme) {
    let on = [app.dark, app.compact, app.show_resolved];
    let items: Vec<ListItem> = SETTINGS
        .iter()
        .zip(on)
        .map(|(n, v)| {
            ListItem::new(Line::from(vec![Span::raw(format!(
                " [{}] {n}",
                if v { "x" } else { " " }
            ))]))
        })
        .collect();
    let mut ls = ListState::default().with_selected(Some(app.row));
    f.render_stateful_widget(
        List::new(items)
            .block(panel(t, "Settings (space or enter toggles)"))
            .highlight_style(t.selected()),
        area,
        &mut ls,
    );
}

trait NameId {
    fn name_id(&self) -> &'static str;
}
impl NameId for Service {
    /// The metrics are keyed by the short service id, which the sample derives from the name (`jupiter-api` is `api`).
    fn name_id(&self) -> &'static str {
        METRIC_KEYS
            .iter()
            .find(|(n, _)| *n == self.name)
            .map(|(_, k)| *k)
            .unwrap_or("")
    }
}
const METRIC_KEYS: [(&str, &str); 6] = [
    ("jupiter-api", "api"),
    ("media-archive", "media"),
    ("ha-bridge", "ha"),
    ("pxe-boot", "pxe"),
    ("wg-gateway", "wg"),
    ("dns-resolver", "dns"),
];

/// Render one page to plain text (no TTY): used by `--dump` and the tests.
pub fn render_text(app: &App, w: u16, h: u16) -> (String, ratatui::buffer::Buffer) {
    let mut term =
        ratatui::Terminal::new(ratatui::backend::TestBackend::new(w, h)).expect("terminal");
    term.draw(|f| draw(f, app)).expect("draw");
    let buf = term.backend().buffer().clone();
    let text = (0..h)
        .map(|y| {
            (0..w)
                .map(|x| buf[(x, y)].symbol())
                .collect::<String>()
                .trim_end()
                .to_string()
        })
        .collect::<Vec<_>>()
        .join("\n");
    (text, buf)
}

fn main() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let mut app = App::new(
        !args.iter().any(|a| a == "--light"),
        args.iter().any(|a| a == "--compact"),
    );
    if let Some(i) = args.iter().position(|a| a == "--dump") {
        let name = args
            .get(i + 1)
            .map(|s| s.to_lowercase())
            .unwrap_or_else(|| "overview".into());
        let Some((p, _)) = PAGES.iter().find(|(_, n)| n.to_lowercase() == name) else {
            eprintln!(
                "unknown page {name}; one of: {}",
                PAGES
                    .iter()
                    .map(|(_, n)| n.to_lowercase())
                    .collect::<Vec<_>>()
                    .join(", ")
            );
            std::process::exit(2);
        };
        app.page = *p;
        println!("{}", render_text(&app, 110, 36).0);
        return Ok(());
    }
    let mut term = ratatui::init();
    while !app.quit {
        term.draw(|f| draw(f, &app))?;
        if let Event::Key(k) = event::read()? {
            if k.kind == KeyEventKind::Press {
                app.on_key(k.code);
            }
        }
    }
    ratatui::restore();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use jupiter_theme::{DARK, LIGHT};
    use ratatui::style::Color;

    fn page(p: Page, dark: bool, compact: bool) -> (String, ratatui::buffer::Buffer) {
        let mut a = App::new(dark, compact);
        a.page = p;
        render_text(&a, 110, 40)
    }

    #[test]
    fn every_page_renders_its_sample_data() {
        for (p, needle) in [
            (Page::Overview, "jupiter-api"),
            (Page::Metrics, "last "),
            (Page::Alerts, "INC-107"),
            (Page::Tables, "INV-0042"),
            (Page::Invoice, "Total due"),
            (Page::Documents, "documentclass"),
            (Page::Network, "Topology"),
            (Page::Settings, "Compact density"),
        ] {
            let (text, _) = page(p, true, false);
            assert!(text.contains(needle), "{p:?} is missing {needle}:\n{text}");
        }
        assert!(page(Page::Network, true, false).0.contains(DEVICES[0].name));
        assert!(page(Page::Alerts, true, false)
            .0
            .contains(ALERTS.iter().find(|a| a.kind == "rule").unwrap().svc));
    }

    #[test]
    fn colours_come_from_the_tokens() {
        let (_, dark) = page(Page::Overview, true, false);
        let (_, light) = page(Page::Overview, false, false);
        assert_eq!(dark[(100, 39)].bg, Color::from(DARK.bg));
        assert_eq!(dark[(60, 20)].bg, Color::from(DARK.surface));
        assert_eq!(light[(100, 39)].bg, Color::from(LIGHT.bg));
        // the selected nav entry uses the accent
        assert_eq!(dark[(2, 1)].bg, Color::from(DARK.accent));
    }

    #[test]
    fn metrics_page_draws_sparklines() {
        let (text, _) = page(Page::Metrics, true, false);
        assert!(
            text.chars().any(|c| ('\u{2581}'..='\u{2588}').contains(&c)),
            "no sparkline bars:\n{text}"
        );
        assert!(text.contains("budget"));
    }

    #[test]
    fn settings_toggle_theme_density_and_filter() {
        let mut a = App::new(true, false);
        a.on_key(KeyCode::Char('8'));
        assert_eq!(a.page, Page::Settings);
        a.on_key(KeyCode::Char(' '));
        assert!(!a.dark);
        a.on_key(KeyCode::Down);
        a.on_key(KeyCode::Enter);
        assert!(a.compact);
        a.on_key(KeyCode::Down);
        a.on_key(KeyCode::Char(' '));
        assert!(!a.show_resolved);
        let (text, buf) = render_text(&a, 110, 20);
        assert!(
            text.contains("[x] Compact density") && text.contains("[ ] Dark theme"),
            "{text}"
        );
        assert_eq!(buf[(60, 15)].bg, Color::from(LIGHT.surface));
        a.on_key(KeyCode::Char('3'));
        let open = a.alerts().len();
        assert!(
            open < ALERTS.len() && ALERTS.iter().filter(|x| x.state != "resolved").count() == open
        );
    }

    #[test]
    fn density_changes_row_spacing_and_sort_reorders() {
        let rows_on = |text: &str| text.lines().filter(|l| l.contains("INV-")).count();
        let (comfortable, _) = page(Page::Tables, true, false);
        let (compact, _) = page(Page::Tables, true, true);
        assert_eq!(rows_on(&comfortable), rows_on(&compact));
        let line_of = |t: &str| {
            t.lines()
                .position(|l| l.contains(INVOICES.last().unwrap().number))
                .unwrap()
                - t.lines()
                    .position(|l| l.contains(INVOICES[0].number))
                    .unwrap()
        };
        assert!(
            line_of(&comfortable) > line_of(&compact),
            "comfortable rows must be taller"
        );
        let mut a = App::new(true, true);
        a.page = Page::Tables;
        a.on_key(KeyCode::Char('s'));
        a.on_key(KeyCode::Char('s'));
        assert_eq!(
            a.invoices()[0].cents,
            INVOICES.iter().map(|i| i.total_cents).max().unwrap()
        );
    }

    #[test]
    fn topology_is_drawn_from_uplinks() {
        let (text, _) = page(Page::Network, true, false);
        assert!(
            text.contains('\u{2514}') && text.contains('\u{251c}'),
            "no tree connectors:\n{text}"
        );
        let lines = tree_lines();
        assert_eq!(lines.len(), DEVICES.len());
        assert!(lines[0].starts_with(TOPOLOGY[0].name));
        assert!(lines.iter().any(|l| l.contains("Doorbell")));
    }

    #[test]
    fn documents_page_previews_the_selected_source() {
        let mut a = App::new(true, false);
        a.page = Page::Documents;
        a.row = 1;
        let (text, _) = render_text(&a, 110, 40);
        assert!(
            text.contains(&format!("LaTeX source: {}", DOCUMENTS[1].name)),
            "{text}"
        );
        assert!(text.contains("\\documentclass"));
    }

    #[test]
    fn table_cells_edit_in_place_with_enter_and_esc() {
        let mut a = App::new(true, true);
        a.page = Page::Tables;
        // text cell: Client of the first row (sorted by number: INV-0039)
        a.on_key(KeyCode::Enter);
        for _ in 0..30 {
            a.on_key(KeyCode::Backspace);
        }
        for c in "Acme Ltd".chars() {
            a.on_key(KeyCode::Char(c));
        }
        let (text, _) = render_text(&a, 110, 30);
        assert!(
            text.contains("Acme Ltd") && text.contains("editing"),
            "{text}"
        );
        a.on_key(KeyCode::Enter);
        assert_eq!(a.rows[3].client, "Acme Ltd"); // INV-0039 is the fourth sample row
                                                  // Esc cancels without changing anything
        a.on_key(KeyCode::Enter);
        a.on_key(KeyCode::Char('x'));
        a.on_key(KeyCode::Esc);
        assert_eq!(a.rows[3].client, "Acme Ltd");
        assert!(a.edit.is_none());
        // empty text is rejected and stays in edit mode
        a.on_key(KeyCode::Enter);
        for _ in 0..30 {
            a.on_key(KeyCode::Backspace);
        }
        a.on_key(KeyCode::Enter);
        assert!(a.edit.is_some() && a.error.is_some());
        a.on_key(KeyCode::Esc);
        // status cell cycles with Up/Down; number cell parses money
        a.on_key(KeyCode::Right);
        a.on_key(KeyCode::Enter);
        a.on_key(KeyCode::Down);
        a.on_key(KeyCode::Enter);
        assert_ne!(a.rows[3].status, "paid");
        a.on_key(KeyCode::Right);
        a.on_key(KeyCode::Enter);
        for _ in 0..30 {
            a.on_key(KeyCode::Backspace);
        }
        for c in "1,234.5".chars() {
            a.on_key(KeyCode::Char(c));
        }
        a.on_key(KeyCode::Enter);
        assert_eq!(a.rows[3].cents, 123_450);
        let (text, _) = render_text(&a, 110, 30);
        assert!(text.contains("$1,234.50"), "{text}");
    }

    #[test]
    fn navigation_wraps_and_quits() {
        let mut a = App::new(true, false);
        a.on_key(KeyCode::BackTab);
        assert_eq!(a.page, Page::Settings);
        a.on_key(KeyCode::Tab);
        assert_eq!(a.page, Page::Overview);
        a.on_key(KeyCode::Char('q'));
        assert!(a.quit);
    }
}
