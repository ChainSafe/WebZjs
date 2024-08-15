//! Contains structs for querying a database about notes.

use getset::Getters;

use zcash_client_backend::PoolType;
use zcash_client_backend::PoolType::Shielded;
use zcash_client_backend::PoolType::Transparent;
use zcash_client_backend::ShieldedProtocol::Orchard;
use zcash_client_backend::ShieldedProtocol::Sapling;

/// Selects received notes by how they been spent
#[derive(Getters, Clone, Copy)]
pub struct OutputSpendStatusQuery {
    /// will the query include unspent notes?
    #[getset(get = "pub")]
    pub unspent: bool,
    /// will the query include pending_spent notes?
    #[getset(get = "pub")]
    pub pending_spent: bool,
    /// will the query include spent notes?
    #[getset(get = "pub")]
    pub spent: bool,
}
impl OutputSpendStatusQuery {
    /// a query that accepts notes of any spent status
    pub fn any() -> Self {
        Self {
            unspent: true,
            pending_spent: true,
            spent: true,
        }
    }
    /// a query that only accepts unspent notes
    pub fn only_unspent() -> Self {
        Self {
            unspent: true,
            pending_spent: false,
            spent: false,
        }
    }
    /// a query that only accepts pending_spent notes
    pub fn only_pending_spent() -> Self {
        Self {
            unspent: false,
            pending_spent: true,
            spent: false,
        }
    }
    /// a query that only accepts spent notes
    pub fn only_spent() -> Self {
        Self {
            unspent: false,
            pending_spent: false,
            spent: true,
        }
    }
    /// a query that accepts pending_spent or spent notes
    pub fn spentish() -> Self {
        Self {
            unspent: false,
            pending_spent: true,
            spent: true,
        }
    }
}

/// Selects received notes by pool
#[derive(Getters, Clone, Copy)]
pub struct OutputPoolQuery {
    /// will the query include transparent notes? (coins)
    #[getset(get = "pub")]
    pub transparent: bool,
    /// will the query include sapling notes?
    #[getset(get = "pub")]
    pub sapling: bool,
    /// will the query include orchard notes?
    #[getset(get = "pub")]
    pub orchard: bool,
}
impl OutputPoolQuery {
    /// a query that accepts outputs from any pool.
    pub fn any() -> Self {
        Self {
            transparent: true,
            sapling: true,
            orchard: true,
        }
    }
    /// a query that accepts notes from a shielded pool.
    pub fn shielded() -> Self {
        Self {
            transparent: false,
            sapling: true,
            orchard: true,
        }
    }
    /// a query that will match only a specific pool.
    pub fn one_pool(pool_type: PoolType) -> Self {
        match pool_type {
            Transparent => Self {
                transparent: true,
                sapling: false,
                orchard: false,
            },
            Shielded(Sapling) => Self {
                transparent: false,
                sapling: true,
                orchard: false,
            },
            Shielded(Orchard) => Self {
                transparent: false,
                sapling: false,
                orchard: true,
            },
        }
    }
}

/// Selects received notes by any properties
#[derive(Getters, Clone, Copy)]
pub struct OutputQuery {
    /// selects spend status properties
    /// the query is expected to match note with ANY of the specified spend_stati AND ANY of the specified pools
    #[getset(get = "pub")]
    pub spend_status: OutputSpendStatusQuery,
    /// selects pools
    #[getset(get = "pub")]
    pub pools: OutputPoolQuery,
}

impl OutputQuery {
    /// a query that accepts all notes.
    pub fn any() -> Self {
        Self {
            spend_status: OutputSpendStatusQuery::any(),
            pools: OutputPoolQuery::any(),
        }
    }
    /// a query that accepts all notes.
    pub fn only_unspent() -> Self {
        Self {
            spend_status: OutputSpendStatusQuery {
                unspent: true,
                pending_spent: false,
                spent: false,
            },
            pools: OutputPoolQuery::any(),
        }
    }

    /// build a query, specifying each stipulation
    pub fn stipulations(
        unspent: bool,
        pending_spent: bool,
        spent: bool,
        transparent: bool,
        sapling: bool,
        orchard: bool,
    ) -> Self {
        Self {
            spend_status: OutputSpendStatusQuery {
                unspent,
                pending_spent,
                spent,
            },
            pools: OutputPoolQuery {
                transparent,
                sapling,
                orchard,
            },
        }
    }
    /// will the query include unspent notes?
    pub fn unspent(&self) -> &bool {
        self.spend_status().unspent()
    }
    /// will the query include pending_spent notes?
    pub fn pending_spent(&self) -> &bool {
        self.spend_status().pending_spent()
    }
    /// will the query include spent notes?
    pub fn spent(&self) -> &bool {
        self.spend_status().spent()
    }
    /// will the query include transparent notes? (coins)
    pub fn transparent(&self) -> &bool {
        self.pools().transparent()
    }
    /// will the query include sapling notes?
    pub fn sapling(&self) -> &bool {
        self.pools().sapling()
    }
    /// will the query include orchard notes?
    pub fn orchard(&self) -> &bool {
        self.pools().orchard()
    }
}
