import React, { useState } from 'react';
import {
  TransferBalanceFormData,
  TransferBalanceFormHandleChange,
} from '../../pages/TransferBalance/useTransferBalanceForm';
import Input from '../Input/Input';
import Button from '../Button/Button';
import useBalance from '../../hooks/useBalance';
import { zecToZats, zatsToZec } from '../../utils/balance';

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
  const { spendableBalance } = useBalance();

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

    // Amount validation
    if (!amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(amount))) {
      newErrors.amount = 'Please enter a valid number';
    } else if (Number(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else {
      // Balance validation with fee buffer
      try {
        const amountInZats = zecToZats(amount);
        const FEE_BUFFER = 10_000; // Conservative estimate: 0.0001 ZEC buffer for fees
        const totalRequired = Number(amountInZats) + FEE_BUFFER;

        if (totalRequired > spendableBalance) {
          const availableZec = zatsToZec(Math.max(0, spendableBalance - FEE_BUFFER));
          newErrors.amount = `Insufficient balance. Available (after fees): ${availableZec.toFixed(8)} ZEC`;
        }
      } catch (error) {
        // If conversion fails, let it pass - the error will be caught later
        // This handles edge cases like invalid decimal formats
      }
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleContinue = () => {

    if (validateFields()) nextStep();
  };

  return (
    <div className="px-12 py-9 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-6 inline-flex">
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

