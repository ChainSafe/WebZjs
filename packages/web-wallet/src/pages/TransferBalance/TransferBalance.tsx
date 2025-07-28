import React from 'react';
import { ZcashYellowPNG } from '../../assets';
import useTransferBalanceForm, { TransferStep } from './useTransferBalanceForm';
import PageHeading from '../../components/PageHeading/PageHeading';
import useBalance from '../../hooks/useBalance';
import { zatsToZec } from '../../utils';
import { TransferInput, TransferConfirm, TransferResult } from 'src/components/TransferCards';

function TransferBalance(): React.JSX.Element {
  const { shieldedBalance } = useBalance();
  const {
    currentStep,
    formData,
    pcztTransferStatus,
    nextStep,
    handleChange,
    resetForm,
    submitForm,
  } = useTransferBalanceForm();


  return (
    <div className="flex flex-col w-full">
      {currentStep !== 3 && (
        <PageHeading title="Transfer Balance">
          <div className="flex items-center gap-2.5">
            <span className="text-black text-base font-normal font-inter leading-tight">
              Available shielded balance:
            </span>
            <div className="px-4 py-2 bg-[#e8e8e8] rounded-3xl flex items-center gap-2.5">
              <img
                src={ZcashYellowPNG}
                alt="Zcash Yellow"
                className="w-5 h-5"
              />
              <span className="text-[#434343] text-base font-semibold font-inter leading-tight">
                {zatsToZec(shieldedBalance)} ZEC
              </span>
            </div>
          </div>
        </PageHeading>
      )}
      {currentStep === TransferStep.INPUT && (
        <TransferInput
          formData={formData}
          nextStep={nextStep}
          handleChange={handleChange}
        />
      )}
      {currentStep === TransferStep.CONFIRM && (
        <TransferConfirm
          submitForm={submitForm}
          formData={formData}
          nextStep={nextStep}
        />
      )}
      {currentStep === TransferStep.RESULT && (
        <TransferResult
          pcztTransferStatus={pcztTransferStatus}
          resetForm={resetForm}
        />)}
    </div>
  );
}

export default TransferBalance;
