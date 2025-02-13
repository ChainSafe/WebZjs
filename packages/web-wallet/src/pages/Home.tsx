import React, { useEffect, useState } from 'react';
import { ZcashYellowPNG, FormTransferSvg, MetaMaskLogoPNG } from '../assets';
import { useNavigate } from 'react-router-dom';
import { useWebZjsContext } from '../context/WebzjsContext';
import {
  useInvokeSnap,
  useRequestSnap,
  useMetaMask,
  useWebZjsActions,
} from '../hooks';

const Home: React.FC = () => {
  const [birthdayHeight, setBirthdayHeight] = useState(0);
  const navigate = useNavigate();
  const { state } = useWebZjsContext();
  const { flushDbToStore, addNewAccountFromUfvk, getAccountData } = useWebZjsActions();
  const invokeSnap = useInvokeSnap();
  const { installedSnap, isFlask } = useMetaMask();
  const requestSnap = useRequestSnap();

  useEffect(() => {
    const fetchBirthday = async () => {
      const birthday = await state.webWallet?.get_latest_block();
      setBirthdayHeight(Number(birthday) || 0);
    };
    fetchBirthday();
  }, [state]);

  const handleRequestSnapAndGetViewingKey: React.MouseEventHandler<
    HTMLButtonElement
  > = async (e) => {
    e.preventDefault();
    await requestSnap();

    const {viewingKey, customBirthdayBlock} = (await invokeSnap({ method: 'getViewingKey' })) as {viewingKey: string, customBirthdayBlock: number | null};

    const creationBlockHeight = customBirthdayBlock || birthdayHeight;

    await addNewAccountFromUfvk(viewingKey, creationBlockHeight);

    await flushDbToStore();
  };

  useEffect(() => {
    if (installedSnap) {
      const homeReload = async () => {
        const accountData = await getAccountData();

        if(accountData?.unifiedAddress) navigate('/dashboard/account-summary')
      }
      homeReload();
    } ;
  }, [installedSnap, navigate, getAccountData, state.activeAccount]);

  return (
    <div className="home-page flex items-start md:items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-14">
        <div className="hidden md:flex items-end justify-end">
          <FormTransferSvg />
        </div>
        <div className="flex flex-col items-start space-y-8">
          <img src={ZcashYellowPNG} className="w-10 h-10" alt="Zcash Logo" />
          <h1 className="font-inter font-semibold text-[5rem] leading-[5rem] we">
            Zcash <br />
            Web Wallet
          </h1>
          <p className="font-inter">
            Access the Zcash network from your web browser with the Zcash
            MetaMask Snap
          </p>
          <button
            disabled={!isFlask}
            onClick={handleRequestSnapAndGetViewingKey}
            className="flex items-center bg-button-black-gradient hover:bg-button-black-gradient-hover text-white px-6 py-3 rounded-[2rem] cursor-pointer"
          >
            <span>Connect MetaMask Snap</span>
            <div className="ml-3">
              <img
                src={MetaMaskLogoPNG}
                className="w-[22px] h-[20px]"
                alt="MetaMask Logo"
              />
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
