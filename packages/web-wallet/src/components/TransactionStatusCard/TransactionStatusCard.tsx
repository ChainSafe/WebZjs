import React from 'react';

interface TransactionStatusCardProps {
  icon: React.JSX.Element;
  headText: string;
  statusMessage?: string;
  children?: React.ReactNode;
}

function TransactionStatusCard({
  icon,
  headText,
  statusMessage,
  ...props
}: TransactionStatusCardProps): React.JSX.Element {
  return (
    <div className="x-9 mt-[72px] justify-center items-start gap-2.5 inline-flex">
      <div className="max-w-[620px] w-full px-12 py-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center inline-flex">
        <div className="self-stretch  flex-col justify-start items-start gap-3 flex">
          <div className="self-stretch mb-3 text-center text-white text-4xl font-medium font-['Inter'] leading-[43.20px]">
            {headText}
          </div>
          <div className="flex m-auto">{icon}</div>
        </div>
        <div className="self-stretch rounded-xl justify-start items-start gap-2 inline-flex mb-9">
          <div className="grow shrink basis-0 text-center text-gray-400 text-base font-normal font-['Roboto'] leading-normal">
            {statusMessage}
          </div>
        </div>
        <div className="flex-col justify-center items-center gap-3 flex">
          {props.children}
        </div>
      </div>
    </div>
  );
}

export default TransactionStatusCard;
