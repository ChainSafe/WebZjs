use std::collections::BTreeMap;
use std::sync::Once;

use std::num::NonZeroU32;
use webz_core::Wallet;
use zcash_address::ZcashAddress;
use zcash_primitives::consensus::Network;

const SEED: &str = "visit armed kite pen cradle toward reward clay marble oil write dove blind oyster silk oyster original message skate bench tone enable stadium element";
const HD_INDEX: u32 = 0;
const BIRTHDAY: Option<u32> = Some(2577329);

static INIT: Once = Once::new();
pub fn initialize() {
    INIT.call_once(|| {
        webz_core::init::start();
    });
}

use std::sync::{Arc, Mutex};
use zcash_client_backend::data_api::{
    chain::{error, BlockCache, BlockSource},
    scanning::{ScanPriority, ScanRange},
};
use zcash_client_backend::proto::compact_formats::CompactBlock;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::sync::run;
use zcash_client_memory::MemBlockCache;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_primitives::consensus::BlockHeight;
use zcash_primitives::constants;

const SAPLING_EFVK: &str = "zxviews1q0duytgcqqqqpqre26wkl45gvwwwd706xw608hucmvfalr759ejwf7qshjf5r9aa7323zulvz6plhttp5mltqcgs9t039cx2d09mgq05ts63n8u35hyv6h9nc9ctqqtue2u7cer2mqegunuulq2luhq3ywjcz35yyljewa4mgkgjzyfwh6fr6jd0dzd44ghk0nxdv2hnv4j5nxfwv24rwdmgllhe0p8568sgqt9ckt02v2kxf5ahtql6s0ltjpkckw8gtymxtxuu9gcr0swvz";

#[cfg(feature = "native")]
#[tokio::main]
async fn main() {
    let db_cache = tempfile::tempdir().unwrap();
    let _db_data = tempfile::NamedTempFile::new_in(db_cache.path()).unwrap();

    initialize();
    let url = "https://zec.rocks:443";
    let c = tonic::transport::Channel::from_shared(url).unwrap();

    let tls = tonic::transport::ClientTlsConfig::new()
        .domain_name("zec.rocks")
        .with_webpki_roots();
    let channel = c.tls_config(tls).unwrap();
    let client = channel.connect().await.unwrap();
    #[cfg(feature = "sqlite-db")]
    let wallet_db = {
        use zcash_client_sqlite::{
            chain::init::init_blockmeta_db, wallet::init::init_wallet_db, FsBlockDb, WalletDb,
        };

        let mut db_cache = FsBlockDb::for_path(&db_cache).unwrap();
        let mut wallet_db = WalletDb::for_path(&_db_data, Network::MainNetwork).unwrap();
        init_blockmeta_db(&mut db_cache).unwrap();
        init_wallet_db(&mut wallet_db, None).unwrap();
        wallet_db
    };

    #[cfg(not(feature = "sqlite-db"))]
    let wallet_db =
        zcash_client_memory::MemoryWalletDb::new(Network::TestNetwork, webz_core::PRUNING_DEPTH);

    let mut w = Wallet::new(
        wallet_db,
        client.clone(),
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


    // let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
    // tracing::info!("Created account with id: {}", id);
    let db_cache = MemBlockCache::new();
    let mut cpt_client = CompactTxStreamerClient::new(client.clone());

    run(
        &mut cpt_client,
        &Network::TestNetwork,
        &db_cache,
        w.inner_mut(),
        10000,
    )
    .await
    .unwrap();

    // tracing::info!("Syncing wallet");
    // w.sync(|scanned_to, tip| {
    //     println!("Scanned: {}/{}", scanned_to, tip);
    // })
    // .await
    // .unwrap();
    //
    // tracing::info!("Syncing complete :)");
    //
    // let summary = w.get_wallet_summary().unwrap();
    // tracing::info!("Wallet summary: {:?}", summary);
    //
    // tracing::info!("Proposing a transaction");
    // let addr = ZcashAddress::try_from_encoded("utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu");
    //
    // w.transfer(SEED, 0, addr.unwrap(), 1000).await.unwrap();
    // tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}
