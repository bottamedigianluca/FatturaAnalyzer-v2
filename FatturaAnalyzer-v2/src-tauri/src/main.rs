// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use std::env;

// Tauri commands
#[tauri::command]
async fn app_ready() -> Result<String, String> {
    println!("📱 Tauri app is ready!");
    Ok("App initialized successfully".to_string())
}

#[tauri::command]
async fn test_backend_connection() -> Result<String, String> {
    let client = reqwest::Client::new();
    
    match client.get("http://127.0.0.1:8000/health").send().await {
        Ok(response) => {
            if response.status().is_success() {
                let text = response.text().await.map_err(|e| e.to_string())?;
                Ok(format!("✅ Backend connected: {}", text))
            } else {
                Err(format!("❌ Backend returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("❌ Connection failed: {}", e))
    }
}

#[tauri::command]
async fn get_app_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "name": "FatturaAnalyzer v2",
        "version": env!("CARGO_PKG_VERSION"),
        "tauri_version": tauri::version(),
        "platform": env::consts::OS,
        "arch": env::consts::ARCH,
        "debug": cfg!(debug_assertions)
    });
    
    Ok(info)
}

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    tauri::api::shell::open(&tauri::Context::default(), url, None)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn show_notification(title: String, body: String) -> Result<(), String> {
    // Future: implement native notifications
    println!("📢 Notification: {} - {}", title, body);
    Ok(())
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    let system_info = serde_json::json!({
        "os": env::consts::OS,
        "arch": env::consts::ARCH,
        "family": env::consts::FAMILY,
        "exe_suffix": env::consts::EXE_SUFFIX,
        "dll_prefix": env::consts::DLL_PREFIX,
        "dll_suffix": env::consts::DLL_SUFFIX
    });
    
    Ok(system_info)
}

fn main() {
    // Initialize logger
    env_logger::init();
    
    tauri::Builder::default()
        .setup(|app| {
            println!("🚀 FatturaAnalyzer v2 starting...");
            
            // Set app icon and title
            let window = app.get_window("main").unwrap();
            window.set_title("FatturaAnalyzer v2").unwrap();
            
            // Development specific setup
            #[cfg(debug_assertions)]
            {
                println!("🔧 Development mode enabled");
                window.open_devtools();
            }
            
            println!("✅ Tauri setup completed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_ready,
            test_backend_connection,
            get_app_info,
            open_external_url,
            show_notification,
            get_system_info
        ])
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                println!("👋 App closing...");
                api.prevent_close();
                
                // Here you could show a confirmation dialog
                // For now, just close the app
                event.window().close().unwrap();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
