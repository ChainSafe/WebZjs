import { useInterval } from 'usehooks-ts';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';
import Layout from '@components/Layout/Layout.tsx';
import { Outlet, useLocation } from 'react-router-dom';
import { RESCAN_INTERVAL } from './config/constants.ts';
import { useEffect } from 'react';
import { MetaMaskProvider } from './context/MetamaskContext.tsx';
import { WebZjsProvider } from './context/WebzjsContext.tsx';

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
    <MetaMaskProvider>
      <WebZjsProvider>
        <Layout>
          <Outlet />
        </Layout>
      </WebZjsProvider>
    </MetaMaskProvider>
  );
}

export default App;
