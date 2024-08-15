use std::sync::{atomic::AtomicBool, Arc};

use append_only_vec::AppendOnlyVec;

use zcash_client_backend::address::UnifiedAddress;
use zcash_primitives::legacy::TransparentAddress;
#[derive(Clone, Debug)]
#[non_exhaustive]
pub enum Capability<ViewingKeyType, SpendKeyType> {
    None,
    View(ViewingKeyType),
    Spend(SpendKeyType),
}

impl<V, S> Capability<V, S> {
    pub fn can_spend(&self) -> bool {
        matches!(self, Capability::Spend(_))
    }

    pub fn can_view(&self) -> bool {
        match self {
            Capability::None => false,
            Capability::View(_) => true,
            Capability::Spend(_) => true,
        }
    }

    pub fn kind_str(&self) -> &'static str {
        match self {
            Capability::None => "No key",
            Capability::View(_) => "View only",
            Capability::Spend(_) => "Spend capable",
        }
    }
}

#[derive(Debug)]
pub struct WalletCapability {
    pub transparent: Capability<
        super::extended_transparent::ExtendedPubKey,
        super::extended_transparent::ExtendedPrivKey,
    >,
    pub sapling: Capability<
        sapling_crypto::zip32::DiversifiableFullViewingKey,
        sapling_crypto::zip32::ExtendedSpendingKey,
    >,
    pub orchard: Capability<orchard::keys::FullViewingKey, orchard::keys::SpendingKey>,

    pub transparent_child_addresses: Arc<append_only_vec::AppendOnlyVec<(usize, TransparentAddress)>>,
    pub addresses: append_only_vec::AppendOnlyVec<UnifiedAddress>,
    // Not all diversifier indexes produce valid sapling addresses.
    // Because of this, the index isn't necessarily equal to addresses.len()
    pub addresses_write_lock: AtomicBool,
}
impl Default for WalletCapability {
    fn default() -> Self {
        Self {
            orchard: Capability::None,
            sapling: Capability::None,
            transparent: Capability::None,
            transparent_child_addresses: Arc::new(AppendOnlyVec::new()),
            addresses: AppendOnlyVec::new(),
            addresses_write_lock: AtomicBool::new(false),
        }
    }
}
