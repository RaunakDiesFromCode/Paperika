pub mod commands;
pub mod geometry;
pub mod models;
pub mod parser;
pub mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_pdo_file,
            commands::parse_pdo_bytes,
            commands::export_page_svg
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
