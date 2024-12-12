import { useInterval } from 'usehooks-ts';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';
import Layout from '@components/Layout/Layout.tsx';
import { Outlet } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants.ts';

function App() {
  const { triggerRescan } = useWebZjsActions();

  // rescan the wallet periodically
  useInterval(() => {
    triggerRescan();
  }, RESCAN_INTERVAL);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
