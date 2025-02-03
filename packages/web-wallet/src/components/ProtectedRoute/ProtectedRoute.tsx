import { Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import { useMetaMask } from '../../hooks';

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { installedSnap } = useMetaMask();

  if (!installedSnap) return <Navigate to="/" replace />;

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
