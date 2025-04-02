import { useNavigate } from 'react-router-dom';
import { TransferBalanceFormType } from './useTransferBalanceForm';
import React from 'react';
import { CheckSVG, WarningSVG } from '../../assets';
import Button from '../../components/Button/Button';
import TransactionStatusCard from '../../components/TransactionStatusCard/TransactionStatusCard';
import { PcztTransferStatus } from 'src/hooks/usePCZT';
import Loader from 'src/components/Loader/Loader';

interface TransferResultProps {
  pcztTransferStatus: PcztTransferStatus;
  resetForm: TransferBalanceFormType['resetForm'];
}

export function TransferResult({
  pcztTransferStatus,
  resetForm,
}: TransferResultProps): React.JSX.Element {
  const navigate = useNavigate();

  switch (pcztTransferStatus) {
    case PcztTransferStatus.SEND_SUCCESSFUL:
      return <TransactionStatusCard
        headText="Transfer complete"
        statusMessage="Your transaction has been sent."
        icon={<CheckSVG />}
      >
        <Button
          onClick={() =>
            navigate('/dashboard/account-summary', { replace: true })
          }
          label={'Back to Account Summary'}
        />
        <Button
          variant="secondary"
          classNames="border-[#0e0e0e]"
          onClick={() => resetForm()}
          label={'Make Another Transfer'}
        />
      </TransactionStatusCard>

    case PcztTransferStatus.SEND_ERROR:
      return <TransactionStatusCard
        headText="Transfer incomplete"
        statusMessage="Your transaction has not been sent."
        icon={<WarningSVG />}
      >
        <Button
          variant="primary"
          onClick={() => resetForm()}
          label={'Try Again'}
        />
      </TransactionStatusCard>

    default:
      return <TransactionStatusCard
        headText="Transfer in progres..."
        statusMessage={pcztTransferStatus}
        icon={<Loader />}
      />
  }

}

