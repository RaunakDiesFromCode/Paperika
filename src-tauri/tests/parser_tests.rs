use paperika_lib::models::PdoVersion;
use paperika_lib::parser::binary::{BinaryReader, ParseError};
use paperika_lib::parser::{detect_format, parse_pdo};
use paperika_lib::services::export::export_page_to_svg;
use std::fs;
use std::path::Path;

#[test]
fn test_binary_reader_primitives() {
    let data = [
        0x01, // u8
        0x02, 0x03, // u16: 0x0302
        0x04, 0x05, 0x06, 0x07, // u32 / i32
        0x00, 0x00, 0x80, 0x3f, // f32: 1.0
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f, // f64: 1.0
    ];

    let mut reader = BinaryReader::new(&data);
    assert_eq!(reader.read_u8().unwrap(), 0x01);
    assert_eq!(reader.read_u16().unwrap(), 0x0302);
    assert_eq!(reader.read_u32().unwrap(), 0x07060504);
    assert_eq!(reader.read_f32().unwrap(), 1.0);
    assert_eq!(reader.read_f64().unwrap(), 1.0);
    assert_eq!(reader.remaining(), 0);
}

#[test]
fn test_binary_reader_unexpected_eof() {
    let data = [0x01, 0x02];
    let mut reader = BinaryReader::new(&data);
    let err = reader.read_u32().unwrap_err();
    match err {
        ParseError::UnexpectedEof { needed, .. } => assert_eq!(needed, 4),
        _ => panic!("Expected UnexpectedEof error"),
    }
}

#[test]
fn test_binary_reader_string_shift() {
    // Encoded "ABC" with shift = 5: 'A' (65) + 5 = 70 ('F'), 'B' + 5 = 71 ('G'), 'C' + 5 = 72 ('H'), plus null
    let mut data = Vec::new();
    data.extend_from_slice(&(4u32.to_le_bytes())); // byte len = 4 (3 chars + null)
    data.push(b'F');
    data.push(b'G');
    data.push(b'H');
    data.push(0);

    let mut reader = BinaryReader::new(&data);
    let s = reader.read_pdo_string(false, 5).unwrap();
    assert_eq!(s, "ABC");
}

#[test]
fn test_format_detection_magic() {
    let v3_minor6 = b"version 3\n\x06\x00\x00\x00extra";
    match detect_format(v3_minor6) {
        PdoVersion::V3Minor6 => {}
        other => panic!("Expected V3Minor6, got {:?}", other),
    }

    let v3_minor4 = b"version 3\n\x04\x00\x00\x00extra";
    match detect_format(v3_minor4) {
        PdoVersion::V3Minor4 => {}
        other => panic!("Expected V3Minor4, got {:?}", other),
    }

    let v2_text = b"# Pepakura Designer Work Info ver 2\nversion 2\n";
    match detect_format(v2_text) {
        PdoVersion::V2Text => {}
        other => panic!("Expected V2Text, got {:?}", other),
    }

    let invalid = b"INVALID HEADER DATA";
    match detect_format(invalid) {
        PdoVersion::Unknown(_) => {}
        other => panic!("Expected Unknown, got {:?}", other),
    }
}

#[test]
fn test_parse_corrupted_or_truncated() {
    let corrupted = b"version 3\n\x06\x00\x00\x00\x01\x00\x00\x00"; // truncated after header
    let result = parse_pdo(corrupted, "corrupt.pdo".to_string());
    assert!(result.is_err());
}

#[test]
fn test_integration_parse_complex_pdo() {
    let pdo_path = Path::new("../test/complex.pdo");
    if !pdo_path.exists() {
        eprintln!("Skipping integration test: complex.pdo not found");
        return;
    }

    let bytes = fs::read(pdo_path).expect("Failed to read complex.pdo");
    let doc = parse_pdo(&bytes, "complex.pdo".to_string()).expect("Failed to parse complex.pdo");

    // Verify metadata
    assert_eq!(doc.metadata.format_version, "PDO v3.6");
    assert_eq!(
        doc.metadata.designer_id.as_deref(),
        Some("Pepakura Designer 6")
    );
    assert_eq!(doc.metadata.author.as_deref(), Some("Sergey Ivchenko"));
    assert!(doc.metadata.total_objects > 0, "Expected objects in model");
    assert!(
        doc.metadata.total_vertices_3d > 1000,
        "Expected vertices in model"
    );
    assert!(
        doc.metadata.total_unfolded_parts > 100,
        "Expected unfolded parts"
    );
    assert!(doc.pages.len() > 0, "Expected pages in document");

    // Verify 3D Geometry
    assert!(
        !doc.geometry_3d.meshes.is_empty(),
        "Meshes should not be empty"
    );
    assert!(
        !doc.geometry_3d.edges.is_empty(),
        "Crease edges should not be empty"
    );
    assert!(doc.geometry_3d.size[0] > 0.0);
    assert!(doc.geometry_3d.size[1] > 0.0);
    assert!(doc.geometry_3d.size[2] > 0.0);

    // Verify 2D Unfolding
    let first_page = &doc.pages[0];
    assert!(first_page.width_mm > 0.0);
    assert!(first_page.height_mm > 0.0);

    // Verify SVG Export
    let svg = export_page_to_svg(first_page);
    assert!(svg.starts_with("<svg"));
    assert!(svg.contains("</svg>"));
    assert!(svg.contains("cut-lines"));
}

#[test]
fn test_integration_parse_semi_pdo() {
    let pdo_path = Path::new("../test/semi.pdo");
    if !pdo_path.exists() {
        eprintln!("Skipping integration test: semi.pdo not found");
        return;
    }

    let bytes = fs::read(pdo_path).expect("Failed to read semi.pdo");
    let doc = parse_pdo(&bytes, "semi.pdo".to_string()).expect("Failed to parse semi.pdo");

    assert_eq!(doc.metadata.format_version, "PDO v3.6");
    assert_eq!(doc.metadata.total_objects, 11);
    assert!(doc.metadata.has_textures, "semi.pdo must have textures");

    // Check that at least one material has a decoded PNG data URL
    let textured_mat = doc.materials.iter().find(|m| m.has_texture);
    assert!(textured_mat.is_some(), "Must have textured material");
    let mat = textured_mat.unwrap();
    assert!(mat.texture_data_url.is_some());
    assert!(mat
        .texture_data_url
        .as_ref()
        .unwrap()
        .starts_with("data:image/png;base64,"));
}
