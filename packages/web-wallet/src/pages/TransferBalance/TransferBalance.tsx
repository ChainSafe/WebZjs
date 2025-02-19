import React from 'react';
import { ZcashYellowPNG } from '../../assets';
import useTransferBalanceForm from './useTransferBalanceForm';
import PageHeading from '../../components/PageHeading/PageHeading';
import useBalance from '../../hooks/useBalance';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import { zatsToZec } from '../../utils';

function TransferBalance(): React.JSX.Element {
  const { totalBalance } = useBalance();
  const { currentStep, formData, nextStep, handleChange, resetForm } =
    useTransferBalanceForm();

  return (
    <div className="flex flex-col w-full">
      {currentStep !== 3 && (
        <PageHeading title="Transfer Balance">
          <div className="flex items-center gap-2.5">
            <span className="text-black text-base font-normal font-inter leading-tight">
              Available:
            </span>
            <div className="px-4 py-2 bg-[#e8e8e8] rounded-3xl flex items-center gap-2.5">
              <img
                src={ZcashYellowPNG}
                alt="Zcash Yellow"
                className="w-5 h-5"
              />
              <span className="text-[#434343] text-base font-semibold font-inter leading-tight">
                {zatsToZec(totalBalance)} ZEC
              </span>
            </div>
          </div>
        </PageHeading>
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
