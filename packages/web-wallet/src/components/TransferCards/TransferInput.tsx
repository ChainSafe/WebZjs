import React, { useState } from 'react';
import {
  TransferBalanceFormData,
  TransferBalanceFormHandleChange,
} from '../../pages/TransferBalance/useTransferBalanceForm';
import Input from '../Input/Input';
import Button from '../Button/Button';

interface TransferInputProps {
  formData: TransferBalanceFormData;
  handleChange: TransferBalanceFormHandleChange;
  nextStep: () => void;
}

export function TransferInput({
  formData: { recipient, amount},
  nextStep,
  handleChange,
}: TransferInputProps): React.JSX.Element {

  const [errors, setErrors] = useState({
    recipient: '',
    transactionType: '',
    amount: '',
  });

  const validateFields = () => {
    const newErrors = {
      recipient: '',
      transactionType: '',
      amount: '',
    };

    if (!recipient) {
      newErrors.recipient = 'Please enter a valid address';
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter an valid amount to transfer';
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleContinue = () => {

    if (validateFields()) nextStep();
  };

  return (
    <div className="px-12 py-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-6 inline-flex">
      <div className="self-stretch flex-col justify-center items-center gap-6 flex">
        <div className="self-stretch h-[184px] flex-col justify-center items-start gap-6 flex">
          <div className="self-stretch justify-start items-start gap-6 inline-flex">
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <Input
                label="To:"
                id="recipient"
                placeholder="Zcash Address"
                error={errors.recipient}
                value={recipient}
                onChange={(event) => handleChange('recipient')(event)}
              />
            </div>
          </div>
          <div className="self-stretch justify-start items-start gap-6 inline-flex">
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <Input
                label="Amount:"
                id="amount"
                suffix="ZEC"
                error={errors.amount}
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => handleChange('amount')(event)}
              />
            </div>
          </div>
        </div>
        <div className="justify-start items-start inline-flex">
          <Button classNames='cursor-pointer' onClick={() => handleContinue()} label="Continue" />
        </div>
      </div>
    </div>
  );
}

