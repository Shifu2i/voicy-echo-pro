use tauri::{command, AppHandle, Runtime, WebviewWindow};
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::time::Duration;

#[derive(serde::Serialize)]
pub struct TypeResult {
    pub success: bool,
    pub method: Option<String>,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[command]
pub async fn type_text(text: String) -> TypeResult {
    if text.trim().is_empty() {
        return TypeResult {
            success: false,
            method: None,
            error: Some("Empty text".to_string()),
            message: None,
        };
    }

    match crate::keyboard::type_text(&text) {
        Ok(_) => TypeResult {
            success: true,
            method: Some("enigo".to_string()),
            error: None,
            message: None,
        },
        Err(e) => TypeResult {
            success: false,
            method: None,
            error: Some(e),
            message: None,
        },
    }
}

#[command]
pub async fn type_text_with_delay(text: String, delay_ms: Option<u64>) -> TypeResult {
    let delay = delay_ms.unwrap_or(20);

    match crate::keyboard::type_text_with_delay(&text, delay) {
        Ok(_) => TypeResult {
            success: true,
            method: Some("enigo-delayed".to_string()),
            error: None,
            message: None,
        },
        Err(e) => TypeResult {
            success: false,
            method: None,
            error: Some(e),
            message: None,
        },
    }
}

/// Type text to the previously focused application
/// Hides widget, waits for focus to return to previous app, then types
#[command]
pub async fn type_to_previous_app<R: Runtime>(
    window: WebviewWindow<R>,
    text: String,
    input_method: String,
    hide_widget: bool,
    typing_delay: Option<u64>,
) -> TypeResult {
    if text.trim().is_empty() {
        return TypeResult {
            success: false,
            method: None,
            error: Some("Empty text".to_string()),
            message: None,
        };
    }

    // Hide widget to return focus to previous app
    if hide_widget {
        let _ = window.hide();
        // Wait for focus to transfer
        std::thread::sleep(Duration::from_millis(150));
    }

    let result = if input_method == "paste" {
        // Use clipboard paste method
        match window.app_handle().clipboard().write_text(&text) {
            Ok(_) => {
                std::thread::sleep(Duration::from_millis(50));
                match crate::keyboard::paste_shortcut() {
                    Ok(_) => TypeResult {
                        success: true,
                        method: Some("clipboard-paste".to_string()),
                        error: None,
                        message: None,
                    },
                    Err(e) => TypeResult {
                        success: false,
                        method: None,
                        error: Some(e),
                        message: None,
                    },
                }
            }
            Err(e) => TypeResult {
                success: false,
                method: None,
                error: Some(e.to_string()),
                message: None,
            },
        }
    } else if input_method == "type_delayed" {
        // Direct typing with delay
        let delay = typing_delay.unwrap_or(20);
        match crate::keyboard::type_text_with_delay(&text, delay) {
            Ok(_) => TypeResult {
                success: true,
                method: Some("enigo-delayed".to_string()),
                error: None,
                message: None,
            },
            Err(e) => TypeResult {
                success: false,
                method: None,
                error: Some(e),
                message: None,
            },
        }
    } else {
        // Direct typing (fast)
        match crate::keyboard::type_text(&text) {
            Ok(_) => TypeResult {
                success: true,
                method: Some("enigo".to_string()),
                error: None,
                message: None,
            },
            Err(e) => TypeResult {
                success: false,
                method: None,
                error: Some(e),
                message: None,
            },
        }
    };

    // Show widget again after typing
    if hide_widget {
        let window_clone = window.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(300));
            let _ = window_clone.show();
        });
    }

    result
}

#[command]
pub async fn paste_text<R: Runtime>(app: AppHandle<R>, text: String) -> TypeResult {
    // Save current clipboard
    let previous = app.clipboard().read_text().unwrap_or_default();

    // Write new text to clipboard
    if let Err(e) = app.clipboard().write_text(&text) {
        return TypeResult {
            success: false,
            method: None,
            error: Some(e.to_string()),
            message: None,
        };
    }

    // Small delay for clipboard update
    std::thread::sleep(std::time::Duration::from_millis(50));

    // Simulate paste
    match crate::keyboard::paste_shortcut() {
        Ok(_) => {
            // Restore previous clipboard after delay
            let app_clone = app.clone();
            let prev = previous.unwrap_or_default();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(200));
                let _ = app_clone.clipboard().write_text(&prev);
            });

            TypeResult {
                success: true,
                method: Some("clipboard-paste".to_string()),
                error: None,
                message: None,
            }
        }
        Err(e) => TypeResult {
            success: false,
            method: None,
            error: Some(e),
            message: None,
        },
    }
}

#[command]
pub async fn copy_to_clipboard<R: Runtime>(app: AppHandle<R>, text: String) -> TypeResult {
    match app.clipboard().write_text(&text) {
        Ok(_) => TypeResult {
            success: true,
            method: None,
            error: None,
            message: None,
        },
        Err(e) => TypeResult {
            success: false,
            method: None,
            error: Some(e.to_string()),
            message: None,
        },
    }
}

#[command]
pub async fn read_clipboard<R: Runtime>(app: AppHandle<R>) -> String {
    app.clipboard()
        .read_text()
        .unwrap_or_default()
        .unwrap_or_default()
}

#[command]
pub async fn minimize_window<R: Runtime>(window: WebviewWindow<R>) {
    let _ = window.minimize();
}

#[command]
pub async fn close_window<R: Runtime>(window: WebviewWindow<R>) {
    let _ = window.hide();
}

#[command]
pub async fn set_always_on_top<R: Runtime>(window: WebviewWindow<R>, value: bool) {
    let _ = window.set_always_on_top(value);
}

#[command]
pub async fn get_always_on_top<R: Runtime>(window: WebviewWindow<R>) -> bool {
    window.is_always_on_top().unwrap_or(true)
}

/// Check if accessibility permission is granted (macOS only)
#[command]
pub fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        // On macOS, enigo will request accessibility permission automatically
        // We return true and let the OS handle the permission dialog
        true
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}
