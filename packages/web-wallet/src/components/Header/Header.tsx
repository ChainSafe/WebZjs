import React from 'react';
import { Link } from 'react-router-dom';
import { MetaMaskSnapsLogoSvg, ZcashSvg } from '../../assets';

const Header = (): React.JSX.Element => {
  return (
    <header className="font-inter w-full px-16 flex items-center justify-between bg-transparent py-3 max-h-[3.125rem]">
      <Link to={'/'}>
        <div className="flex items-center">
          <div className="h-6 w-6 mr-3">
            <ZcashSvg />
          </div>
          <div className="h-6 w-full max-w-[200px]">
            <MetaMaskSnapsLogoSvg />
          </div>
        </div>
      </Link>
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
    </header>
  );
};

export default Header;
