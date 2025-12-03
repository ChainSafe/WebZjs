import React, { useEffect, useState } from 'react';
import { ZcashYellowPNG, FormTransferSvg, MetaMaskLogoPNG } from '../assets';
import { useNavigate } from 'react-router-dom';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMask, useWebZjsActions } from '../hooks';
import Loader from '../components/Loader/Loader';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useWebZjsContext();
  const { getAccountData, connectWebZjsSnap } = useWebZjsActions();
  const { installedSnap } = useMetaMask();
  const [showResetInstructions, setShowResetInstructions] = useState(false);


  const handleConnectButton: React.MouseEventHandler<
    HTMLButtonElement
  > = async (e) => {
    e.preventDefault();
    await connectWebZjsSnap();
  };

  useEffect(() => {
    if (state.loading) {
      return;
    }
    if (installedSnap) {
      const homeReload = async () => {
        if (state.activeAccount !== null && state.activeAccount !== undefined) {
          try {
            const accountData = await getAccountData();
            if (accountData?.unifiedAddress) {
              navigate('/dashboard/account-summary');
            } else {
              dispatch({ type: 'set-error', payload: 'Unified address not available for the active account' });
              setShowResetInstructions(true);
            }
          } catch (err) {
            dispatch({ type: 'set-error', payload: err instanceof Error ? err : new Error(String(err)) });
            setShowResetInstructions(true);
          }
        } else {
          dispatch({ type: 'set-error', payload: 'Active account is not set' });
          setShowResetInstructions(true);
        }

      };
      homeReload();
    };
  }, [navigate, getAccountData, state.activeAccount, state.loading]);

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
          {showResetInstructions && (
            <div className="w-full space-y-2 bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-xl">
              <div>Error occurred while loading the wallet data, please reset the wallet</div>
              <div>To reset manually:</div>
              <ul className="list-disc pl-6 space-y-1">
                <li>Open DevTools ➛ Application ➛ IndexedDB ➛ keyval-store ➛ Delete database</li>
                <li>Open Metamask ➛ ⋮ ➛ Snaps ➛ Zcash Shielded Wallet ➛ Remove Zcash Shielded Wallet ➛ Remove Snap</li>
                <li>Refresh the page and start installation again</li>
              </ul>
              <details className="mt-2">
                <summary className="cursor-pointer underline">Show error details</summary>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-red-700">
                  {typeof state.error === 'string' ? state.error : (state.error ? state.error.toString() : 'No additional error details')}
                </div>
              </details>
            </div>
          )}
          <button
            disabled={state.loading}
            onClick={handleConnectButton}
            className={`flex items-center bg-button-black-gradient hover:bg-button-black-gradient-hover text-white px-6 py-3 rounded-[2rem] ${state.loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span>{state.loading ? 'Wallet Initializing...' : 'Connect MetaMask Snap'}</span>
            {state.loading && (
              <div className="ml-3">
                <Loader />
              </div>
            )}
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
