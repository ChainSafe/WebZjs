import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '@components/NavBar/NavBar';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full">
      <NavBar />
      <div className="flex flex-col align-middle w-full mx-auto max-w-[1000px]">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
