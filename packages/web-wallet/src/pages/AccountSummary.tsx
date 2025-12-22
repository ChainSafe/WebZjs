import React from 'react';
import { zatsToZec } from '../utils';
import { ShieldSvg } from '../assets';
import useBalance from '../hooks/useBalance';
import { useWebZjsContext } from 'src/context/WebzjsContext';
import { BlockHeightCard } from 'src/components/BlockHeightCard/BlockHeightCard';

interface BalanceCard {
  name: string;
  icon: React.JSX.Element;
  balance: number;
}

function AccountSummary() {
  const { shieldedBalance } = useBalance();
  const { state } = useWebZjsContext();

  const BalanceCards: BalanceCard[] = [
    {
      name: 'Shielded Balance',
      icon: <ShieldSvg />,
      balance: shieldedBalance,
    },
  ];

  const renderBalanceCard = ({ name, balance, icon }: BalanceCard) => {
    return (
      <div
        key={name}
        className="grow shrink min-w-[317px] basis-0 p-6 bg-gray-900 rounded-xl border border-gray-700 flex-col justify-start items-start gap-2 inline-flex"
      >
        {icon}
        <div className="self-stretch text-gray-400 text-sm font-semibold font-inter leading-[21px]">
          {name}
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="text-white text-2xl font-medium font-['Inter'] leading-9">
            {zatsToZec(balance)} ZEC
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-[72px] mt-[46px] flex-col justify-center items-center gap-6 inline-flex">
      <div className="py-6 self-start  gap-3 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
          <div className="self-stretch text-white text-[44px] font-semibold leading-[52.80px]">
            Account summary
          </div>
        </div>
      </div>
      <div
        className={
          'rounded-2xl justify-start items-center gap-6 flex flex-col min-[1000px]:flex-row'
        }
      >
        {BalanceCards.map((card) => renderBalanceCard(card))}
      </div>
      <BlockHeightCard
        state={state}
      />
    </div>
  );
}

export default AccountSummary;
