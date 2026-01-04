use enigo::{Enigo, Keyboard, Key, Direction, Settings};
use std::thread;
use std::time::Duration;

pub fn type_text(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| e.to_string())?;
    
    // Small delay to ensure target app is focused
    thread::sleep(Duration::from_millis(100));
    
    enigo.text(text).map_err(|e| e.to_string())
}

pub fn type_text_with_delay(text: &str, delay_ms: u64) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| e.to_string())?;
    
    thread::sleep(Duration::from_millis(100));
    
    for c in text.chars() {
        enigo.text(&c.to_string()).map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(delay_ms));
    }
    
    Ok(())
}

pub fn paste_shortcut() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Direction::Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
        enigo.key(Key::Meta, Direction::Release).map_err(|e| e.to_string())?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
        enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
