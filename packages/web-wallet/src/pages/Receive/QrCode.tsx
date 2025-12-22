import QRCode from 'react-qr-code';
import { EyeSlashSvg, EyeSvg } from '../../assets';
import { useState } from 'react';
import CopyButton from '../../components/CopyButton/CopyButton';

interface QrCodeProps {
  address: string; // Unified or transparent
}

function QrCode({ address }: QrCodeProps) {
  const [exposeAddress, setExposeAddress] = useState(false);

  return (
    <>
      <div className="p-[9.94px] rounded-[19.89px] border border-gray-700 flex-col justify-start items-center gap-[19.89px] flex bg-white">
        {address && <QRCode value={address} />}
      </div>
      <div className="flex px-6 py-3 justify-center items-start gap-3  max-w-[400px] bg-gray-800 rounded-3xl border border-gray-700">
        <div className=" text-gray-300 text-base font-normal font-['Roboto'] leading-normal max-w-[288px]">
          {exposeAddress ? (
            <span className="break-words">{address}</span>
          ) : (
            <span className="text-ellipsis overflow-hidden block">
              {address}
            </span>
          )}
        </div>
        <div
          className="grow-0"
          onClick={() => setExposeAddress(!exposeAddress)}
        >
          {exposeAddress ? <EyeSlashSvg /> : <EyeSvg />}
        </div>
        <div className="justify-start grow-0">
          <CopyButton textToCopy={address} />
        </div>
      </div>
    </>
  );
}
export default QrCode;
