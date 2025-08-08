import React, { useEffect } from 'react';
import { ZcashYellowPNG, FormTransferSvg, MetaMaskLogoPNG } from '../assets';
import { useNavigate } from 'react-router-dom';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMask, useWebZjsActions } from '../hooks';
import { useMetaMaskContext } from 'src/context/MetamaskContext';
import { useGetSnapState } from 'src/hooks/snaps/useGetSnapState';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useWebZjsContext();
  const { getAccountData, connectWebZjsSnap } = useWebZjsActions();
  const { installedSnap } = useMetaMask();
  const { getSnapState } = useGetSnapState();
  const { setSnapState } = useMetaMaskContext();

  const handleConnectButton: React.MouseEventHandler<
    HTMLButtonElement
  > = async (e) => {
    e.preventDefault();
    await connectWebZjsSnap();
  };

  useEffect(() => {
    if (installedSnap) {
      const homeReload = async () => {
        if (state.activeAccount !== null && state.activeAccount !== undefined) {
          const accountData = await getAccountData();
          
          if (accountData?.unifiedAddress) {
            navigate('/dashboard/account-summary');
          }
        }

      };
      homeReload();
    };
  }, [navigate, getAccountData, state.activeAccount, installedSnap]);

  return (
    <div className="home-page flex items-start md:items-center justify-center px-4 overflow-y-hidden">
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
          {!!installedSnap && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl">
              Make sure you MetaMask is unlocked to continue
            </div>
          )}
          <button
            disabled={!!installedSnap}
            onClick={handleConnectButton}
            className={`flex items-center bg-button-black-gradient hover:bg-button-black-gradient-hover text-white px-6 py-3 rounded-[2rem] ${!!installedSnap ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span>{!!installedSnap ? 'Loading Web Wallet...' : 'Connect MetaMask Snap'}</span>
            <div className="ml-3">
              <img
                src={MetaMaskLogoPNG}
                className="w-[22px] h-[20px]"
                alt="MetaMask Logo"
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
