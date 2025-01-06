import { useInterval } from 'usehooks-ts';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';
import Layout from '@components/Layout/Layout.tsx';
import { Outlet, useLocation } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants.ts';
import { useEffect } from 'react';

function App() {
  const { triggerRescan } = useWebZjsActions();
  const location = useLocation();

  useEffect(() => {
    // Add custom background to home page
    document.body.classList.remove('home-page-bg');
    if (location.pathname === '/') document.body.classList.add('home-page-bg');
  }, [location]);

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
