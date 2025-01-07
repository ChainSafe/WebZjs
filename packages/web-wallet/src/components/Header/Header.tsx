import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MetaMaskLogoSvg, MetaMaskSnapsLogoSvg, ZcashSvg } from '../../assets';
import Button from '@components/Button/Button';
import { useMetaMask } from '@hooks/snaps/useMetaMask';

const Header = (): React.JSX.Element => {
  const { clearState } = useMetaMask();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="font-inter h-16 fixed top-0 left-0 w-full px-16 flex flex-grow items-center justify-between bg-transparent py-3 border-b border-neutral-200">
      <Link to={'/'}>
        <div className="flex items-center">
          <div className="h-6 w-6 mr-3">
            <ZcashSvg className="w-[25px] h-[25px]" />
          </div>
          <div className="h-6 w-full max-w-[200px]">
            {isHomePage ? (
              <MetaMaskSnapsLogoSvg />
            ) : (
              <MetaMaskLogoSvg className="w-[25px] h-[25px]" />
            )}
          </div>
        </div>
      </Link>
      {isHomePage ? (
        <nav className="flex">
          <a
            target="_blank"
            href="https://chainsafe.github.io/WebZjs/"
            className="px-6 relative after:content-['|'] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-[divide-dividerColor] hover:underline"
          >
            ZCash Docs
          </a>
          <a
            target="_blank"
            href="https://docs.metamask.io/snaps/"
            className="px-6 hover:underline"
          >
            Snap Docs
          </a>
          <a
            target="_blank"
            href="https://snaps.metamask.io/"
            className="hover:underline"
          >
            Snap Registry
          </a>
        </nav>
      ) : (
        <Button
          variant={'secondary'}
          classNames={'min-w-max '}
          onClick={() => clearState()}
          label={'Sign out'}
        />
      )}
    </header>
  );
};

export default Header;
