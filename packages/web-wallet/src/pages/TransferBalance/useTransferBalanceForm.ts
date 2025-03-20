import React, { useState } from 'react';
import { PoolType, TransactionType } from '../../types/transfer';
import { usePczt } from '../../hooks/usePCZT';

export interface TransferBalanceFormData {
  amount: string;
  recipient: string;
  transactionType?: TransactionType;
  pool: PoolType;
  memo?: string;
  error: string;
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
  submitForm: () => void;
  resetForm: () => void;
}

const useTransferBalanceForm = (): TransferBalanceFormType => {
  const { handlePcztTransaction } = usePczt();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<TransferBalanceFormData>({
    amount: '',
    recipient: '',
    transactionType: undefined,
    pool: PoolType.ORCHARD,
    error: '',
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

  const submitForm = () => {
    const { amount, recipient } = formData;
    //TODO - get it from state
    handlePcztTransaction(1, recipient, amount);
  };


  const resetForm = () => {
    setFormData({
      amount: '',
      recipient: '',
      transactionType: undefined,
      pool: PoolType.ORCHARD,
      memo: '',
      error: '',
    });
    setCurrentStep(1);
  };

  return {
    currentStep,
    formData,
    nextStep,
    prevStep,
    handleChange,
    submitForm,
    resetForm,
  };
};

export default useTransferBalanceForm;
