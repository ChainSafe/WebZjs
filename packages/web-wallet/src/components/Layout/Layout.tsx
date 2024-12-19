import React from 'react';
import Header from '../Header/Header.tsx';
import Footer from '../Footer/Footer.tsx';
import { Outlet } from 'react-router-dom';

const Layout = ({ children }: React.PropsWithChildren): React.JSX.Element => {
  return (
    <div className="container mx-auto flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center py-3 self-stretch w-full">
        {children ? children : <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
