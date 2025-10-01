import { useInterval } from 'usehooks-ts';
import { Outlet } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants';
import { useWebZjsActions } from './hooks';
import Layout from './components/Layout/Layout';
import { useMetaMaskContext } from './context/MetamaskContext';

function App() {
  const { triggerRescan } = useWebZjsActions();
  const { installedSnap } = useMetaMaskContext();

  useInterval(() => {
    triggerRescan();
  }, installedSnap ? RESCAN_INTERVAL : null);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
