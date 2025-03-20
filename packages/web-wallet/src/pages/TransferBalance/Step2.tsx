import React from 'react';
import {
  TransferBalanceFormData,
  TransferBalanceFormType,
} from './useTransferBalanceForm';
import Button from '../../components/Button/Button';

interface Step2Props {
  formData: TransferBalanceFormData;
  nextStep: TransferBalanceFormType['nextStep'];
  handleChange: TransferBalanceFormType['handleChange'];
  submitForm: () => void;
}

function Step2({
  formData: { recipient, amount, memo, pool, transactionType },
  nextStep,
  submitForm,
  handleChange,
}: Step2Props): React.JSX.Element {
  const handleNextStep = () => {
    try {
      submitForm();
      nextStep();
    } catch (error) {
      handleChange('error')(String(error));
      nextStep();
      console.error(error);
    }
  };

  return (
    <div className="min-h-[460px] px-12 py-6 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-6 inline-flex">
      <div className="self-stretch h-[413px] flex-col justify-center items-center gap-3 flex">
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-black text-base font-medium font-['Roboto'] leading-normal">
            To:
          </div>
          <div className="p-3 rounded-xl justify-start items-center gap-2 flex">
            <div className="text-[#4f4f4f] text-base font-normal font-['Roboto'] break-all leading-normal">
              {recipient}
            </div>
          </div>
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-black text-base font-medium font-['Roboto'] leading-normal">
            Transaction type:
          </div>
          <div className="p-3 rounded-xl justify-start items-center gap-2 flex">
            <div className="text-[#4f4f4f] text-base font-normal font-['Roboto'] leading-normal capitalize">
              {transactionType}
            </div>
          </div>
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-black text-base font-medium font-['Roboto'] leading-normal">
            Pool:
          </div>
          <div className="p-3 rounded-xl justify-start items-center gap-2 flex">
            <div className="text-[#4f4f4f] text-base font-normal font-['Roboto'] capitalize leading-normal">
              {pool}
            </div>
          </div>
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-black text-base font-normal font-['Roboto'] leading-normal">
            Amount:
          </div>
          <div className="px-4 py-1.5 bg-[#e8e8e8] rounded-3xl justify-center items-center gap-2.5 flex">
            <div className="text-[#0e0e0e] text-sm font-medium font-['Roboto'] leading-[21px]">
              {amount} ZEC
            </div>
          </div>
        </div>
        {memo && (
          <div className="self-stretch h-[104px] py-6 border-t border-b border-[#c6c4c4] flex-col justify-start items-start gap-2 flex">
            <div className="self-stretch text-black text-base font-medium font-['Roboto'] leading-normal">
              Memo:
            </div>
            <div className="self-stretch bg-white rounded-xl justify-start items-start gap-2 inline-flex">
              <div className="grow shrink basis-0 text-[#4f4f4f] text-base font-normal font-['Roboto'] leading-normal">
                {memo}
              </div>
            </div>
          </div>
        )}
        <div className="self-stretch pt-6 flex-col justify-center items-center gap-3 flex">
          <div className="justify-start items-start inline-flex">
          <Button
              onClick={() => handleNextStep()}
              label={'Complete transfer'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2;
