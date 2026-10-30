pub mod binary;
pub mod pdo2;
pub mod pdo3;

use crate::models::{DocumentDto, PdoVersion};
use binary::ParseError;
use pdo2::Pdo2Parser;
use pdo3::Pdo3Parser;

pub fn detect_format(data: &[u8]) -> PdoVersion {
    if data.starts_with(b"version 3\n") {
        if data.len() >= 14 {
            let sub_ver = u32::from_le_bytes([data[10], data[11], data[12], data[13]]);
            match sub_ver {
                4 => PdoVersion::V3Minor4,
                5 => PdoVersion::V3Minor5,
                6 => PdoVersion::V3Minor6,
                other => PdoVersion::Unknown(format!("version 3.{}", other)),
            }
        } else {
            PdoVersion::Unknown("version 3 (truncated)".to_string())
        }
    } else if data.starts_with(b"# Pepakura Designer Work Info ver 2") {
        PdoVersion::V2Text
    } else {
        PdoVersion::Unknown("Unrecognized file format or not a PDO document".to_string())
    }
}

pub fn parse_pdo(data: &[u8], file_name: String) -> Result<DocumentDto, ParseError> {
    match detect_format(data) {
        PdoVersion::V3Minor4 | PdoVersion::V3Minor5 | PdoVersion::V3Minor6 => {
            let parser = Pdo3Parser::new(data, file_name);
            parser.parse()
        }
        PdoVersion::V2Text => {
            let parser = Pdo2Parser::new(data, file_name);
            parser.parse()
        }
        PdoVersion::Unknown(reason) => Err(ParseError::UnsupportedVersion(reason)),
    }
}
