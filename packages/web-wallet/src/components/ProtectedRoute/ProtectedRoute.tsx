import { Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import { useWebZjsContext } from '../../context/WebzjsContext';

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { state } = useWebZjsContext();
  const hasWallet = !!state.webWallet && state.activeAccount !== null;

  if (!hasWallet) return <Navigate to="/" replace />;

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
