import React from 'react';
import { Link } from 'react-router-dom';
import ZcashSvg from '../../assets/zcash.svg';
import MetemaskSnap from '../../assets/metamask-snaps-logo.svg';

const Header = (): React.JSX.Element => {
  return (
    <header className="font-inter w-full px-16 flex items-center justify-between bg-transparent max-h-[3.125rem]">
      <Link to={'/'}>
        <div className="flex items-center">
          <img src={ZcashSvg} alt="MetaMask Logo" className="h-6 w-6 mr-3" />
          <img
            src={MetemaskSnap}
            alt="MetaMask Logo"
            className="h-12 w-full max-w-[200px]"
          />
        </div>
      </Link>
      <nav className="flex">
        <a
          target="_blank"
          href="https://chainsafe.github.io/WebZjs/"
          className="text-gray-600 px-6 relative after:content-['|'] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-[divide-dividerColor] hover:underline"
        >
          ZCash Docs
        </a>
        <a
          target="_blank"
          href="https://docs.metamask.io/snaps/"
          className="text-gray-600 px-6 hover:underline"
        >
          Snap Docs
        </a>
        <a
          target="_blank"
          href="https://snaps.metamask.io/"
          className="text-gray-600 hover:underline"
        >
          Snap Registry
        </a>
      </nav>
    </header>
  );
};

export default Header;
