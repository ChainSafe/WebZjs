import React from 'react';

const Header = (): React.JSX.Element => {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-300 bg-white">
      <div className="flex items-center">
        <img
          src="../../assets/react.svg"
          alt="MetaMask Logo"
          className="h-6 w-6 mr-2"
        />
        <span className="text-lg font-medium">MetaMask | Snaps</span>
      </div>
      <nav className="flex space-x-4">
        <a href="#" className="text-gray-600 hover:underline">
          ZCash Docs
        </a>
        <a href="#" className="text-gray-600 hover:underline">
          Snap Docs
        </a>
        <a href="#" className="text-gray-600 hover:underline">
          Snap Registry
        </a>
      </nav>
    </header>
  );
};

export default Header;
