use thiserror::Error;

#[derive(Error, Debug)]
pub enum ParseError {
    #[error("Unexpected end of file at offset {offset}, attempted to read {needed} bytes")]
    UnexpectedEof { offset: usize, needed: usize },
    #[error("Invalid file header: {0}")]
    InvalidHeader(String),
    #[error("Unsupported format version: {0}")]
    UnsupportedVersion(String),
    #[error("Corrupted data: {0}")]
    CorruptedData(String),
    #[error("Excessive allocation request: {0} bytes")]
    ExcessiveAllocation(usize),
    #[error("Decompression failed: {0}")]
    DecompressionFailed(String),
}

pub struct BinaryReader<'a> {
    data: &'a [u8],
    cursor: usize,
}

impl<'a> BinaryReader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self { data, cursor: 0 }
    }

    pub fn position(&self) -> usize {
        self.cursor
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn remaining(&self) -> usize {
        self.data.len().saturating_sub(self.cursor)
    }

    pub fn seek(&mut self, pos: usize) -> Result<(), ParseError> {
        if pos > self.data.len() {
            return Err(ParseError::UnexpectedEof {
                offset: self.cursor,
                needed: pos - self.data.len(),
            });
        }
        self.cursor = pos;
        Ok(())
    }

    pub fn skip(&mut self, count: usize) -> Result<(), ParseError> {
        if self.cursor + count > self.data.len() {
            return Err(ParseError::UnexpectedEof {
                offset: self.cursor,
                needed: count,
            });
        }
        self.cursor += count;
        Ok(())
    }

    pub fn peek_byte(&self) -> Result<u8, ParseError> {
        if self.cursor >= self.data.len() {
            return Err(ParseError::UnexpectedEof {
                offset: self.cursor,
                needed: 1,
            });
        }
        Ok(self.data[self.cursor])
    }

    pub fn read_bytes(&mut self, count: usize) -> Result<&'a [u8], ParseError> {
        if self.cursor + count > self.data.len() {
            return Err(ParseError::UnexpectedEof {
                offset: self.cursor,
                needed: count,
            });
        }
        let slice = &self.data[self.cursor..self.cursor + count];
        self.cursor += count;
        Ok(slice)
    }

    pub fn read_u8(&mut self) -> Result<u8, ParseError> {
        let bytes = self.read_bytes(1)?;
        Ok(bytes[0])
    }

    pub fn read_bool(&mut self) -> Result<bool, ParseError> {
        Ok(self.read_u8()? != 0)
    }

    pub fn read_u16(&mut self) -> Result<u16, ParseError> {
        let bytes = self.read_bytes(2)?;
        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    pub fn read_i32(&mut self) -> Result<i32, ParseError> {
        let bytes = self.read_bytes(4)?;
        Ok(i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn read_u32(&mut self) -> Result<u32, ParseError> {
        let bytes = self.read_bytes(4)?;
        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn read_f32(&mut self) -> Result<f32, ParseError> {
        let bytes = self.read_bytes(4)?;
        Ok(f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn read_f64(&mut self) -> Result<f64, ParseError> {
        let bytes = self.read_bytes(8)?;
        Ok(f64::from_le_bytes([
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        ]))
    }

    pub fn read_bounding_box(&mut self) -> Result<[f64; 4], ParseError> {
        let left = self.read_f64()?;
        let top = self.read_f64()?;
        let width = self.read_f64()?;
        let height = self.read_f64()?;
        Ok([left, top, width, height])
    }

    pub fn read_pdo_string(&mut self, is_multibyte: bool, shift: u8) -> Result<String, ParseError> {
        let byte_len = self.read_u32()? as usize;
        if byte_len == 0 {
            return Ok(String::new());
        }

        // Safety bound: don't allocate more than 32 MB for a string
        if byte_len > 32 * 1024 * 1024 {
            return Err(ParseError::ExcessiveAllocation(byte_len));
        }

        let raw = self.read_bytes(byte_len)?;

        if is_multibyte {
            let num_words = byte_len / 2;
            let mut u16_chars = Vec::with_capacity(num_words);
            for i in 0..num_words {
                let w = u16::from_le_bytes([raw[2 * i], raw[2 * i + 1]]);
                // Check if last character is null terminator
                if i + 1 == num_words && w == 0 {
                    break;
                }
                // Decode character with shift
                // Pepakura shifted strings mask with 0xff or wide char
                let shifted = w.wrapping_sub(shift as u16) & 0xff;
                u16_chars.push(shifted);
            }
            let s = String::from_utf16_lossy(&u16_chars);
            Ok(s.trim_end_matches('\0').to_string())
        } else {
            let mut decoded_bytes = Vec::with_capacity(byte_len);
            for (i, &b) in raw.iter().enumerate() {
                if i + 1 == byte_len && b == 0 {
                    break;
                }
                let shifted = b.wrapping_sub(shift);
                decoded_bytes.push(shifted);
            }
            // Try UTF-8 first, fallback to lossy
            let s = String::from_utf8_lossy(&decoded_bytes).to_string();
            Ok(s.trim_end_matches('\0').to_string())
        }
    }
}
