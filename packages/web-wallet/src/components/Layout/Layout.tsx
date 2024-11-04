import Header from '../Header/Header.tsx';
import { Outlet } from 'react-router-dom';
import React from 'react';
import Footer from '../Footer/Footer.tsx';

const Layout = (): React.JSX.Element => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center p-6 bg-gray-100">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
