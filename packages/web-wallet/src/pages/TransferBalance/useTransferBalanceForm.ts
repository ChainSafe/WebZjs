import React, { useState } from 'react';
import { PcztTransferStatus, usePczt } from '../../hooks/usePCZT';
import { useWebZjsContext } from '../../context/WebzjsContext';

export interface TransferBalanceFormData {
  amount: string;
  recipient: string;
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
  pcztTransferStatus: PcztTransferStatus;
  lastError: string | null;
  nextStep: () => void;
  handleChange: TransferBalanceFormHandleChange;
  submitForm: () => void;
  resetForm: () => void;
}

export enum TransferStep {
  INPUT,
  CONFIRM,
  RESULT
}

const useTransferBalanceForm = (): TransferBalanceFormType => {
  const { state } = useWebZjsContext();
  const { handlePcztTransaction, pcztTransferStatus, lastError } = usePczt();
  const [currentStep, setCurrentStep] = useState<TransferStep>(0);
  const [formData, setFormData] = useState<TransferBalanceFormData>({
    amount: '',
    recipient: '',
  });

  const nextStep = () => setCurrentStep((prev) => prev + 1);

  const handleChange: TransferBalanceFormHandleChange = (input) => (e) => {
    if (typeof e === 'string') {
      setFormData({ ...formData, [input]: e });
    } else {
      setFormData({ ...formData, [input]: e.target.value });
    }
  };

  const submitForm = () => {
    const { amount, recipient } = formData;
    const accountId = state.activeAccount ?? 0;
    handlePcztTransaction(accountId, recipient, amount);
  };


  const resetForm = () => {
    setFormData({
      amount: '',
      recipient: '',
    });
    setCurrentStep(TransferStep.INPUT);
  };

  return {
    currentStep,
    formData,
    pcztTransferStatus,
    lastError,
    nextStep,
    handleChange,
    submitForm,
    resetForm,
  };
};

export default useTransferBalanceForm;
