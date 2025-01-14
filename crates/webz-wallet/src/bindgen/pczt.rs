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
