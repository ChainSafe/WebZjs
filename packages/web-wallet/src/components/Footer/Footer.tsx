import React from 'react';
import { StarknetSymbolPNG, NearIconPNG, ZcashBrandmarkPNG } from '../../assets';

const Footer = (): React.JSX.Element => {
  return (
    <footer className="w-full py-6 flex items-center justify-center font-medium">
      <div className="flex items-center text-xs text-gray-400">
        <span className="block mr-2 text-xs">Powered by</span>
        <div className="inline-block w-5 h-5 mr-1">
          <img
            src={StarknetSymbolPNG}
            className="w-5 h-5"
            alt="Starknet logo"
          />
        </div>
        <span className="text-xs mr-2">Starknet</span>
        <span className="text-xs mx-1">x</span>
        <div className="inline-block w-5 h-5 mr-1">
          <img
            src={NearIconPNG}
            className="w-5 h-5"
            alt="Near logo"
          />
        </div>
        <span className="text-xs mr-2">Near</span>
        <span className="text-xs mx-1">x</span>
        <div className="inline-block w-5 h-5 mr-1">
          <img
            src={ZcashBrandmarkPNG}
            className="w-5 h-5"
            alt="Zcash logo"
          />
        </div>
        <span className="text-xs">Zcash</span>
      </div>
    </footer>
  );
};

export default Footer;
