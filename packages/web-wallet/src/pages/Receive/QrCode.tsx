import QRCode from 'react-qr-code';
import { EyeSlashSvg, EyeSvg } from '../../assets';
import CopyButton from '@components/CopyButton/CopyButton';
import { useState } from 'react';

interface QrCodeProps {
  address: string; // Unified or transparent
}

function QrCode({ address }: QrCodeProps) {
  const [exposeAddress, setExposeAddress] = useState(false);

  return (
    <>
      <div className="p-[9.94px] rounded-[19.89px] border border-[#8c8c8c] flex-col justify-start items-center gap-[19.89px] flex">
        {address && <QRCode value={address} />}
      </div>
      <div className="flex px-6 py-3 justify-center items-start gap-3  max-w-[400px] bg-neutral-50 rounded-3xl border border-[#d9d9d9]">
        <div className=" text-[#4f4f4f] text-base font-normal font-['Roboto'] leading-normal max-w-[288px]">
          {exposeAddress ? (
            <span className="break-words">{address}</span>
          ) : (
            <span className="overflow-ellipsis overflow-hidden block">
              {address}
            </span>
          )}
        </div>
        <div
          className="flex-grow-0"
          onClick={() => setExposeAddress(!exposeAddress)}
        >
          {exposeAddress ? <EyeSlashSvg /> : <EyeSvg />}
        </div>
        <div className="justify-start flex-grow-0">
          <CopyButton textToCopy={address} />
        </div>
      </div>
    </>
  );
}
export default QrCode;
