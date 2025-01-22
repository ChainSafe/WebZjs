import { createBrowserRouter } from 'react-router-dom';
import Home from '@pages/Home';
import ProtectedRoute from '@components/ProtectedRoute/ProtectedRoute';
import Dashboard from '@pages/Dashboard';
import AccountSummary from '@pages/AccountSummary';
import TransferBalance from '@pages/TransferBalance/TransferBalance';
import Receive from '@pages/Receive/Receive';
import TransactionHistory from '@pages/TransactionHistory';
import App from '../App';

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
