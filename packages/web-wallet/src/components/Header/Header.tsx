import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ZcashPNG } from '../../assets';

const Header = (): React.JSX.Element => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="font-inter h-[60px] w-full px-16 flex items-center justify-between bg-transparent py-3 border-b border-gray-700">
      <Link to={'/'}>
        <div className="flex items-center">
          <img
            src={ZcashPNG}
            className="w-[25px] h-[25px] mr-3"
            alt="Zcash logo"
          />
          <div className="w-full max-w-[260px]">
            <div className="text-lg font-semibold leading-tight text-white">
              Zcash Web Wallet
            </div>
            {!isHomePage && (
              <div className="text-xs text-gray-400">Locally managed wallet</div>
            )}
          </div>
        </div>
      </Link>
    </header>
  );
};

export default Header;
