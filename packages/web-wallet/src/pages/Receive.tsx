import React, { useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useWebZjsActions } from '@hooks/useWebzjsActions';

function Receive(): React.JSX.Element {
  const [unifiedAddress, setUnifiedAddress] = React.useState('');
  const { getAccountData } = useWebZjsActions();

  useEffect(() => {
    getAccountData().then((data) => {
      if (data) {
        console.log('data', data);
        setUnifiedAddress(data.unifiedAddress);
      }
    });
  }, []);

  return (
    <>
      <section className="py-6 mb-12 border-b border-[#bfbfbf] flex flex-col items-center gap-3">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-black text-4xl font-medium font-inter leading-normal">
              Receive
            </h2>
          </div>
        </div>
      </section>
      <div className="w-[1000px] p-9 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-9 inline-flex">
        {/* Tabs */}
        <div className="self-stretch px-[75px] justify-center items-start gap-3 inline-flex">
          <div className="px-4 py-2 bg-[#e8e8e8] rounded-3xl justify-center items-center gap-1.5 flex">
            <div className="w-5 h-5 relative  overflow-hidden" />
            <div className="justify-start items-center gap-1 flex">
              <div className="text-center text-black text-sm font-semibold font-['Inter'] leading-tight">
                Unified Address
              </div>
            </div>
          </div>
          <div className="px-4 py-2 justify-center items-center gap-1.5 flex">
            <div className="w-5 h-5 relative  overflow-hidden" />
            <div className="justify-start items-center gap-1 flex">
              <div className="text-center text-[#afafaf] text-sm font-medium font-['Inter'] leading-tight">
                Transparent Address
              </div>
            </div>
          </div>
        </div>

        {/* QR CODE*/}
        <div className="p-[9.94px] rounded-[19.89px] border border-[#8c8c8c] flex-col justify-start items-center gap-[19.89px] flex">
          {unifiedAddress && <QRCode value={unifiedAddress} />}
        </div>
        {/* Copy */}
        <div className="h-12 flex-col justify-center items-center gap-3 flex">
          <div className="self-stretch h-12 flex-col justify-center items-center gap-6 flex">
            <div className="px-6 py-3 bg-neutral-50 rounded-3xl border border-[#d9d9d9] flex-col justify-start items-start gap-3 flex">
              <div className="rounded-xl justify-center items-start gap-2 inline-flex">
                <div className="text-[#4f4f4f] text-base font-normal font-['Roboto'] leading-normal">
                  {unifiedAddress.trim()}
                </div>
                <div className="justify-start items-center gap-4 flex">
                  <div className="w-6 h-6 relative  overflow-hidden" />
                  <div className="text-center text-[#e27625] text-base font-semibold font-['Roboto'] leading-normal">
                    copy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Receive;
