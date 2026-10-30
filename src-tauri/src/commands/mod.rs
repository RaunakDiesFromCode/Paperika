use std::fs;
use std::path::Path;

use crate::models::{DocumentDto, Page2dDto};
use crate::parser::parse_pdo;
use crate::services::export::export_page_to_svg;

#[tauri::command]
pub async fn open_pdo_file(path: String) -> Result<DocumentDto, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let file_name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unnamed.pdo")
        .to_string();

    let data = fs::read(p).map_err(|e| format!("Failed to read file '{}': {}", path, e))?;

    let mut doc =
        parse_pdo(&data, file_name).map_err(|e| format!("Failed to parse PDO document: {}", e))?;

    doc.metadata.file_path = Some(path);
    Ok(doc)
}

#[tauri::command]
pub async fn parse_pdo_bytes(bytes: Vec<u8>, file_name: String) -> Result<DocumentDto, String> {
    parse_pdo(&bytes, file_name).map_err(|e| format!("Failed to parse PDO data: {}", e))
}

#[tauri::command]
pub fn export_page_svg(page: Page2dDto) -> Result<String, String> {
    Ok(export_page_to_svg(&page))
}
