import React, { useEffect } from 'react';
import FormSvg from '../assets/form-transfer.svg';
import { MetaMaskLogoSvg, ZcashYellowSvg } from '../assets';
import { useMetaMask } from '@hooks/useMetaMask.ts';
import { useRequestSnap } from '@hooks/useRequestSnap.ts';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { installedSnap, isFlask } = useMetaMask();
  const requestSnap = useRequestSnap();

  useEffect(() => {
    if (installedSnap) navigate('/dashboard');
  }, [installedSnap, navigate]);

  return (
    <div className="flex items-start md:items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-14">
        <div className="hidden md:flex items-end justify-end">
          <img src={FormSvg} alt="Form transfer image" />
        </div>
        <div className="flex flex-col items-start space-y-8">
          <img src={ZcashYellowSvg} alt="Zcash Yellow Logo" />
          <h1 className="font-inter font-semibold text-[5rem] leading-[5rem] we">
            Zcash <br />
            Web Wallet
          </h1>
          <p className="font-inter">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <button
            disabled={!isFlask}
            onClick={requestSnap}
            className="flex items-center bg-buttonBlackGradient hover:bg-buttonBlackGradientHover text-white px-6 py-3 rounded-[2rem]"
          >
            <span>Connect MetaMask Snap</span>
            <img src={MetaMaskLogoSvg} className="ml-3" alt="MetaMask" />
          </button>
          <div className="text-sm">
            <span>Already have an account?</span>{' '}
            <a href="#" className="underline">
              Restore account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
