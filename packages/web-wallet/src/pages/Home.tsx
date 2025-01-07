import React, { useEffect, useState } from 'react';
import { MetaMaskLogoSvg, ZcashYellowSvg, FormTransferSvg } from '../assets';
import { useMetaMask } from '@hooks/snaps/useMetaMask.ts';
import { useRequestSnap } from '@hooks/snaps/useRequestSnap.ts';
import { useNavigate } from 'react-router-dom';
import { useInvokeSnap } from '@hooks/snaps/useInvokeSnap.ts';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';

const Home: React.FC = () => {
  const [birthdayHeight, setBirthdayHeight] = useState(0);
  const navigate = useNavigate();
  const { flushDbToStore, addNewAccountFromUfvk } = useWebZjsActions();
  const invokeSnap = useInvokeSnap();
  const { installedSnap, isFlask } = useMetaMask();
  const requestSnap = useRequestSnap();

  const handleRequestSnapAndGetViewingKey: React.MouseEventHandler<
    HTMLButtonElement
  > = async (e) => {
    e.preventDefault();
    await requestSnap();

    const viewKey = (await invokeSnap({ method: 'getViewingKey' })) as string;
    console.log(viewKey);

    await addNewAccountFromUfvk(viewKey, birthdayHeight);
    setBirthdayHeight(0);

    await flushDbToStore();
  };

  useEffect(() => {
    if (installedSnap) navigate('/dashboard/account-summary');
  }, [installedSnap, navigate]);

  return (
    <div className="home-page flex items-start md:items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-14">
        <div className="hidden md:flex items-end justify-end">
          <FormTransferSvg />
        </div>
        <div className="flex flex-col items-start space-y-8">
          <ZcashYellowSvg />
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
            onClick={handleRequestSnapAndGetViewingKey}
            className="flex items-center bg-buttonBlackGradient hover:bg-buttonBlackGradientHover text-white px-6 py-3 rounded-[2rem]"
          >
            <span>Connect MetaMask Snap</span>
            <div className="ml-3">
              <MetaMaskLogoSvg />
            </div>
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
