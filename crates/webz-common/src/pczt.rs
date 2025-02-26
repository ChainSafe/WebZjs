use wasm_bindgen::prelude::*;

#[wasm_bindgen]
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
    pub fn describe(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.0).unwrap()
    }
}
