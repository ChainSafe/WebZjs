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

  const interval = installedSnap && state.initialized && !state.syncInProgress ? RESCAN_INTERVAL : null;

  useInterval(() => {
    triggerRescan();
  }, interval);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
