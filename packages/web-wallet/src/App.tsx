import { useInterval } from 'usehooks-ts';
import { RESCAN_INTERVAL } from '@webzjs/demo-wallet/src/App/Constants.tsx';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';
import Layout from '@components/Layout/Layout.tsx';
import { Outlet } from 'react-router-dom';

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
