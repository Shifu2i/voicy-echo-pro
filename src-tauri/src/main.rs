#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keyboard;
mod commands;
mod tray;
mod whisper;

use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Create system tray
            tray::create_tray(app)?;

            // Register global shortcuts
            register_shortcuts(app)?;

            // Position window in bottom-right corner
            if let Some(window) = app.get_webview_window("main") {
                if let Some(monitor) = window.primary_monitor().ok().flatten() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    let x = (size.width as f64 / scale) as i32 - 340;
                    let y = (size.height as f64 / scale) as i32 - 220;
                    let _ = window.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition::new(
                            (x as f64 * scale) as i32,
                            (y as f64 * scale) as i32,
                        ),
                    ));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::type_text,
            commands::type_text_with_delay,
            commands::type_to_previous_app,
            commands::paste_text,
            commands::copy_to_clipboard,
            commands::read_clipboard,
            commands::minimize_window,
            commands::close_window,
            commands::set_always_on_top,
            commands::get_always_on_top,
            commands::check_accessibility_permission,
            // Native Whisper commands
            whisper::is_whisper_model_downloaded,
            whisper::get_whisper_model_path,
            whisper::download_whisper_model,
            whisper::load_whisper_model,
            whisper::is_whisper_loaded,
            whisper::transcribe_audio_native,
            whisper::transcribe_audio_file,
            whisper::unload_whisper_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn register_shortcuts<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Toggle dictation: Ctrl+Shift+D / Cmd+Shift+D
    let toggle_shortcut: Shortcut = "CommandOrControl+Shift+D".parse()?;
    app.global_shortcut().on_shortcut(toggle_shortcut, |app, _shortcut, _event| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.emit("toggle-dictation", ());
        }
    })?;

    // Show/hide widget: Ctrl+Shift+H / Cmd+Shift+H
    let visibility_shortcut: Shortcut = "CommandOrControl+Shift+H".parse()?;
    app.global_shortcut().on_shortcut(visibility_shortcut, |app, _shortcut, _event| {
        if let Some(window) = app.get_webview_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    })?;

    Ok(())
}
