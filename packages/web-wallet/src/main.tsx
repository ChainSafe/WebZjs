import { createRoot } from 'react-dom/client';

import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { WebZjsProvider } from './context/WebzjsContext';
import { MetaMaskProvider } from './context/MetamaskContext';

createRoot(document.getElementById('root')!).render(
  <MetaMaskProvider>
    <WebZjsProvider>
      <RouterProvider router={router} />
    </WebZjsProvider>
  </MetaMaskProvider>,
);
