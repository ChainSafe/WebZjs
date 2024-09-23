use std::sync::Once;

use std::num::NonZeroU32;
use webz_core::Wallet;
use zcash_address::ZcashAddress;
use zcash_primitives::consensus::Network;

wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

const SEED: &str = "visit armed kite pen cradle toward reward clay marble oil write dove blind oyster silk oyster original message skate bench tone enable stadium element";
const HD_INDEX: u32 = 0;
const BIRTHDAY: Option<u32> = Some(2577329);

static INIT: Once = Once::new();

pub fn initialize() {
    INIT.call_once(|| {
        webz_core::init::start();
    });
}

#[cfg(feature = "native")]
#[tokio::main]
async fn main() {
    let db_cache = tempfile::tempdir().unwrap();
    let _db_data = tempfile::NamedTempFile::new_in(db_cache.path()).unwrap();

    initialize();
    rayon::spawn(|| {
        let num_parallel = rayon::current_num_threads();
        tracing::info!("Native rayon has {} threads", num_parallel);
    });

    let url = "https://testnet.zec.rocks:443";
    let c = tonic::transport::Channel::from_shared(url).unwrap();

    let tls = tonic::transport::ClientTlsConfig::new()
        .domain_name("testnet.zec.rocks")
        .with_webpki_roots();
    let channel = c.tls_config(tls).unwrap();

    #[cfg(feature = "sqlite-db")]
    let wallet_db = {
        use zcash_client_sqlite::{
            chain::init::init_blockmeta_db, wallet::init::init_wallet_db, FsBlockDb, WalletDb,
        };

        let mut db_cache = FsBlockDb::for_path(&db_cache).unwrap();
        let mut wallet_db = WalletDb::for_path(&_db_data, Network::TestNetwork).unwrap();
        init_blockmeta_db(&mut db_cache).unwrap();
        init_wallet_db(&mut wallet_db, None).unwrap();
        wallet_db
    };

    #[cfg(not(feature = "sqlite-db"))]
    let wallet_db =
        zcash_client_memory::MemoryWalletDb::new(Network::TestNetwork, webz_core::PRUNING_DEPTH);

    let mut w = Wallet::new(
        wallet_db,
        channel.connect().await.unwrap(),
        Network::TestNetwork,
        NonZeroU32::try_from(1).unwrap(),
    )
    .unwrap();

    let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
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

    tracing::info!("Proposing a transaction");
    let addr = ZcashAddress::try_from_encoded("utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu");

    w.transfer(SEED, 0, addr.unwrap(), 1000).await.unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().await.unwrap();
    tracing::info!("Wallet summary: {:?}", summary);


    #[cfg(not(feature = "sqlite-db"))]
    {
        tracing::info!("Serializing wallet");
        let serialized_wallet = w.to_vec_postcard().await;
        let byte_count = byte_unit::Byte::from_u64(serialized_wallet.len() as u64);

        tracing::info!(
            "Wallet serialized: {}",
            byte_count
                .get_adjusted_unit(byte_unit::Unit::MB)
                .to_string()
        )
    }
}
