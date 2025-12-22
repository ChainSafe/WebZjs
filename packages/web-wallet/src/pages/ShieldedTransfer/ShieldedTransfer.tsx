import React, { useEffect, useState, useRef } from 'react';
import { useWebZjsActions } from '../../hooks';
import { usePczt, PcztTransferStatus } from '../../hooks/usePCZT';
import { useWebZjsContext } from '../../context/WebzjsContext';
import { useStarknetWallet } from '../../context/StarknetWalletContext';
import useBalance from '../../hooks/useBalance';
import { zatsToZec, strkToSmallestUnit } from '../../utils';
import { getQuote, QuoteResponse, submitTxHash } from '../../services/nearIntents';
import PageHeading from '../../components/PageHeading/PageHeading';
import Loader from '../../components/Loader/Loader';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import TransactionStatusCard from '../../components/TransactionStatusCard/TransactionStatusCard';
import { CheckSVG, WarningSVG } from '../../assets';
import { useInterval } from 'usehooks-ts';
import type { StarknetWindowObject } from '@starknet-io/get-starknet-core';

// Transaction fee in zatoshis (0.00015 ZEC)
const TRANSACTION_FEE_ZATOSHIS = 15000;

// Asset identifiers for Near Intents
const STARKNET_ASSET = 'nep141:starknet.omft.near';
const ZEC_ASSET = 'nep141:zec.omft.near';

// STRK token contract address on Starknet mainnet
// This is the standard STRK token contract
const STRK_TOKEN_CONTRACT = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

enum ShieldedTransferStatus {
  INITIAL = 'initial',
  QUOTE_RECEIVED = 'quote_received',
  WAITING_DEPOSIT = 'waiting_deposit',
  FUNDS_RECEIVED = 'funds_received',
  READY_TO_SEND = 'ready_to_send',
  TRANSFERRING = 'transferring',
  COMPLETE = 'complete',
  ERROR = 'error',
}

