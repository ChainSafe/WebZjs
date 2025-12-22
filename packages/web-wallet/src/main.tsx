import { createRoot } from 'react-dom/client';

import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { WebZjsProvider } from './context/WebzjsContext';
import { StarknetWalletProvider } from './context/StarknetWalletContext';

createRoot(document.getElementById('root')!).render(
  <WebZjsProvider>
    <StarknetWalletProvider>
      <RouterProvider router={router} />
    </StarknetWalletProvider>
  </WebZjsProvider>,
);
