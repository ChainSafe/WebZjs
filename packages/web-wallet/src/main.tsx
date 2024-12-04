import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '@pages/Home';
import Layout from '@components/Layout/Layout';
import { MetaMaskProvider } from '@hooks/MetamaskContext';
import Dashboard from '@pages/Dashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetaMaskProvider>
      <RouterProvider router={router} />
    </MetaMaskProvider>
  </StrictMode>,
);
