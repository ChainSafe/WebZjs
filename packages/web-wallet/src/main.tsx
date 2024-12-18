import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MetaMaskProvider } from './context/MetamaskContext.tsx';
import { WebZjsProvider } from './context/WebzjsContext.tsx';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetaMaskProvider>
      <WebZjsProvider>
        <RouterProvider router={router} />;
      </WebZjsProvider>
    </MetaMaskProvider>
  </StrictMode>,
);
