import React, { useEffect, useMemo, useState } from 'react';
import { ZcashYellowPNG } from '../../assets';
import PageHeading from '../../components/PageHeading/PageHeading';
import useBalance from '../../hooks/useBalance';
import { zatsToZec } from '../../utils';
import Button from 'src/components/Button/Button';
import { useWebZjsActions } from 'src/hooks';
import { usePczt } from 'src/hooks/usePCZT';
import { TransferResult } from 'src/components/TransferCards/TransferResult';

export enum ShieldStatus {
  DEFAULT = 'default',
  SHIELDING = 'shielding',
}

export function ShieldBalance(): React.JSX.Element {
  const { unshieldedBalance } = useBalance();
  const [addresses, setAddresses] = useState<{
    unifiedAddress: string;
    transparentAddress: string;
  }>({
    unifiedAddress: '',
    transparentAddress: '',
  });

  const { getAccountData } = useWebZjsActions();
  const { handlePcztShieldTransaction, pcztTransferStatus } = usePczt();
  const [shieldStatus, setShieldStatus] = useState(ShieldStatus.DEFAULT);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAccountData();
      if (data)
        setAddresses({
          unifiedAddress: data.unifiedAddress,
          transparentAddress: data.transparentAddress,
        });
    };
    fetchData();
  }, [getAccountData]);


  const handleShieldBalance = () => {
    setShieldStatus(ShieldStatus.SHIELDING);
    handlePcztShieldTransaction(1, addresses.unifiedAddress, unshieldedBalance.toString());
  }

  const isMinimalShieldAmount = useMemo(()=>{
    // Need at least 0.001 ZEC + fee buffer (0.00015 ZEC total minimum)
    // This accounts for the transaction fee which is deducted from the balance
    const MINIMUM_SHIELD_AMOUNT = 100000; // 0.001 ZEC
    const FEE_BUFFER = 50000; // 0.0005 ZEC conservative fee estimate
    return unshieldedBalance > (MINIMUM_SHIELD_AMOUNT + FEE_BUFFER);
  },[unshieldedBalance])

  return (
    <div className="flex flex-col w-full">
      <PageHeading title="Shield Balance">
        <div className="flex items-center gap-2.5">
          <span className="text-black text-base font-normal font-inter leading-tight">
            Available unshielded balance:
          </span>
          <div className="px-4 py-2 bg-[#e8e8e8] rounded-3xl flex items-center gap-2.5">
            <img
              src={ZcashYellowPNG}
              alt="Zcash Yellow"
              className="w-5 h-5"
            />
            <span className="text-[#434343] text-base font-semibold font-inter leading-tight">
              {zatsToZec(unshieldedBalance)} ZEC
            </span>
          </div>
        </div>
      </PageHeading>
      {shieldStatus === ShieldStatus.DEFAULT && (
        <div className="min-h-[460px] px-12 py-6 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-6 inline-flex">
          <div className="self-stretch h-[413px] flex-col justify-center items-center gap-3 flex">
            <div className="self-stretch justify-start items-center gap-2 inline-flex">
              <div className="grow shrink basis-0 text-black text-base font-medium font-['Roboto'] leading-normal">
                To:
              </div>
              <div className="p-3 rounded-xl justify-start items-center gap-2 flex">
                <div className="text-[#4f4f4f] text-base font-normal font-['Roboto'] break-all leading-normal">
                  {addresses.unifiedAddress}
                </div>
              </div>
            </div>
            <div className="self-stretch justify-start items-center gap-2 inline-flex">
              <div className="grow shrink basis-0 text-black text-base font-normal font-['Roboto'] leading-normal">
                Amount:
              </div>
              <div className="px-4 py-1.5 bg-[#e8e8e8] rounded-3xl justify-center items-center gap-2.5 flex">
                <div className="text-[#0e0e0e] text-sm font-medium font-['Roboto'] leading-[21px]">
                  {zatsToZec(unshieldedBalance)} ZEC
                </div>
              </div>
            </div>
            <div className="self-stretch pt-6 flex-col justify-center items-center gap-3 flex">
              <div className="flex flex-col items-center justify-center">
                <Button
                  onClick={handleShieldBalance}
                  label={'Shield balance'}
                  disabled={!isMinimalShieldAmount}
                />
                {!isMinimalShieldAmount && (
                  <div className="text-red-500 text-sm mt-2">
                    Minimum balance required: 0.0015 ZEC (includes transaction fees). Your balance: {zatsToZec(unshieldedBalance)} ZEC
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {shieldStatus === ShieldStatus.SHIELDING && (
        <TransferResult
          pcztTransferStatus={pcztTransferStatus}
          resetForm={() => { }}
          isShieldTransaction={true}
        />
      )}

    </div>
  );
}

