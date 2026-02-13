import React, { useEffect, useState, useRef } from 'react';
import { ZcashYellowPNG, FormTransferSvg, MetaMaskLogoPNG } from '../assets';
import { useNavigate } from 'react-router-dom';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMaskContext } from '../context/MetamaskContext';
import { useMetaMask, useWebZjsActions } from '../hooks';
import Loader from '../components/Loader/Loader';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch, initWallet } = useWebZjsContext();
  const { getAccountData, connectWebZjsSnap, recoverWallet } = useWebZjsActions();
  const { installedSnap } = useMetaMask();
  const { isPendingRequest } = useMetaMaskContext();
  const [showResetInstructions, setShowResetInstructions] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const recoveryAttemptedRef = useRef(false);
  const connectingRef = useRef(false);

  const handleConnectButton: React.MouseEventHandler<
    HTMLButtonElement
  > = async (e) => {
    e.preventDefault();
    connectingRef.current = true;
    try {
      // Lazy-load WASM on first user interaction
      await initWallet();
      await connectWebZjsSnap();
      navigate('/dashboard/account-summary');
    } catch (err: any) {
      // Handle user rejection gracefully (code 4001)
      if (err?.code === 4001) {
        console.log('User rejected MetaMask connection');
        return;
      }
      // Other errors should be shown to user
      console.error('Connection failed:', err);
      dispatch({ type: 'set-error', payload: err instanceof Error ? err : new Error(String(err)) });
    } finally {
      connectingRef.current = false;
    }
  };

  useEffect(() => {
    if (state.loading) return;
    if (!installedSnap) return;

    const homeReload = async () => {
      // Case 1: Account exists - go to dashboard
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
        return;
      }

      // Case 2: Wallet not initialized yet - initialize it first
      if (!state.initialized && !connectingRef.current) {
        try {
          setRecovering(true);
          await initWallet();
          // After init completes, effect will re-run with updated state
        } catch (err) {
          console.error('Wallet initialization failed:', err);
          dispatch({ type: 'set-error', payload: err instanceof Error ? err : new Error(String(err)) });
          setShowResetInstructions(true);
        } finally {
          setRecovering(false);
        }
        return;
      }

      // Case 3: Wallet initialized but no account - attempt recovery (once only)
      if (state.initialized && !recoveryAttemptedRef.current && !connectingRef.current) {
        recoveryAttemptedRef.current = true;
        try {
          setRecovering(true);
          await recoverWallet();
          navigate('/dashboard/account-summary');
        } catch (err) {
          console.error('Auto-recovery failed:', err);
          dispatch({ type: 'set-error', payload: err instanceof Error ? err : new Error(String(err)) });
          setShowResetInstructions(true);
        } finally {
          setRecovering(false);
        }
      }
    };

    homeReload();
  }, [state.loading, state.activeAccount, state.initialized, installedSnap, navigate, dispatch, getAccountData, recoverWallet, initWallet]);

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
                <li>Open DevTools ➛ Application ➛ IndexedDB ➛ keyval-store ➛ Delete database(s)</li>
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
          {isPendingRequest && (
            <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              <div className="font-medium">MetaMask request pending</div>
              <div className="mt-1">
                Check MetaMask for a pending approval request. If you switched between MetaMask versions (e.g., Flask to regular), refresh the page and try again.
              </div>
            </div>
          )}
          <button
            disabled={state.loading || isPendingRequest || recovering}
            onClick={handleConnectButton}
            className={`flex items-center bg-button-black-gradient hover:bg-button-black-gradient-hover text-white px-6 py-3 rounded-[2rem] ${state.loading || isPendingRequest || recovering ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <span>{state.loading ? 'Wallet Initializing...' : recovering ? 'Recovering Wallet...' : isPendingRequest ? 'Waiting for MetaMask...' : 'Connect MetaMask Snap'}</span>
            {(state.loading || isPendingRequest || recovering) && (
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
