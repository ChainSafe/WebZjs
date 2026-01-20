import React from 'react';
import { zatsToZec } from '../utils';
import { CoinsSvg, ShieldDividedSvg, ShieldSvg } from '../assets';
import useBalance from '../hooks/useBalance';
import { useWebZjsContext } from 'src/context/WebzjsContext';
import { BlockHeightCard } from 'src/components/BlockHeightCard/BlockHeightCard';
import { useMetaMaskContext } from 'src/context/MetamaskContext';
import { useWebZjsActions } from '../hooks/useWebzjsActions';

interface BalanceCard {
  name: string;
  icon: React.JSX.Element;
  balance: number;
}

function AccountSummary() {
  const { totalBalance, unshieldedBalance, shieldedBalance, totalPending, hasPending } = useBalance();
  const { state } = useWebZjsContext();
  const { snapState } = useMetaMaskContext();
  const { fullResync } = useWebZjsActions();

  const BalanceCards: BalanceCard[] = [
    {
      name: 'Account Balance',
      icon: <CoinsSvg />,
      balance: totalBalance,
    },
    {
      name: 'Shielded Balance',
      icon: <ShieldSvg />,
      balance: shieldedBalance,
    },
    {
      name: 'Unshielded Balance',
      icon: <ShieldDividedSvg />,
      balance: unshieldedBalance,
    },
  ];

  const renderBalanceCard = ({ name, balance, icon }: BalanceCard) => {
    return (
      <div
        key={name}
        className="grow shrink min-w-[317px] basis-0 p-6 bg-white rounded-xl border border-[#afafaf] flex-col justify-start items-start gap-2 inline-flex"
      >
        {icon}
        <div className="self-stretch text-[#595959] text-sm font-semibold font-inter leading-[21px]">
          {name}
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="text-black text-2xl font-medium font-['Inter'] leading-9">
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
          <div className="self-stretch text-black text-[44px] font-semibold leading-[52.80px]">
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
      {hasPending && (
        <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <span className="text-amber-600 text-lg">⏳</span>
          <div className="flex flex-col">
            <span className="text-amber-800 font-medium">
              Pending: {zatsToZec(totalPending)} ZEC
            </span>
            <span className="text-amber-600 text-sm">
              Balance will update when transaction is confirmed
            </span>
          </div>
        </div>
      )}
      <BlockHeightCard
        state={state}
        syncedFrom={snapState?.webWalletSyncStartBlock}
        onFullResync={fullResync}
      />
    </div>
  );
}

export default AccountSummary;
