import { Navigate, Outlet } from 'react-router-dom';
import { useMetaMask } from '@hooks/useMetaMask.ts';
import React from 'react';

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { installedSnap } = useMetaMask();

  if (!installedSnap) return <Navigate to="/" replace />;

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
