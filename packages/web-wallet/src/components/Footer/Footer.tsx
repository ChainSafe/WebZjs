import React from 'react';

const Footer = (): React.JSX.Element => {
  return (
    <footer className="w-full py-4 flex items-center justify-center border-t border-gray-300 bg-white">
      <p className="text-gray-500">
        Made and Maintained by{' '}
        <a href="#" className="text-blue-600 hover:underline">
          ChainSafe
        </a>
      </p>
    </footer>
  );
};

export default Footer;
