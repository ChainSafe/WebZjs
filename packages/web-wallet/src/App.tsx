import { useInterval } from 'usehooks-ts';
import { Outlet } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants';
import { useWebZjsActions } from './hooks';
import Layout from './components/Layout/Layout';
import { useWebZjsContext } from './context/WebzjsContext';

function App() {
  const { triggerRescan } = useWebZjsActions();
  const { state } = useWebZjsContext();

  useInterval(() => {
    triggerRescan();
  }, state.webWallet ? RESCAN_INTERVAL : null);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
