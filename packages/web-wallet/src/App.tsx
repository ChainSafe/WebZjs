import { useInterval } from 'usehooks-ts';
import { Outlet } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants';
import { useWebZjsActions } from './hooks';
import Layout from './components/Layout/Layout';
import { useMetaMaskContext } from './context/MetamaskContext';
import { useWebZjsContext } from './context/WebzjsContext';

function App() {
  const { triggerRescan } = useWebZjsActions();
  const { installedSnap } = useMetaMaskContext();
  const { state } = useWebZjsContext();

  // Guard: Don't auto-sync if sync is in progress or there's an error (recovery in progress)
  useInterval(() => {
    triggerRescan();
  }, installedSnap && !state.syncInProgress && !state.error ? RESCAN_INTERVAL : null);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-b-xl text-sm md:text-base">
        <strong>Attention</strong> - this snap is under active development to bring it up to date
        with the latest NU 6.1 update. Users may experience various issues until this update is
        completed and should exercise caution if using the snap until the update is complete and
        this banner is removed.
      </div>
      <Layout>
        <Outlet />
      </Layout>
    </div>
  );
}

export default App;
