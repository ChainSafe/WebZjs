import React from 'react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import { Outlet } from 'react-router-dom';

const Layout = ({ children }: React.PropsWithChildren): React.JSX.Element => {
  return (
    <div className="container mx-auto flex flex-col min-h-screen">
      <Header />
      <main className="grow flex justify-center py-3 self-stretch mt-[60px] w-full">
        {children ? children : <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
