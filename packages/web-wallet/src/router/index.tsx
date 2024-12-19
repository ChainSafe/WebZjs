import { createBrowserRouter } from 'react-router-dom';
import Home from '@pages/Home.tsx';
import ProtectedRoute from '@components/ProtectedRoute/ProtectedRoute.tsx';
import Dashboard from '@pages/Dashboard.tsx';
import AccountSummary from '@pages/AccountSummary.tsx';
import TransferBalance from '@pages/TransferBalance/TransferBalance.tsx';
import Receive from '@pages/Receive.tsx';
import TransactionHistory from '@pages/TransactionHistory.tsx';
import App from '../App.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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

export { router };
