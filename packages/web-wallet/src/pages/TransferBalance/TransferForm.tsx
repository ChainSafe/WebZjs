import React, { useState } from 'react';
import Input from '@components/Input/Input';
import Select from '@components/Select/Select';
import Button from '@components/Button/Button';

enum TransactionType {
  SHIELDED = 'shielded',
  TRANSPARENT = 'transparent',
}

enum PoolType {
  ORCHARD = 'orchard',
  SAPLING = 'sapling',
}

const TransactionTypeSelectOptions = [
  { value: '', label: '-Select-' },
  { value: TransactionType.SHIELDED, label: 'Shielded' },
  { value: TransactionType.TRANSPARENT, label: 'Transparent' },
];

const PoolSelectOptions = [
  { value: PoolType.ORCHARD, label: 'Orchard' },
  { value: PoolType.SAPLING, label: 'Sapling' },
];

function TransferForm(): React.JSX.Element {
  const [toAddress, setToAddress] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState('');
  const [pool, setPool] = useState<PoolType>(PoolType.ORCHARD);
  const [memo, setMemo] = useState('');

  const [errors, setErrors] = useState({
    toAddress: '',
    transactionType: '',
    amount: '',
  });

  const validateFields = () => {
    const newErrors = {
      toAddress: '',
      transactionType: '',
      amount: '',
    };

    if (!toAddress) {
      newErrors.toAddress = 'Please enter a valid address';
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
    if (transactionType === TransactionType.TRANSPARENT && memo.length > 0) {
      setMemo('');
    }

    if (validateFields()) {
      // Proceed with form submission
      console.log('Form is valid, proceed with transaction');
    }
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
                error={errors.toAddress}
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
              />
            </div>
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <div className="self-stretch text-black text-base font-normal font-['Roboto'] leading-normal">
                <Select
                  label="Transaction type:"
                  id="tx-type"
                  value={transactionType}
                  error={errors.transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
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
                error={errors.amount}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-2 inline-flex">
              <Select
                label="Pools:"
                id="pools"
                value={pool}
                onChange={(e) => setPool(e.target.value as PoolType)}
                options={PoolSelectOptions}
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
              onChange={(e) => setMemo(e.target.value)}
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

export default TransferForm;
