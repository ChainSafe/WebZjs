import Button from '@components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { TransferBalanceFormType } from './useTransferBalanceForm';
import React from 'react';

interface Step3Props {
  resetForm: TransferBalanceFormType['resetForm'];
}

function Step3({ resetForm }: Step3Props): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="x-9 pt-[72px] justify-center items-start gap-2.5 inline-flex">
      <div className="max-w-[620px] w-full px-12 py-9 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-9 inline-flex">
        <div className="self-stretch h-[141px] flex-col justify-start items-center gap-3 flex">
          <div className="w-[50px] h-[50px] relative  overflow-hidden" />
          <div className="self-stretch h-[79px] flex-col justify-start items-start gap-3 flex">
            <div className="self-stretch h-[43px] flex-col justify-start items-center gap-6 flex">
              <div className="self-stretch text-center text-black text-4xl font-medium font-['Inter'] leading-[43.20px]">
                Transfer complete
              </div>
            </div>
            <div className="self-stretch rounded-xl justify-start items-start gap-2 inline-flex">
              <div className="grow shrink basis-0 text-center text-[#4f4f4f] text-base font-normal font-['Roboto'] leading-normal">
                Your transaction has been sent.
              </div>
            </div>
          </div>
        </div>
        <div className="h-[108px] flex-col justify-center items-center gap-3 flex">
          <div className="self-stretch h-[108px] flex-col justify-center items-center gap-3 flex">
            <div className="h-12 rounded-xl flex-col justify-start items-start gap-4 flex">
              <div className="self-stretch justify-start items-start inline-flex">
                <div className="grow shrink basis-0 h-12 px-6 py-3 bg-black rounded-3xl justify-center items-center gap-2 flex">
                  <Button
                    onClick={() =>
                      navigate('/dashboard/account-summary', { replace: true })
                    }
                    label={'Back to Account Summary'}
                  />
                </div>
              </div>
            </div>
            <div className="h-12 rounded-xl flex-col justify-start items-start gap-4 flex">
              <div className="self-stretch justify-start items-start inline-flex">
                <Button
                  onClick={() => resetForm}
                  label={'Make Another Transfer'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step3;
