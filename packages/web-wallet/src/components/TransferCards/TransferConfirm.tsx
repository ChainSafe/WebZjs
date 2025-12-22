import React from 'react';
import {
  TransferBalanceFormData,
  TransferBalanceFormType,
} from '../../pages/TransferBalance/useTransferBalanceForm';
import Button from '../Button/Button';

interface TransferConfirmProps {
  formData: TransferBalanceFormData;
  nextStep: TransferBalanceFormType['nextStep'];
  submitForm: () => void;
}

export function TransferConfirm({
  formData: { recipient, amount},
  nextStep,
  submitForm,
}: TransferConfirmProps): React.JSX.Element {
  const handleNextStep = () => {
    try {
      submitForm();
      nextStep();
    } catch (error) {
      nextStep();
      console.error(error);
    }
  };

  return (
    <div className="min-h-[460px] px-12 py-6 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-6 inline-flex">
      <div className="self-stretch h-[413px] flex-col justify-center items-center gap-3 flex">
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-white text-base font-medium font-['Roboto'] leading-normal">
            To:
          </div>
          <div className="p-3 rounded-xl justify-start items-center gap-2 flex">
            <div className="text-gray-400 text-base font-normal font-['Roboto'] break-all leading-normal">
              {recipient}
            </div>
          </div>
        </div>
        <div className="self-stretch justify-start items-center gap-2 inline-flex">
          <div className="grow shrink basis-0 text-white text-base font-normal font-['Roboto'] leading-normal">
            Amount:
          </div>
          <div className="px-4 py-1.5 bg-gray-800 rounded-3xl justify-center items-center gap-2.5 flex">
            <div className="text-white text-sm font-medium font-['Roboto'] leading-[21px]">
              {amount} ZEC
            </div>
          </div>
        </div>
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

