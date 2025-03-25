import { useInterval } from 'usehooks-ts';
import { Outlet } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants';
import { useWebZjsActions } from './hooks';
import Layout from './components/Layout/Layout';

function App() {
  // const { triggerRescan } = useWebZjsActions();

  // useInterval(() => {
  //   triggerRescan();
  // }, RESCAN_INTERVAL);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
