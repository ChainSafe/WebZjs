import React, { useState } from 'react';
import {
  TransferBalanceFormData,
  TransferBalanceFormHandleChange,
} from './useTransferBalanceForm';
import { PoolType, TransactionType } from '../../types/transfer';
import useBalance from '../../hooks/useBalance';
import Select from '../../components/Select/Select';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';

const TransactionTypeSelectOptions = [
  { value: TransactionType.SHIELDED, label: 'Shielded' },
  { value: TransactionType.TRANSPARENT, label: 'Transparent' },
];
const PoolSelectOptions = [
  { value: PoolType.ORCHARD, label: 'Orchard' },
  { value: PoolType.SAPLING, label: 'Sapling' },
];

interface Step1Props {
  formData: TransferBalanceFormData;
  handleChange: TransferBalanceFormHandleChange;
  nextStep: () => void;
}

function Step1({
  formData: { recipient, transactionType, amount, pool, memo },
  nextStep,
  handleChange,
}: Step1Props): React.JSX.Element {
  const { orchardBalance, saplingBalance } = useBalance();
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

    if (!transactionType) {
      newErrors.transactionType = 'Please select a transaction type.';
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter an valid amount to transfer';
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleContinue = () => {
    if (
      transactionType === TransactionType.TRANSPARENT &&
      memo &&
      memo.length > 0
    )
      handleChange('memo')('');

    if (validateFields()) nextStep();
  };

  const renderBalanceLabel = (balance: number) => {
    return (
      <div className="h-[25px] px-4 py-0.5 bg-neutral-200 rounded-3xl justify-center items-center gap-2.5 inline-flex">
        <div className="text-[#434343] text-sm font-medium font-['Roboto'] leading-[21px]">
          {balance} ZEC
        </div>
      </div>
    );
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
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <div className="self-stretch text-black text-base font-normal font-['Roboto'] leading-normal">
                <Select
                  label="Transaction type:"
                  id="tx-type"
                  value={transactionType}
                  error={errors.transactionType}
                  handleChange={(value) => {
                    console.log('handleChange', value);
                    handleChange('transactionType')(value);
                  }}
                  options={TransactionTypeSelectOptions}
                />
              </div>
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
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <Select
                label="Pools:"
                id="pools"
                value={pool}
                suffix={
                  pool === PoolType.ORCHARD
                    ? renderBalanceLabel(orchardBalance)
                    : renderBalanceLabel(saplingBalance)
                }
                handleChange={(value) => handleChange('pool')(value)}
                options={PoolSelectOptions}
                defaultOption={PoolSelectOptions[0]}
              />
            </div>
          </div>
        </div>
        {transactionType !== TransactionType.TRANSPARENT && (
          <div className="w-full flex flex-col gap-2">
            <label className="text-black text-base font-normal leading-normal">
              Memo:
            </label>
            <textarea
              className="p-3 rounded-xl border border-[#afafaf] flex h-[10rem] text-[#afafaf] bg-neutral-50 text-base font-normal leading-normal resize-none"
              placeholder="Write private memo here..."
              value={memo}
              onChange={(event) => handleChange('memo')(event)}
            />
          </div>
        )}
        <div className="justify-start items-start inline-flex">
          <Button onClick={() => handleContinue()} label="Continue" />
        </div>
      </div>
    </div>
  );
}

export default Step1;
