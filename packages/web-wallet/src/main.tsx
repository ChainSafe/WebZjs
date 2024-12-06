import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '@pages/Home';
import Layout from '@components/Layout/Layout';
import { MetaMaskProvider } from '@hooks/MetamaskContext';
import Dashboard from '@pages/Dashboard.tsx';
import AccountSummary from '@pages/AccountSummary';
import TransferBalance from '@pages/TransferBalance';
import Receive from '@pages/Receive.tsx';
import TransactionHistory from '@pages/TransactionHistory';
import ProtectedRoute from '@components/ProtectedRoute/ProtectedRoute';

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
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
        children: [
          { path: 'account-summary', element: <AccountSummary /> },
          { path: 'transfer-balance', element: <TransferBalance /> },
          { path: 'receive', element: <Receive /> },
          { path: 'transaction-history', element: <TransactionHistory /> },
        ],
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
