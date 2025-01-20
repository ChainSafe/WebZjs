import { useInterval } from 'usehooks-ts';
import { useWebZjsActions } from '@hooks/useWebzjsActions';
import Layout from '@components/Layout/Layout';
import { Outlet, useLocation } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants';
import { useEffect } from 'react';

function App() {
  const { triggerRescan } = useWebZjsActions();
  const location = useLocation();

  useEffect(() => {
    // Add custom background to home page
    if (location.pathname === '/') {
      document.body.classList.add('home-page', 'home-page-bg');
    } else {
      document.body.classList.remove('home-page', 'home-page-bg');
    }
  }, [location.pathname]);

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
