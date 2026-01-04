use tauri::{
    image::Image,
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Widget", true, None::<&str>)?;
    let toggle_dictation = MenuItem::with_id(
        app,
        "toggle_dictation",
        "Toggle Dictation",
        true,
        Some("CommandOrControl+Shift+D"),
    )?;
    let separator1 = MenuItem::new(app, "", false, None::<&str>)?;
    let always_on_top = CheckMenuItem::with_id(app, "always_on_top", "Always on Top", true, true, None::<&str>)?;
    let separator2 = MenuItem::new(app, "", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("CommandOrControl+Q"))?;

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &toggle_dictation,
            &separator1,
            &always_on_top,
            &separator2,
            &quit,
        ],
    )?;

    // Load tray icon
    let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))
        .unwrap_or_else(|_| Image::from_bytes(&[0u8; 0]).unwrap());

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Voice Dictation Widget")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "toggle_dictation" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("toggle-dictation", ());
                }
            }
            "always_on_top" => {
                if let Some(window) = app.get_webview_window("main") {
                    let current = window.is_always_on_top().unwrap_or(true);
                    let _ = window.set_always_on_top(!current);
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { .. } = event {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
