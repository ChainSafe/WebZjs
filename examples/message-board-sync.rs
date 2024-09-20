use std::sync::Once;

use std::num::NonZeroU32;
use webz_core::Wallet;
use zcash_primitives::consensus::Network;
static INIT: Once = Once::new();
const SAPLING_EFVK: &str = "zxviews1q0duytgcqqqqpqre26wkl45gvwwwd706xw608hucmvfalr759ejwf7qshjf5r9aa7323zulvz6plhttp5mltqcgs9t039cx2d09mgq05ts63n8u35hyv6h9nc9ctqqtue2u7cer2mqegunuulq2luhq3ywjcz35yyljewa4mgkgjzyfwh6fr6jd0dzd44ghk0nxdv2hnv4j5nxfwv24rwdmgllhe0p8568sgqt9ckt02v2kxf5ahtql6s0ltjpkckw8gtymxtxuu9gcr0swvz";
pub fn initialize() {
    INIT.call_once(|| {
        webz_core::init::start();
    });
}
#[tokio::main]
async fn main() {
    use zcash_keys::keys::UnifiedFullViewingKey;
    use zcash_primitives::{consensus, constants};
    let db_cache = tempfile::tempdir().unwrap();
    let _db_data = tempfile::NamedTempFile::new_in(db_cache.path()).unwrap();

    initialize();
    let url = "https://zec.rocks:443";
    let c = tonic::transport::Channel::from_shared(url).unwrap();

    let tls = tonic::transport::ClientTlsConfig::new()
        .domain_name("zec.rocks")
        .with_webpki_roots();
    let channel = c.tls_config(tls).unwrap();

    #[cfg(feature = "sqlite-db")]
    let wallet_db = {
        use zcash_client_sqlite::{
            chain::init::init_blockmeta_db, wallet::init::init_wallet_db, FsBlockDb, WalletDb,
        };

        let mut db_cache = FsBlockDb::for_path(&db_cache).unwrap();
        let mut wallet_db = WalletDb::for_path(&_db_data, consensus::Network::MainNetwork).unwrap();
        init_blockmeta_db(&mut db_cache).unwrap();
        init_wallet_db(&mut wallet_db, None).unwrap();
        wallet_db
    };

    #[cfg(not(feature = "sqlite-db"))]
    let wallet_db = zcash_client_memory::MemoryWalletDb::new(
        consensus::Network::MainNetwork,
        webz_core::PRUNING_DEPTH,
    );

    let mut w = Wallet::new(
        wallet_db,
        channel.connect().await.unwrap(),
        Network::MainNetwork,
        NonZeroU32::try_from(1).unwrap(),
    )
    .unwrap();

    let s = zcash_keys::encoding::decode_extended_full_viewing_key(
        constants::mainnet::HRP_SAPLING_EXTENDED_FULL_VIEWING_KEY,
        SAPLING_EFVK.trim(),
    )
    .unwrap();

    let ufvk = UnifiedFullViewingKey::from_sapling_extended_full_viewing_key(s).unwrap();
    let id = w.import_ufvk(&ufvk, Some(2477329)).await.unwrap();
    tracing::info!("Created account with id: {}", id);

    #[cfg(not(feature = "sync2"))]
    {
        tracing::info!("Syncing wallet with our sync impl");
        w.sync(|scanned_to, tip| {
            println!("Scanned: {}/{}", scanned_to, tip);
        })
        .await
        .unwrap();
    }
    #[cfg(feature = "sync2")]
    {
        tracing::info!("Syncing wallet with sync2");
        w.sync2().await.unwrap();
    }

    tracing::info!("Syncing complete :)");

    let summary = w.get_wallet_summary().await.unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}
