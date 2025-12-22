import React, { useEffect, useState } from 'react';
import { ZcashYellowPNG, StarknetSymbolPNG, NearIconPNG, ZcashBrandmarkPNG } from '../assets';
import { useNavigate } from 'react-router-dom';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useWebZjsActions } from '../hooks';
import Loader from '../components/Loader/Loader';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useWebZjsContext();
  const { getAccountData } = useWebZjsActions();
  const [showResetInstructions, setShowResetInstructions] = useState(false);

  const openWallet = async () => {
    if (state.activeAccount !== null && state.activeAccount !== undefined) {
      try {
        const accountData = await getAccountData();
        if (accountData?.unifiedAddress) {
          navigate('/dashboard/account-summary');
          return;
        }
        dispatch({
          type: 'set-error',
          payload: 'Unified address not available for the active account',
        });
      } catch (err) {
        dispatch({
          type: 'set-error',
          payload: err instanceof Error ? err : new Error(String(err)),
        });
      }
    } else {
      dispatch({ type: 'set-error', payload: 'Active account is not set' });
    }
    setShowResetInstructions(true);
  };

  useEffect(() => {
    if (state.loading) {
      return;
    }
    openWallet().catch(console.error);
  }, [navigate, getAccountData, state.activeAccount, state.loading]);

  return (
    <div className="home-page flex items-start md:items-center justify-center px-4 overflow-y-hidden">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-14">
        <div className="hidden md:flex items-center justify-center">
          <div className="flex flex-col items-center space-y-8 text-gray-400">
            <div className="flex flex-col items-center space-y-2">
              <img
                src={StarknetSymbolPNG}
                className="w-20 h-20"
                alt="Starknet logo"
              />
              <span className="text-sm">Starknet</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <img
                src={NearIconPNG}
                className="w-20 h-20"
                alt="Near logo"
              />
              <span className="text-sm">Near</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <img
                src={ZcashBrandmarkPNG}
                className="w-28 h-28"
                alt="Zcash logo"
              />
              <span className="text-sm">Zcash</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start space-y-8">
          <img src={ZcashYellowPNG} className="w-10 h-10" alt="Zcash Logo" />
          <h1 className="font-inter font-semibold text-[5rem] leading-[5rem] we text-white">
            Zcash <br />
            Web Wallet
          </h1>
          <p className="font-inter text-gray-300">
            Make shielded transfers from Starknet to Starknet via Zcash and Near intents
          </p>
          {showResetInstructions && (
            <div className="w-full space-y-2 bg-red-900/30 border border-red-700 text-red-300 px-4 py-4 rounded-xl">
              <div>
                Error occurred while loading the wallet data, please reset the
                wallet
              </div>
              <div>To reset manually:</div>
              <ul className="list-disc pl-6 space-y-1">
                <li>Open DevTools ➛ Application ➛ IndexedDB ➛ keyval-store ➛ Delete database</li>
                <li>Refresh the page and reload the wallet</li>
              </ul>
              <details className="mt-2">
                <summary className="cursor-pointer underline">Show error details</summary>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-red-400">
                  {typeof state.error === 'string' ? state.error : (state.error ? state.error.toString() : 'No additional error details')}
                </div>
              </details>
            </div>
          )}
          <button
            disabled={state.loading}
            onClick={openWallet}
            className={`flex items-center bg-button-black-gradient hover:bg-button-black-gradient-hover text-white px-6 py-3 rounded-[2rem] ${state.loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span>{state.loading ? 'Wallet Initializing...' : 'Open Wallet'}</span>
            {state.loading && (
              <div className="ml-3">
                <Loader />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
