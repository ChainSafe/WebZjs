import { ZcashYellowSvg } from '../../assets';
import React from 'react';
import TransferForm from '@pages/TransferBalance/TransferForm.tsx';

function TransferBalance(): React.JSX.Element {
  return (
    <div className="flex flex-col w-full">
      <section className="py-6 mb-12 border-b border-[#bfbfbf] flex flex-col items-center gap-3">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-black text-4xl font-medium font-inter leading-normal">
              Transfer Balance
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-black text-base font-normal font-inter leading-tight">
              Available:
            </span>
            <div className="px-4 py-2 bg-[#e8e8e8] rounded-3xl flex items-center gap-2.5">
              <ZcashYellowSvg className="w-5 h-5" />
              <span className="text-[#434343] text-base font-semibold font-inter leading-tight">
                0.053 ZEC
              </span>
            </div>
          </div>
        </div>
      </section>
      <TransferForm />
    </div>
  );
}

export default TransferBalance;
