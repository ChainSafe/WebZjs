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
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
