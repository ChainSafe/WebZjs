import React from 'react';
import TransactionHistoryComponent from '../../components/TransactionHistory/TransactionHistory';

function TransactionHistoryPage() {
  return (
    <div className="pb-[72px] mt-[46px] flex-col justify-center items-center gap-6 inline-flex w-full">
      <div className="py-6 self-start gap-3 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
          <div className="self-stretch text-black text-[44px] font-semibold leading-[52.80px]">
            Transaction History
          </div>
        </div>
      </div>
      <div className="w-full">
        <TransactionHistoryComponent />
      </div>
    </div>
  );
}

export default TransactionHistoryPage;
