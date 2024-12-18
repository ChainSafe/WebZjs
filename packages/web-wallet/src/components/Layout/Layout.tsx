import Header from '../Header/Header.tsx';
import { Outlet } from 'react-router-dom';
import React from 'react';
import Footer from '../Footer/Footer.tsx';

const Layout = (): React.JSX.Element => {
  return (
    <div className="container mx-auto flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center py-3 self-stretch w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
