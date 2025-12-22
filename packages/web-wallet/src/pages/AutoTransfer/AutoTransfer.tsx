import React, { useEffect, useState, useRef } from 'react';
import { useWebZjsActions } from '../../hooks';
import { usePczt, PcztTransferStatus } from '../../hooks/usePCZT';
import { useWebZjsContext } from '../../context/WebzjsContext';
import useBalance from '../../hooks/useBalance';
import { zatsToZec } from '../../utils';
import QrCode from '../Receive/QrCode';
import PageHeading from '../../components/PageHeading/PageHeading';
import Loader from '../../components/Loader/Loader';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import TransactionStatusCard from '../../components/TransactionStatusCard/TransactionStatusCard';
import { CheckSVG, WarningSVG } from '../../assets';
import { useInterval } from 'usehooks-ts';

// Transaction fee in zatoshis (0.00015 ZEC)
const TRANSACTION_FEE_ZATOSHIS = 15000;

enum AutoTransferStatus {
  WAITING = 'waiting',
  FUNDS_RECEIVED = 'funds_received',
  TRANSFERRING = 'transferring',
  COMPLETE = 'complete',
  ERROR = 'error',
}

function AutoTransfer(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [unifiedAddress, setUnifiedAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [status, setStatus] = useState<AutoTransferStatus>(AutoTransferStatus.WAITING);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [receivedBalance, setReceivedBalance] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState('');
  const [monitoringActive, setMonitoringActive] = useState(false);
  const transferTriggeredRef = useRef(false);

  const { getAccountData, triggerRescan } = useWebZjsActions();
  const { handlePcztTransaction, pcztTransferStatus } = usePczt();
  const { state } = useWebZjsContext();
  const { shieldedBalance } = useBalance();

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
      console.log('[AutoTransfer] Initial balance:', zatsToZec(shieldedBalance), 'ZEC');
    }
  }, [loading, shieldedBalance]);

  // Monitor balance changes - triggers immediately when balance changes
  useEffect(() => {
    if (!loading && monitoringActive && status === AutoTransferStatus.WAITING) {
      console.log('[AutoTransfer] Balance check:', {
        previousBalance: zatsToZec(previousBalance),
        currentBalance: zatsToZec(shieldedBalance),
        difference: zatsToZec(shieldedBalance - previousBalance),
        status,
        transferTriggered: transferTriggeredRef.current,
      });

      // Check if balance increased (detect any increase, not just from 0)
      if (shieldedBalance > previousBalance && !transferTriggeredRef.current) {
        const balanceIncrease = shieldedBalance - previousBalance;
        const sendableAmount = calculateSendableAmount(shieldedBalance);
        console.log('[AutoTransfer] Balance increase detected!', {
          previousBalance: zatsToZec(previousBalance),
          newBalance: zatsToZec(shieldedBalance),
          increase: zatsToZec(balanceIncrease),
          sendableAmount: zatsToZec(sendableAmount),
          fee: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
          isSufficient: isBalanceSufficient(shieldedBalance),
        });
        
        if (isBalanceSufficient(shieldedBalance)) {
          setReceivedBalance(shieldedBalance);
          setStatus(AutoTransferStatus.FUNDS_RECEIVED);
          // Update previous balance to prevent re-triggering
          setPreviousBalance(shieldedBalance);
        } else {
          console.warn('[AutoTransfer] Balance insufficient for transfer (including fees)', {
            balance: zatsToZec(shieldedBalance),
            required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
          });
          // Still update previous balance even if insufficient
          setPreviousBalance(shieldedBalance);
        }
      } else if (shieldedBalance !== previousBalance && !transferTriggeredRef.current) {
        // Balance changed but not an increase, or transfer already triggered
        console.log('[AutoTransfer] Balance changed (updating previous balance)', {
          previousBalance: zatsToZec(previousBalance),
          newBalance: zatsToZec(shieldedBalance),
          transferTriggered: transferTriggeredRef.current,
        });
        setPreviousBalance(shieldedBalance);
      }
    }
  }, [shieldedBalance, previousBalance, loading, monitoringActive, status]);

  // Periodic rescan to ensure we have latest balance
  useInterval(
    async () => {
      if (!monitoringActive || status !== AutoTransferStatus.WAITING) {
        return;
      }

      console.log('[AutoTransfer] Periodic rescan...');
      // Trigger rescan to ensure we have latest balance
      await triggerRescan();
    },
    monitoringActive && status === AutoTransferStatus.WAITING ? 10000 : null,
  );

  // Auto-transfer when funds are received - triggers immediately when status changes
  useEffect(() => {
    console.log('[AutoTransfer] Auto-transfer effect triggered', {
      status,
      destinationAddress: !!destinationAddress,
      transferTriggered: transferTriggeredRef.current,
      receivedBalance: zatsToZec(receivedBalance),
    });

    if (
      status === AutoTransferStatus.FUNDS_RECEIVED &&
      destinationAddress &&
      !transferTriggeredRef.current &&
      receivedBalance > 0
    ) {
      console.log('[AutoTransfer] Conditions met, initiating transfer...');
      transferTriggeredRef.current = true;
      const accountId =
        state.activeAccount !== null && state.activeAccount !== undefined
          ? state.activeAccount
          : 0;

      const sendableAmount = calculateSendableAmount(receivedBalance);
      
      if (!isBalanceSufficient(receivedBalance)) {
        console.error('[AutoTransfer] Cannot transfer: insufficient balance for fees', {
          balance: zatsToZec(receivedBalance),
          required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
        });
        setStatus(AutoTransferStatus.ERROR);
        transferTriggeredRef.current = false; // Reset so user can retry
        return;
      }

      console.log('[AutoTransfer] Initiating auto-transfer...', {
        accountId,
        destinationAddress,
        fullBalance: zatsToZec(receivedBalance),
        sendableAmount: zatsToZec(sendableAmount),
        fee: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
      });

      setStatus(AutoTransferStatus.TRANSFERRING);
      const sendableAmountInZec = zatsToZec(sendableAmount);
      handlePcztTransaction(accountId, destinationAddress, sendableAmountInZec.toString());
    }
  }, [status, destinationAddress, receivedBalance, handlePcztTransaction, state.activeAccount]);

  // Function to manually trigger transfer
  const handleForceSend = () => {
    if (!destinationAddress || !isBalanceSufficient(shieldedBalance)) {
      console.warn('[AutoTransfer] Cannot force send:', {
        hasDestination: !!destinationAddress,
        balance: zatsToZec(shieldedBalance),
        isSufficient: isBalanceSufficient(shieldedBalance),
        required: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
      });
      return;
    }

    const sendableAmount = calculateSendableAmount(shieldedBalance);
    console.log('[AutoTransfer] Force send triggered', {
      fullBalance: zatsToZec(shieldedBalance),
      sendableAmount: zatsToZec(sendableAmount),
      fee: zatsToZec(TRANSACTION_FEE_ZATOSHIS),
      destinationAddress,
    });

    transferTriggeredRef.current = true;
    const accountId =
      state.activeAccount !== null && state.activeAccount !== undefined
        ? state.activeAccount
        : 0;

    setReceivedBalance(shieldedBalance);
    setTransactionHash(null); // Reset transaction hash for new transfer
    setStatus(AutoTransferStatus.TRANSFERRING);
    const sendableAmountInZec = zatsToZec(sendableAmount);
    handlePcztTransaction(accountId, destinationAddress, sendableAmountInZec.toString());
  };

  // Monitor console logs to extract transaction hash
  useEffect(() => {
    if (status === AutoTransferStatus.TRANSFERRING) {
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      const extractTxHash = (message: string) => {
        // Look for transaction hash in various formats:
        // "Transaction <hash> send successfully :)"
        // "Transaction <hash> send successfully"
        // Any 64-character hex string after "Transaction"
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
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        const txHash = extractTxHash(message);
        if (txHash && !transactionHash) {
          console.log('[AutoTransfer] Transaction hash extracted from logs:', txHash);
          setTransactionHash(txHash);
        }
        originalLog.apply(console, args);
      };

      const infoInterceptor = (...args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        const txHash = extractTxHash(message);
        if (txHash && !transactionHash) {
          console.log('[AutoTransfer] Transaction hash extracted from logs:', txHash);
          setTransactionHash(txHash);
        }
        originalInfo.apply(console, args);
      };

      // Intercept console logs
      console.log = logInterceptor;
      console.info = infoInterceptor;

      return () => {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
      };
    }
  }, [status, transactionHash]);

  // Monitor transfer status
  useEffect(() => {
    if (status === AutoTransferStatus.TRANSFERRING) {
      console.log('[AutoTransfer] Transfer status update:', pcztTransferStatus);
      
      if (pcztTransferStatus === PcztTransferStatus.SENDING_PCZT) {
        // Keep status as TRANSFERRING while sending
        console.log('[AutoTransfer] Transaction is being sent to the network...');
      } else if (pcztTransferStatus === PcztTransferStatus.SEND_SUCCESSFUL) {
        // Wait a moment to ensure transaction is actually sent before showing complete
        console.log('[AutoTransfer] Transfer marked as successful, waiting for confirmation...');
        const timer = setTimeout(() => {
          console.log('[AutoTransfer] Transfer confirmed complete!');
          setStatus(AutoTransferStatus.COMPLETE);
        }, 2000); // Wait 2 seconds to ensure transaction is actually sent
        
        return () => clearTimeout(timer);
      } else if (pcztTransferStatus === PcztTransferStatus.SEND_ERROR) {
        console.error('[AutoTransfer] Transfer error:', pcztTransferStatus);
        setStatus(AutoTransferStatus.ERROR);
      }
    }
  }, [pcztTransferStatus, status]);

  const validateDestination = (address: string): boolean => {
    if (!address || address.trim() === '') {
      setDestinationError('Please enter a destination address');
      return false;
    }
    // Basic validation - Zcash addresses typically start with specific prefixes
    // This is a simple check; more robust validation could be added
    if (address.length < 20) {
      setDestinationError('Invalid address format');
      return false;
    }
    setDestinationError('');
    return true;
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDestinationAddress(value);
    if (value) {
      validateDestination(value);
    } else {
      setDestinationError('');
    }
  };

  const handleStartMonitoring = () => {
    if (validateDestination(destinationAddress)) {
      console.log('[AutoTransfer] Starting monitoring', {
        destinationAddress,
        initialBalance: zatsToZec(shieldedBalance),
      });
      setMonitoringActive(true);
      setStatus(AutoTransferStatus.WAITING);
      setPreviousBalance(shieldedBalance);
      transferTriggeredRef.current = false;
    }
  };

  const handleReset = () => {
    setStatus(AutoTransferStatus.WAITING);
    setDestinationAddress('');
    setMonitoringActive(false);
    setPreviousBalance(shieldedBalance);
    setReceivedBalance(0);
    setTransactionHash(null);
    transferTriggeredRef.current = false;
  };

  if (loading) {
    return (
      <>
        <PageHeading title="Auto Transfer" />
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <Loader />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <PageHeading title="Auto Transfer" />
      {status === AutoTransferStatus.WAITING && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <div className="self-stretch flex-col justify-start items-center gap-6 flex">
            <div className="text-white text-lg font-medium font-['Roboto'] leading-normal">
              Receive Address (Shielded)
            </div>
            {unifiedAddress && <QrCode address={unifiedAddress} />}
            <div className="self-stretch flex-col justify-start items-start gap-2 inline-flex">
              <Input
                label="Destination Address:"
                id="destination"
                placeholder="Enter Zcash address to receive funds"
                value={destinationAddress}
                onChange={handleDestinationChange}
                error={destinationError}
                disabled={monitoringActive}
              />
            </div>
            {!monitoringActive ? (
              <Button
                onClick={handleStartMonitoring}
                label="Start Monitoring"
                disabled={!destinationAddress || !!destinationError}
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="text-gray-400 text-base font-normal font-['Roboto'] leading-normal">
                  Monitoring for incoming transactions...
                </div>
                <div className="text-gray-400 text-sm font-normal font-['Roboto'] leading-normal">
                  Current balance: {zatsToZec(shieldedBalance)} ZEC
                </div>
                {isBalanceSufficient(shieldedBalance) && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-white text-sm font-medium font-['Roboto']">
                      Balance detected! Click to send manually:
                    </div>
                    <div className="text-gray-400 text-xs font-normal font-['Roboto']">
                      (Will send {zatsToZec(calculateSendableAmount(shieldedBalance))} ZEC, {zatsToZec(TRANSACTION_FEE_ZATOSHIS)} ZEC for fees)
                    </div>
                    <Button
                      onClick={handleForceSend}
                      label={`Force Send ${zatsToZec(calculateSendableAmount(shieldedBalance))} ZEC`}
                      variant="primary"
                    />
                  </div>
                )}
                {shieldedBalance > 0 && !isBalanceSufficient(shieldedBalance) && (
                  <div className="text-red-400 text-sm font-normal font-['Roboto']">
                    Balance too low (need at least {zatsToZec(TRANSACTION_FEE_ZATOSHIS)} ZEC for fees)
                  </div>
                )}
                <Button onClick={handleReset} label="Stop & Reset" variant="secondary" />
              </div>
            )}
          </div>
        </div>
      )}

      {status === AutoTransferStatus.FUNDS_RECEIVED && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Funds Received"
            statusMessage={`Received ${zatsToZec(receivedBalance)} ZEC. Preparing to transfer ${zatsToZec(calculateSendableAmount(receivedBalance))} ZEC (${zatsToZec(TRANSACTION_FEE_ZATOSHIS)} ZEC for fees)...`}
            icon={<CheckSVG />}
          >
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2">
              Initiating transfer to {destinationAddress.substring(0, 20)}...
            </div>
          </TransactionStatusCard>
        </div>
      )}

      {status === AutoTransferStatus.TRANSFERRING && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText={
              pcztTransferStatus === PcztTransferStatus.SENDING_PCZT
                ? 'Sending transaction'
                : 'Transferring funds'
            }
            statusMessage={
              pcztTransferStatus === PcztTransferStatus.SENDING_PCZT
                ? `Sending ${zatsToZec(calculateSendableAmount(receivedBalance))} ZEC transaction to the network...`
                : `${pcztTransferStatus}`
            }
            icon={<Loader />}
          >
            <div className="text-gray-400 text-sm font-normal font-['Roboto'] mt-2 break-all">
              To: {destinationAddress}
            </div>
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

      {status === AutoTransferStatus.COMPLETE && (
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
            <Button onClick={handleReset} label="Start Over" variant="secondary" />
          </TransactionStatusCard>
        </div>
      )}

      {status === AutoTransferStatus.ERROR && (
        <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
          <TransactionStatusCard
            headText="Transfer incomplete"
            statusMessage="Your transaction has not been sent. Please try again."
            icon={<WarningSVG />}
          >
            <Button onClick={handleReset} label="Try Again" variant="primary" />
          </TransactionStatusCard>
        </div>
      )}
    </div>
  );
}

export default AutoTransfer;

