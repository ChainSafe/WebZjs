import React, { useCallback, useEffect, useState } from 'react';
import { useWebZjsActions } from '@hooks/useWebzjsActions.ts';
import { zatsToZec } from '../utils';
import { CoinsSvg, ShieldDividedSvg, ShieldSvg } from '../assets';

interface BalanceCard {
  name: string;
  icon: React.JSX.Element;
  balance: number;
}

function AccountSummary() {
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalShieldedBalance, setTotalShieldedBalance] = useState<number>(0);
  const [unshieldedBalance, setUnshieldedBalance] = useState<number>(0);
  const { getBalance } = useWebZjsActions();

  const BalanceCards: BalanceCard[] = [
    {
      name: 'Account Balance',
      icon: <CoinsSvg />,
      balance: totalBalance,
    },
    {
      name: 'Shielded Balance',
      icon: <ShieldSvg />,
      balance: totalShieldedBalance,
    },
    {
      name: 'Unshielded Balance',
      icon: <ShieldDividedSvg />,
      balance: unshieldedBalance,
    },
  ];

  const fetchBalances = useCallback(() => {
    const { totalBalance, unshieldedBalance, totalShieldedBalance } =
      getBalance();

    setTotalBalance(totalBalance);
    setTotalShieldedBalance(totalShieldedBalance);
    setUnshieldedBalance(unshieldedBalance);
  }, [getBalance]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const renderBalanceCard = ({ name, balance, icon }: BalanceCard) => {
    return (
      <div
        key={name}
        className="grow shrink basis-0 p-6 bg-white rounded-xl border border-[#afafaf] flex-col justify-start items-start gap-2 inline-flex"
      >
        {icon}
        <div className="self-stretch text-[#595959] text-sm font-semibold font-inter leading-[21px]">
          {name}
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="text-black text-2xl font-medium font-['Inter'] leading-9">
            Available Balance: {zatsToZec(balance)} ZEC
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className=" pb-[72px] flex-col justify-center items-center gap-6 inline-flex">
      <div className="py-6 self-start  gap-3 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
          <div className="self-stretch text-black text-[44px] font-semibold font-['Inter'] leading-[52.80px]">
            Account summary
          </div>
        </div>
      </div>
      <div
        className={'rounded-2xl justify-start items-center gap-6 inline-flex'}
      >
        {BalanceCards.map((card) => renderBalanceCard(card))}
      </div>
    </div>
  );
}

export default AccountSummary;
