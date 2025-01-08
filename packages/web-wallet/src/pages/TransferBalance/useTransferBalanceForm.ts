import React, { useState } from 'react';
import { PoolType, TransactionType } from '../../types/transfer';

export interface TransferBalanceFormData {
  amount: string;
  recipient: string;
  transactionType?: TransactionType;
  pool: PoolType;
  memo?: string;
}

export type TransferBalanceFormHandleChange = (
  input: keyof TransferBalanceFormData,
) => (
  e:
    | React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    | string,
) => void;

export interface TransferBalanceFormType {
  currentStep: number;
  formData: TransferBalanceFormData;
  nextStep: () => void;
  prevStep: () => void;
  handleChange: TransferBalanceFormHandleChange;
  resetForm: () => void;
}

const useTransferBalanceForm = (): TransferBalanceFormType => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<TransferBalanceFormData>({
    amount: '',
    recipient: '',
    transactionType: undefined,
    pool: PoolType.ORCHARD,
  });

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleChange: TransferBalanceFormHandleChange = (input) => (e) => {
    if (typeof e === 'string') {
      setFormData({ ...formData, [input]: e });
    } else {
      setFormData({ ...formData, [input]: e.target.value });
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      recipient: '',
      transactionType: undefined,
      pool: PoolType.ORCHARD,
      memo: '',
    });
    setCurrentStep(1);
  };

  return {
    currentStep,
    formData,
    nextStep,
    prevStep,
    handleChange,
    resetForm,
  };
};

export default useTransferBalanceForm;
