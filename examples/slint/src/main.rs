slint::include_modules!();

fn main() {
    let ui = App::new().expect("create window");
    let args: Vec<String> = std::env::args().collect();
    ui.global::<Jupiter>().set_dark(args.iter().any(|a| a == "--dark"));

    // `--screenshot out.png` renders one frame to a file and exits (handy for CI and visual diffs).
    if let Some(i) = args.iter().position(|a| a == "--screenshot") {
        let path = args.get(i + 1).cloned().unwrap_or_else(|| "slint-demo.png".into());
        let weak = ui.as_weak();
        slint::Timer::single_shot(std::time::Duration::from_millis(800), move || {
            if let Some(ui) = weak.upgrade() {
                let shot = ui.window().take_snapshot().expect("snapshot");
                image::save_buffer(&path, shot.as_bytes(), shot.width(), shot.height(), image::ColorType::Rgba8)
                    .expect("write png");
                println!("wrote {path} ({}x{})", shot.width(), shot.height());
            }
            slint::quit_event_loop().ok();
        });
    }
    ui.run().expect("run");
}
