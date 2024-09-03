use wasm_bindgen::prelude::*;

/// # A Zcash wallet
/// 
/// A wallet is a set of accounts that can be synchronized together with the blockchain.
/// Once synchronized these can be used to build transactions that spend notes
/// 
/// ## Adding Accounts
/// 
/// TODO
/// 
/// ## Synchronizing
/// 
/// A wallet can be syncced with the blockchain by feeding it blocks. The accounts currently managed by the wallet will be used to 
/// scan the blocks and retrieve relevant transactions. The wallet itself keeps track of blocks it has seen and can be queried for
/// the suggest range of blocks that should be retrieved for it to process next.
/// 
/// ## Building Transactions
/// 
/// TODO
/// 
#[wasm_bindgen]
pub struct Wallet {
    
}

#[wasm_bindgen]
impl Wallet {
    /// Create a new instance of a Zcash wallet
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {

        }
    }
}