function ShieldedTransfer(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [unifiedAddress, setUnifiedAddress] = useState('');
  const [starknetAddress, setStarknetAddress] = useState('');
  const [senderStarknetAddress, setSenderStarknetAddress] = useState('');
  const [strkAmount, setStrkAmount] = useState('');
  const [status, setStatus] = useState<ShieldedTransferStatus>(
    ShieldedTransferStatus.INITIAL,
  );
  const [previousBalance, setPreviousBalance] = useState(0);
  const [firstQuote, setFirstQuote] = useState<QuoteResponse | null>(null);
  const [secondQuote, setSecondQuote] = useState<QuoteResponse | null>(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [firstLegTxHash, setFirstLegTxHash] = useState('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [starknetAddressError, setStarknetAddressError] = useState('');
  const [senderStarknetAddressError, setSenderStarknetAddressError] = useState('');
  const [strkAmountError, setStrkAmountError] = useState('');
  const [quoteError, setQuoteError] = useState('');
  const [monitoringActive, setMonitoringActive] = useState(false);
  const transferTriggeredRef = useRef(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<StarknetWindowObject[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  const { getAccountData, triggerRescan } = useWebZjsActions();
  const { handlePcztTransaction, pcztTransferStatus } = usePczt();
  const { state } = useWebZjsContext();
  const { shieldedBalance } = useBalance();
  const {
    walletAccount,
    address: walletAddress,
    isConnected: isWalletConnected,
    connectWallet,
    disconnectWallet,
    getAvailableWalletsList,
    error: walletError,
  } = useStarknetWallet();

  // Calculate sendable amount (balance minus fees)
  const calculateSendableAmount = (balance: number): number => {
    if (balance <= TRANSACTION_FEE_ZATOSHIS) {
      return 0;
    }
    return balance - TRANSACTION_FEE_ZATOSHIS;
  };

  // Check if balance is sufficient for transfer (must be more than fee)
  const isBalanceSufficient = (balance: number): boolean => {
    return balance > TRANSACTION_FEE_ZATOSHIS;
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAccountData();
      if (data) {
        setUnifiedAddress(data.unifiedAddress);
      }
      setLoading(false);
    };
    fetchData();
  }, [getAccountData]);

  // Initialize previous balance when component mounts
  useEffect(() => {
    if (!loading && shieldedBalance !== undefined) {
      setPreviousBalance(shieldedBalance);
      console.log(
        '[ShieldedTransfer] Initial balance:',
        zatsToZec(shieldedBalance),
        'ZEC',
      );
    }
  }, [loading, shieldedBalance]);

  // Auto-populate sender address when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress && !senderStarknetAddress) {
      setSenderStarknetAddress(walletAddress);
      validateSenderStarknetAddress(walletAddress);
      console.log('[ShieldedTransfer] Auto-populated sender address from wallet:', walletAddress);
    }
  }, [isWalletConnected, walletAddress, senderStarknetAddress]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setLoadingWallets(true);
      const wallets = await getAvailableWalletsList();
      setAvailableWallets(wallets);
      
      if (wallets.length === 0) {
        setQuoteError('No wallets available. Please install a Starknet wallet extension.');
        return;
      }
      
      if (wallets.length === 1) {
        // Only one wallet, connect directly
        await connectWallet(wallets[0]);
      } else {
        // Show modal with wallet list
        setShowWalletModal(true);
      }
    } catch (error) {
      console.error('[ShieldedTransfer] Error getting wallets:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to get available wallets',
      );
    } finally {
      setLoadingWallets(false);
    }
  };

  // Handle wallet selection from modal
  const handleWalletSelect = async (wallet: StarknetWindowObject) => {
    try {
      setShowWalletModal(false);
      await connectWallet(wallet);
    } catch (error) {
      console.error('[ShieldedTransfer] Error connecting wallet:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to connect wallet',
      );
    }
  };

  // Monitor balance changes - triggers immediately when balance changes
  useEffect(() => {
    if (
      !loading &&
      monitoringActive &&
      status === ShieldedTransferStatus.WAITING_DEPOSIT
    ) {
      console.log('[ShieldedTransfer] Balance check:', {
        previousBalance: zatsToZec(previousBalance),
        currentBalance: zatsToZec(shieldedBalance),
        difference: zatsToZec(shieldedBalance - previousBalance),
        status,
        transferTriggered: transferTriggeredRef.current,
      });

      // Check if balance increased
      if (shieldedBalance > previousBalance && !transferTriggeredRef.current) {
        const balanceIncrease = shieldedBalance - previousBalance;
        console.log('[ShieldedTransfer] Balance increase detected!', {
          previousBalance: zatsToZec(previousBalance),
          newBalance: zatsToZec(shieldedBalance),
          increase: zatsToZec(balanceIncrease),
        });

        if (isBalanceSufficient(shieldedBalance)) {
          setStatus(ShieldedTransferStatus.FUNDS_RECEIVED);
          setPreviousBalance(shieldedBalance);
          // Get second quote for ZEC → STRK
          handleGetSecondQuote();
        } else {
          console.warn(
            '[ShieldedTransfer] Balance insufficient for transfer (including fees)',
            {
              balance: zatsToZec(shieldedBalance),
              required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
            },
          );
          setPreviousBalance(shieldedBalance);
        }
      } else if (
        shieldedBalance !== previousBalance &&
        !transferTriggeredRef.current
      ) {
        setPreviousBalance(shieldedBalance);
      }
    }
  }, [
    shieldedBalance,
    previousBalance,
    loading,
    monitoringActive,
    status,
    starknetAddress,
  ]);

  // Periodic rescan to ensure we have latest balance
  useInterval(
    async () => {
      if (
        !monitoringActive ||
        status !== ShieldedTransferStatus.WAITING_DEPOSIT
      ) {
        return;
      }

      console.log('[ShieldedTransfer] Periodic rescan...');
      await triggerRescan();
    },
    monitoringActive &&
      status === ShieldedTransferStatus.WAITING_DEPOSIT
      ? 10000
      : null,
  );

  // Execute transfer using the second quote
  const executeTransfer = async (quoteOverride?: QuoteResponse) => {
    if (!starknetAddress || !isBalanceSufficient(shieldedBalance)) {
      console.warn('[ShieldedTransfer] Cannot execute transfer:', {
        hasStarknetAddress: !!starknetAddress,
        balance: zatsToZec(shieldedBalance),
        isSufficient: isBalanceSufficient(shieldedBalance),
        required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
      });
      return;
    }

    if (!unifiedAddress) {
      setQuoteError('Wallet address not available');
      return;
    }

    // Use provided quote or fall back to state
    const quoteToUse = quoteOverride || secondQuote;
    
    if (!quoteToUse?.quote?.depositAddress) {
      console.warn('[ShieldedTransfer] Cannot execute transfer: missing second quote');
      setQuoteError('Quote not available. Please get a new quote.');
      setStatus(ShieldedTransferStatus.ERROR);
      return;
    }

    try {
      const sendableAmount = calculateSendableAmount(shieldedBalance);
      const sendableAmountInZec = zatsToZec(sendableAmount);

      console.log('[ShieldedTransfer] Executing transfer', {
        fullBalance: zatsToZec(shieldedBalance),
        sendableAmount: sendableAmountInZec,
        fee: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
        depositAddress: quoteToUse.quote.depositAddress,
      });

      transferTriggeredRef.current = true;
      const accountId =
        state.activeAccount !== null && state.activeAccount !== undefined
          ? state.activeAccount
          : 0;

      setTransactionHash(null);
      setStatus(ShieldedTransferStatus.TRANSFERRING);
      handlePcztTransaction(
        accountId,
        quoteToUse.quote.depositAddress,
        sendableAmountInZec.toString(),
      );
    } catch (error) {
      console.error('[ShieldedTransfer] Error executing transfer:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to send transaction',
      );
      // Don't clear secondQuote on error - allow retry with new quote
      setStatus(ShieldedTransferStatus.ERROR);
      transferTriggeredRef.current = false; // Allow retry
    }
  };

  // Get second quote when balance changes
  const handleGetSecondQuote = async () => {
    if (!starknetAddress || !unifiedAddress) {
      console.error('[ShieldedTransfer] Missing addresses for second quote');
      return;
    }

    try {
      const sendableAmount = calculateSendableAmount(shieldedBalance);
      const amountInZats = sendableAmount.toString();

      console.log('[ShieldedTransfer] Getting second quote (ZEC → STRK)...', {
        amount: amountInZats,
        recipient: starknetAddress,
        sender: unifiedAddress,
      });

      const quote = await getQuote(
        false, // dry = false for actual execution
        unifiedAddress, // sender/refund address
        starknetAddress, // recipient (original STARKNET address)
        ZEC_ASSET, // origin: ZEC
        STARKNET_ASSET, // destination: STRK
        amountInZats, // amount in zatoshis
      );

      setSecondQuote(quote);
      console.log('[ShieldedTransfer] Second quote received:', quote);
      
      // Automatically trigger transfer after successful quote
      // Pass quote directly to avoid race condition with state update
      await executeTransfer(quote);
    } catch (error) {
      console.error('[ShieldedTransfer] Error getting second quote:', error);
      setQuoteError('Failed to get quote. Please try again.');
      setStatus(ShieldedTransferStatus.ERROR);
    }
  };

  // Monitor transfer status
  useEffect(() => {
    if (status === ShieldedTransferStatus.TRANSFERRING) {
      console.log('[ShieldedTransfer] Transfer status update:', pcztTransferStatus);

      if (pcztTransferStatus === PcztTransferStatus.SENDING_PCZT) {
        console.log('[ShieldedTransfer] Transaction is being sent to the network...');
      } else if (pcztTransferStatus === PcztTransferStatus.SEND_SUCCESSFUL) {
        console.log(
          '[ShieldedTransfer] Transfer marked as successful, waiting for confirmation...',
        );
        const timer = setTimeout(async () => {
          console.log('[ShieldedTransfer] Transfer confirmed complete!');
          
          // Automatically submit transaction hash for second leg if we have it and deposit address
          if (transactionHash && secondQuote?.quote?.depositAddress) {
            try {
              console.log('[ShieldedTransfer] Submitting transaction hash for second leg...', {
                txHash: transactionHash,
                depositAddress: secondQuote.quote.depositAddress,
              });
              await submitTxHash(transactionHash, secondQuote.quote.depositAddress);
              console.log('[ShieldedTransfer] Transaction hash submitted successfully for second leg');
            } catch (error) {
              console.error('[ShieldedTransfer] Error submitting transaction hash for second leg:', error);
              // Don't block completion if submission fails
            }
          } else {
            console.warn('[ShieldedTransfer] Cannot submit transaction hash - missing hash or deposit address', {
              hasTxHash: !!transactionHash,
              hasDepositAddress: !!secondQuote?.quote?.depositAddress,
            });
          }
          
          setStatus(ShieldedTransferStatus.COMPLETE);
        }, 2000);

        return () => clearTimeout(timer);
      } else if (pcztTransferStatus === PcztTransferStatus.SEND_ERROR) {
        console.error('[ShieldedTransfer] Transfer error:', pcztTransferStatus);
        setStatus(ShieldedTransferStatus.ERROR);
      }
    }
  }, [pcztTransferStatus, status, transactionHash, secondQuote]);

  // Monitor console logs to extract transaction hash
  useEffect(() => {
    if (status === ShieldedTransferStatus.TRANSFERRING) {
      const originalLog = console.log;
      const originalInfo = console.info;

      const extractTxHash = (message: string) => {
        const patterns = [
          /Transaction\s+([a-f0-9]{64})\s+send successfully/i,
          /Transaction\s+([a-f0-9]{64})/i,
          /txid[:\s]+([a-f0-9]{64})/i,
          /transaction[:\s]+([a-f0-9]{64})/i,
        ];

        for (const pattern of patterns) {
          const match = message.match(pattern);
          if (match && match[1] && match[1].length === 64) {
            return match[1];
          }
        }
        return null;
      };

      const logInterceptor = (...args: any[]) => {
        const message = args
          .map((arg) =>
            typeof arg === 'string' ? arg : JSON.stringify(arg),
          )
          .join(' ');
        const txHash = extractTxHash(message);
        if (txHash && !transactionHash) {
          console.log(
            '[ShieldedTransfer] Transaction hash extracted from logs:',
            txHash,
          );
          setTransactionHash(txHash);
        }
        originalLog.apply(console, args);
      };

      const infoInterceptor = (...args: any[]) => {
        const message = args
          .map((arg) =>
            typeof arg === 'string' ? arg : JSON.stringify(arg),
          )
          .join(' ');
        const txHash = extractTxHash(message);
        if (txHash && !transactionHash) {
          console.log(
            '[ShieldedTransfer] Transaction hash extracted from logs:',
            txHash,
          );
          setTransactionHash(txHash);
        }
        originalInfo.apply(console, args);
      };

      console.log = logInterceptor;
      console.info = infoInterceptor;

      return () => {
        console.log = originalLog;
        console.info = originalInfo;
      };
    }
  }, [status, transactionHash]);

  const validateStarknetAddress = (address: string): boolean => {
    if (!address || address.trim() === '') {
      setStarknetAddressError('Please enter a STARKNET address');
      return false;
    }
    // Basic validation - STARKNET addresses are typically 66 characters (0x + 64 hex chars)
    if (address.length < 20) {
      setStarknetAddressError('Invalid STARKNET address format');
      return false;
    }
    setStarknetAddressError('');
    return true;
  };

  const validateSenderStarknetAddress = (address: string): boolean => {
    if (!address || address.trim() === '') {
      setSenderStarknetAddressError('Please enter your STARKNET address');
      return false;
    }
    // Basic validation - STARKNET addresses are typically 66 characters (0x + 64 hex chars)
    if (address.length < 20) {
      setSenderStarknetAddressError('Invalid STARKNET address format');
      return false;
    }
    setSenderStarknetAddressError('');
    return true;
  };

  const validateStrkAmount = (amount: string): boolean => {
    if (!amount || amount.trim() === '') {
      setStrkAmountError('Please enter an amount');
      return false;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setStrkAmountError('Amount must be a positive number');
      return false;
    }
    setStrkAmountError('');
    return true;
  };

  const handleStarknetAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setStarknetAddress(value);
    if (value) {
      validateStarknetAddress(value);
    } else {
      setStarknetAddressError('');
    }
  };

  const handleSenderStarknetAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSenderStarknetAddress(value);
    if (value) {
      validateSenderStarknetAddress(value);
    } else {
      setSenderStarknetAddressError('');
    }
  };

  const handleStrkAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStrkAmount(value);
    if (value) {
      validateStrkAmount(value);
    } else {
      setStrkAmountError('');
    }
  };

  const handleInitiateTransfer = async () => {
    if (!validateStarknetAddress(starknetAddress)) return;
    if (!validateSenderStarknetAddress(senderStarknetAddress)) return;
    if (!validateStrkAmount(strkAmount)) return;
    if (!unifiedAddress) {
      setQuoteError('Wallet address not available');
      return;
    }

    try {
      setQuoteError('');
      const amountInSmallestUnit = strkToSmallestUnit(strkAmount);

      console.log('[ShieldedTransfer] Getting first quote (STRK → ZEC)...', {
        amount: amountInSmallestUnit,
        recipient: unifiedAddress,
        sender: senderStarknetAddress,
      });

      const quote = await getQuote(
        false, // dry = false for actual execution
        senderStarknetAddress, // sender/refund address (STARKNET address)
        unifiedAddress, // recipient (shielded Zcash address)
        STARKNET_ASSET, // origin: STRK
        ZEC_ASSET, // destination: ZEC
        amountInSmallestUnit, // amount in smallest unit (18 decimals)
      );

      if (!quote.quote?.depositAddress) {
        throw new Error('No deposit address in quote response');
      }

      setFirstQuote(quote);
      setDepositAddress(quote.quote.depositAddress);
      setStatus(ShieldedTransferStatus.QUOTE_RECEIVED);
      setPreviousBalance(shieldedBalance);
      console.log('[ShieldedTransfer] First quote received:', quote);
    } catch (error) {
      console.error('[ShieldedTransfer] Error getting quote:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to get quote',
      );
      setStatus(ShieldedTransferStatus.ERROR);
    }
  };

  const handleStartMonitoring = () => {
    if (depositAddress) {
      setStatus(ShieldedTransferStatus.WAITING_DEPOSIT);
      setMonitoringActive(true);
      setPreviousBalance(shieldedBalance);
      transferTriggeredRef.current = false;
    }
  };

  // Send transaction using connected wallet
  const handleSendWithWallet = async () => {
    if (!walletAccount || !depositAddress || !strkAmount) {
      setQuoteError('Wallet not connected or missing required information');
      return;
    }

    try {
      setQuoteError('');
      const amountInSmallestUnit = strkToSmallestUnit(strkAmount);
      const amountBigInt = BigInt(amountInSmallestUnit);

      console.log('[ShieldedTransfer] Executing transaction with wallet...', {
        depositAddress,
        amount: amountInSmallestUnit,
        tokenContract: STRK_TOKEN_CONTRACT,
      });

      // Convert amount to Uint256 format (low and high parts)
      // Uint256 is represented as two felt252 values: low and high
      const UINT256_MAX = 2n ** 128n;
      const low = amountBigInt & (UINT256_MAX - 1n);
      const high = amountBigInt >> 128n;

      // Prepare calldata for the transfer function
      // transfer(recipient: felt252, amount: Uint256) -> (low: felt252, high: felt252)
      const calldata = [
        depositAddress, // recipient (deposit address)
        low.toString(), // amount low part
        high.toString(), // amount high part
      ];

      // Debug: Log the calldata being sent to the wallet for signing
      console.log('[ShieldedTransfer] Calldata for wallet transaction:', {
        contractAddress: STRK_TOKEN_CONTRACT,
        entrypoint: 'transfer',
        calldata: calldata,
        calldataDetails: {
          recipient: depositAddress,
          amountLow: low.toString(),
          amountHigh: high.toString(),
          amountFull: amountBigInt.toString(),
          amountInSTRK: strkAmount,
        },
      });

      // Execute transfer transaction using WalletAccount
      const response = await walletAccount.execute({
        contractAddress: STRK_TOKEN_CONTRACT,
        entrypoint: 'transfer',
        calldata: calldata,
      });

      const txHash = response.transaction_hash;
      console.log('[ShieldedTransfer] Transaction executed, hash:', txHash);

      // Automatically submit transaction hash to 1-click API
      try {
        await submitTxHash(txHash, depositAddress);
        console.log('[ShieldedTransfer] Transaction hash submitted to 1-click API');
      } catch (submitError) {
        console.error('[ShieldedTransfer] Error submitting transaction hash:', submitError);
        // Continue even if submission fails - user can still monitor manually
      }

      // Store the transaction hash and transition to waiting status
      setFirstLegTxHash(txHash);
      setStatus(ShieldedTransferStatus.WAITING_DEPOSIT);
      setMonitoringActive(true);
      setPreviousBalance(shieldedBalance);
      transferTriggeredRef.current = false;
    } catch (error) {
      console.error('[ShieldedTransfer] Error executing wallet transaction:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to execute transaction',
      );
      setStatus(ShieldedTransferStatus.ERROR);
    }
  };

  const handleSubmitFirstLegTxHash = async () => {
    if (!firstLegTxHash || !depositAddress) {
      console.warn('[ShieldedTransfer] Missing transaction hash or deposit address');
      return;
    }

    try {
      console.log('[ShieldedTransfer] Submitting first leg transaction hash...');
      await submitTxHash(firstLegTxHash, depositAddress);
      console.log('[ShieldedTransfer] First leg transaction hash submitted successfully');
      // Optionally show a success message or update UI
    } catch (error) {
      console.error('[ShieldedTransfer] Error submitting first leg transaction hash:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to submit transaction hash',
      );
    }
  };

  const handleGetNewQuote = async () => {
    if (!starknetAddress || !isBalanceSufficient(shieldedBalance)) {
      console.warn('[ShieldedTransfer] Cannot get new quote:', {
        hasStarknetAddress: !!starknetAddress,
        balance: zatsToZec(shieldedBalance),
        isSufficient: isBalanceSufficient(shieldedBalance),
        required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
      });
      return;
    }

    if (!unifiedAddress) {
      setQuoteError('Wallet address not available');
      return;
    }

    try {
      setQuoteError('');
      // Get fresh quote
      const sendableAmount = calculateSendableAmount(shieldedBalance);
      const amountInZats = sendableAmount.toString();

      console.log('[ShieldedTransfer] Getting fresh quote...', {
        amount: amountInZats,
        recipient: starknetAddress,
        sender: unifiedAddress,
      });

      const quote = await getQuote(
        false, // dry = false for actual execution
        unifiedAddress, // sender/refund address
        starknetAddress, // recipient (original STARKNET address)
        ZEC_ASSET, // origin: ZEC
        STARKNET_ASSET, // destination: STRK
        amountInZats, // amount in zatoshis
      );

      if (!quote.quote?.depositAddress) {
        throw new Error('No deposit address in quote response');
      }

      setSecondQuote(quote);
      const sendableAmountInZec = zatsToZec(sendableAmount);

      console.log('[ShieldedTransfer] New quote received', {
        fullBalance: zatsToZec(shieldedBalance),
        sendableAmount: sendableAmountInZec,
        fee: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
        depositAddress: quote.quote.depositAddress,
      });

      // Return to READY_TO_SEND page to show the quote details
      setStatus(ShieldedTransferStatus.READY_TO_SEND);
    } catch (error) {
      console.error('[ShieldedTransfer] Error getting new quote:', error);
      setQuoteError(
        error instanceof Error ? error.message : 'Failed to get quote',
      );
      setStatus(ShieldedTransferStatus.ERROR);
    }
  };

  const handleForceSend = async () => {
    if (!secondQuote?.quote?.depositAddress) {
      // If we don't have a quote, get one first
      await handleGetNewQuote();
      return;
    }

    // Use the shared executeTransfer function
    await executeTransfer();
  };

  const handleReset = () => {
    setStatus(ShieldedTransferStatus.INITIAL);
    setStarknetAddress('');
    setSenderStarknetAddress('');
    setStrkAmount('');
    setFirstLegTxHash('');
    setMonitoringActive(false);
    setPreviousBalance(shieldedBalance);
    setFirstQuote(null);
    setSecondQuote(null);
    setDepositAddress('');
    setTransactionHash(null);
    setQuoteError('');
    transferTriggeredRef.current = false;
  };

  if (loading) {
    return (
      <>
        <PageHeading title="STRK Shielded Transfer" />
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <Loader />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <PageHeading title="STRK Shielded Transfer" />

      {status === ShieldedTransferStatus.INITIAL && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <div className="self-stretch flex-col justify-start items-center gap-6 flex">
            <div className="text-white text-lg font-medium font-['Roboto'] leading-normal">
              Enter Transfer Details
            </div>
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex">
              <Input
                label="STARKNET Address (Recipient):"
                id="starknet-address"
                placeholder="0x..."
                value={starknetAddress}
                onChange={handleStarknetAddressChange}
                error={starknetAddressError}
                disabled={monitoringActive}
              />
            </div>
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex">
              <div className="self-stretch flex items-start justify-between gap-4">
                <div className={isWalletConnected ? 'flex-1' : 'flex-1'}>
                  <Input
                    label="Your STARKNET Address (Sender/Refund):"
                    id="sender-starknet-address"
                    placeholder="0x..."
                    value={senderStarknetAddress}
                    onChange={handleSenderStarknetAddressChange}
                    error={senderStarknetAddressError}
                    disabled={monitoringActive || isWalletConnected}
                  />
                </div>
                <div className="flex flex-col gap-2 mt-6">
                  {!isWalletConnected ? (
                    <Button
                      onClick={handleConnectWallet}
                      label={loadingWallets ? 'Loading...' : 'Connect Wallet'}
                      variant="secondary"
                      classNames="min-w-[150px]"
                      disabled={monitoringActive || loadingWallets}
                    />
                  ) : (
                    <>
                      <div className="text-xs text-gray-400 mb-1">
                        Connected: {walletAddress?.substring(0, 10)}...
                      </div>
                      <Button
                        onClick={disconnectWallet}
                        label="Disconnect"
                        variant="secondary"
                        classNames="min-w-[150px] text-xs"
                        disabled={monitoringActive}
                      />
                    </>
                  )}
                </div>
              </div>
              {walletError && (
                <div className="text-red-400 text-sm font-normal font-['Roboto']">
                  {walletError.message}
                </div>
              )}
            </div>
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex">
              <Input
                label="STRK Amount:"
                id="strk-amount"
                placeholder="0.0"
                type="number"
                step="0.000000000000000001"
                min="0"
                value={strkAmount}
                onChange={handleStrkAmountChange}
                error={strkAmountError}
                disabled={monitoringActive}
                suffix="STRK"
              />
            </div>
            {quoteError && (
              <div className="text-red-400 text-sm font-normal font-['Roboto']">
                {quoteError}
              </div>
            )}
            <Button
              onClick={handleInitiateTransfer}
              label="Initiate Transfer"
              disabled={
                !starknetAddress ||
                !senderStarknetAddress ||
                !strkAmount ||
                !!starknetAddressError ||
                !!senderStarknetAddressError ||
                !!strkAmountError ||
                monitoringActive
              }
            />
          </div>
        </div>
      )}

      {status === ShieldedTransferStatus.QUOTE_RECEIVED && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Quote Received"
            statusMessage={`Send ${strkAmount} STRK to the address below:`}
            icon={<CheckSVG />}
          >
            <div className="mt-4 p-3 bg-gray-800 rounded-xl border border-gray-700 w-full">
              <div className="text-gray-400 text-sm font-normal font-['Roboto'] mb-2">
                STARKNET Deposit Address:
              </div>
              <div className="text-white text-sm font-mono break-all">
                {depositAddress}
              </div>
            </div>
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2">
              Amount to send: {strkAmount} STRK
            </div>
            <div className="flex flex-col gap-3 w-full">
              {isWalletConnected && walletAccount ? (
                <Button
                  onClick={handleSendWithWallet}
                  label="Send with Wallet"
                  disabled={!depositAddress || !strkAmount}
                />
              ) : null}
              <Button
                onClick={handleStartMonitoring}
                label="Start Monitoring"
                variant={isWalletConnected ? 'secondary' : 'primary'}
              />
            </div>
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.WAITING_DEPOSIT && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Waiting for Deposit"
            statusMessage="Monitoring for incoming ZEC transactions..."
            icon={<Loader />}
          >
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2">
              Current balance: {zatsToZec(shieldedBalance)} ZEC
            </div>
            <div className="text-gray-400 text-xs font-normal font-['Roboto'] mt-1">
              Send {strkAmount} STRK to: {depositAddress.substring(0, 20)}...
            </div>
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex mt-4">
              <div className="text-gray-400 text-sm font-normal font-['Roboto']">
                Optional: Submit your STARKNET transaction hash to expedite the process
              </div>
              <Input
                label="STARKNET Transaction Hash:"
                id="first-leg-tx-hash"
                placeholder="0x..."
                value={firstLegTxHash}
                onChange={(e) => setFirstLegTxHash(e.target.value)}
              />
              <Button
                onClick={handleSubmitFirstLegTxHash}
                label="Submit Transaction Hash"
                variant="secondary"
                disabled={!firstLegTxHash.trim() || !depositAddress}
              />
            </div>
            <Button onClick={handleReset} label="Cancel" variant="secondary" />
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.FUNDS_RECEIVED && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Funds Received"
            statusMessage={`Received ${zatsToZec(shieldedBalance)} ZEC. Getting quote for transfer...`}
            icon={<Loader />}
          >
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2">
              Preparing to send to {starknetAddress.substring(0, 20)}...
            </div>
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.READY_TO_SEND && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Ready to Send"
            statusMessage={`Ready to send ${zatsToZec(calculateSendableAmount(shieldedBalance))} ZEC to STARKNET`}
            icon={<CheckSVG />}
          >
            {secondQuote?.quote?.depositAddress && (
              <div className="mt-4 p-3 bg-gray-800 rounded-xl border border-gray-700 w-full">
                <div className="text-gray-400 text-sm font-normal font-['Roboto'] mb-2">
                  Zcash Deposit Address:
                </div>
                <div className="text-white text-sm font-mono break-all">
                  {secondQuote.quote.depositAddress}
                </div>
              </div>
            )}
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2">
              Will send: {zatsToZec(calculateSendableAmount(shieldedBalance))}{' '}
              ZEC (Fee: {zatsToZec(TRANSACTION_FEE_ZATOSHIS)} ZEC)
            </div>
            <div className="text-gray-400 text-xs font-normal font-['Roboto'] mt-1">
              To: {starknetAddress}
            </div>
            <Button onClick={handleForceSend} label="Force Send" />
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.TRANSFERRING && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText={
              pcztTransferStatus === PcztTransferStatus.SENDING_PCZT
                ? 'Sending transaction'
                : 'Transferring funds'
            }
            statusMessage={
              pcztTransferStatus === PcztTransferStatus.SENDING_PCZT
                ? `Sending ${zatsToZec(calculateSendableAmount(shieldedBalance))} ZEC transaction to the network...`
                : `${pcztTransferStatus}`
            }
            icon={<Loader />}
          >
            {secondQuote?.quote?.depositAddress && (
              <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2 break-all">
                To: {secondQuote.quote.depositAddress}
              </div>
            )}
            <div className="text-gray-400 text-xs font-normal font-['Roboto'] mt-1">
              (Transaction fee: {zatsToZec(TRANSACTION_FEE_ZATOSHIS)} ZEC)
            </div>
            {pcztTransferStatus === PcztTransferStatus.SENDING_PCZT && (
              <div className="text-gray-400 text-xs font-normal font-['Roboto'] mt-2 italic">
                Please wait while the transaction is being sent to the blockchain...
              </div>
            )}
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.COMPLETE && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Transfer complete"
            statusMessage={
              transactionHash
                ? `Your transaction has been sent successfully. Transaction hash: ${transactionHash.substring(0, 16)}...`
                : 'Your transaction has been sent successfully.'
            }
            icon={<CheckSVG />}
          >
            {transactionHash && (
              <div className="mt-4 p-3 bg-gray-800 rounded-xl border border-gray-700 w-full">
                <div className="text-gray-400 text-sm font-normal font-['Roboto'] mb-2">
                  Transaction Hash:
                </div>
                <div className="text-white text-sm font-mono break-all">
                  {transactionHash}
                </div>
              </div>
            )}
            {secondQuote?.quote?.depositAddress && (
              <div className="mt-4 w-full">
                <a
                  href={`https://explorer.near-intents.org/transactions/${secondQuote.quote.depositAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm font-normal font-['Roboto'] underline"
                >
                  View on Near Intents Explorer
                </a>
              </div>
            )}
            <Button onClick={handleReset} label="Start Over" variant="secondary" />
          </TransactionStatusCard>
        </div>
      )}

      {status === ShieldedTransferStatus.ERROR && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Error"
            statusMessage={
              quoteError || 'An error occurred. Please try again.'
            }
            icon={<WarningSVG />}
          >
            {secondQuote && isBalanceSufficient(shieldedBalance) ? (
              <div className="flex flex-col gap-3 w-full">
                <div className="text-gray-400 text-sm font-normal font-['Roboto']">
                  You can get a new quote and retry sending the funds.
                </div>
                <Button onClick={handleGetNewQuote} label="Get New Quote" variant="primary" />
                <Button onClick={handleForceSend} label="Force Send" variant="primary" />
                <Button onClick={handleReset} label="Start Over" variant="secondary" />
              </div>
            ) : (
              <Button onClick={handleReset} label="Try Again" variant="primary" />
            )}
          </TransactionStatusCard>
        </div>
      )}

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setShowWalletModal(false)}
        >
          <div
            className="bg-gray-900 rounded-3xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-medium font-['Roboto']">
                Select a Wallet
              </h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 text-2xl hover:text-white transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {availableWallets.map((wallet, index) => (
                <button
                  key={index}
                  onClick={() => handleWalletSelect(wallet)}
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl p-4 text-left hover:border-gray-600 hover:bg-gray-750 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-700">
                      {wallet.icon ? (
                        <img
                          src={
                            typeof wallet.icon === 'string'
                              ? wallet.icon
                              : wallet.icon.light || wallet.icon.dark
                          }
                          alt={wallet.name || 'Wallet'}
                          className="w-8 h-8"
                        />
                      ) : (
                        <div className="text-2xl">🔷</div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-white text-base font-medium font-['Roboto']">
                        {wallet.name || 'Unknown Wallet'}
                      </div>
                      <div className="text-gray-400 text-sm font-normal font-['Roboto']">
                        {wallet.id || 'Unknown ID'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShieldedTransfer;

