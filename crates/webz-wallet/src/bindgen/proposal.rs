use super::wallet::NoteRef;
use wasm_bindgen::prelude::*;
use zcash_client_backend::fees::StandardFeeRule;

/// A handler to an immutable proposal. This can be passed to `create_proposed_transactions` to prove/authorize the transactions
/// before they are sent to the network.
///
/// The proposal can be reviewed by calling `describe` which will return a JSON object with the details of the proposal.
#[wasm_bindgen]
pub struct Proposal {
    inner: zcash_client_backend::proposal::Proposal<StandardFeeRule, NoteRef>,
}

impl From<zcash_client_backend::proposal::Proposal<StandardFeeRule, NoteRef>> for Proposal {
    fn from(inner: zcash_client_backend::proposal::Proposal<StandardFeeRule, NoteRef>) -> Self {
        Self { inner }
    }
}

impl From<Proposal> for zcash_client_backend::proposal::Proposal<StandardFeeRule, NoteRef> {
    fn from(proposal: Proposal) -> Self {
        proposal.inner
    }
}
