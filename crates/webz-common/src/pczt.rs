use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pczt(pczt::Pczt);

impl From<pczt::Pczt> for Pczt {
    fn from(pczt: pczt::Pczt) -> Self {
        Self(pczt)
    }
}

impl From<Pczt> for pczt::Pczt {
    fn from(pczt: Pczt) -> Self {
        pczt.0
    }
}

#[wasm_bindgen]
impl Pczt {
    /// Returns a JSON object with the details of the Pczt.
    pub fn to_json(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self).unwrap()
    }

    /// Returns a Pczt from a JSON object
    pub fn from_json(s: JsValue) -> Pczt {
        serde_wasm_bindgen::from_value(s).unwrap()
    }

    /// Returns the postcard serialization of the Pczt.
    pub fn serialize(&self) -> Vec<u8> {
        self.0.serialize()
    }

    /// Deserialize to a Pczt from postcard bytes.
    pub fn from_bytes(bytes: &[u8]) -> Pczt {
        Self(pczt::Pczt::parse(bytes).unwrap())
    }
}
