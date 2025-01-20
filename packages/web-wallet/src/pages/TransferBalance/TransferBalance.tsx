import React from 'react';
import { ZcashYellowSvg } from '../../assets';
import useBalance from '@hooks/useBalance';
import useTransferBalanceForm from './useTransferBalanceForm';
import Step1 from '@pages/TransferBalance/Step1';
import Step2 from '@pages/TransferBalance/Step2';
import Step3 from '@pages/TransferBalance/Step3';

function TransferBalance(): React.JSX.Element {
  const { totalBalance } = useBalance();
  const { currentStep, formData, nextStep, handleChange, resetForm } =
    useTransferBalanceForm();

  return (
    <div className="flex flex-col w-full">
      {currentStep !== 3 && (
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
                  {totalBalance} ZEC
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {currentStep === 1 && (
        <Step1
          formData={formData}
          nextStep={nextStep}
          handleChange={handleChange}
        />
      )}
      {currentStep === 2 && <Step2 formData={formData} nextStep={nextStep} />}
      {currentStep === 3 && <Step3 resetForm={resetForm} />}
    </div>
  );
}

export default TransferBalance;
