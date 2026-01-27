import { useNavigate } from 'react-router-dom';
import { TransferBalanceFormType } from '../../pages/TransferBalance/useTransferBalanceForm';
import React from 'react';
import { CheckSVG, WarningSVG } from '../../assets';
import Button from '../Button/Button';
import TransactionStatusCard from '../TransactionStatusCard/TransactionStatusCard';
import { PcztTransferStatus } from 'src/hooks/usePCZT';
import Loader from 'src/components/Loader/Loader';

interface TransferResultProps {
  pcztTransferStatus: PcztTransferStatus;
  resetForm: TransferBalanceFormType['resetForm'];
  isShieldTransaction?: boolean;
  errorMessage?: string | null;
}

export function TransferResult({
  pcztTransferStatus,
  resetForm,
  isShieldTransaction,
  errorMessage,
}: TransferResultProps): React.JSX.Element {
  const navigate = useNavigate();

  const actionWord = isShieldTransaction ? 'Shielding' : 'Transfer';

  switch (pcztTransferStatus) {
    case PcztTransferStatus.SEND_SUCCESSFUL:
      return <TransactionStatusCard
        headText={`${actionWord} complete`}
        statusMessage={`Your transaction has been sent.`}
        icon={<CheckSVG />}
      >
        <Button
          onClick={() =>
            navigate('/dashboard/account-summary', { replace: true })
          }
          label={`Back to Account Summary`}
        />
        {!isShieldTransaction && (
          <Button
            variant="secondary"
            classNames="border-[#0e0e0e]"
            onClick={() => resetForm()}
            label={'Make Another Transfer'}
          />
        )}
      </TransactionStatusCard>

    case PcztTransferStatus.SEND_ERROR:
      return <TransactionStatusCard
        headText={`${actionWord} incomplete`}
        statusMessage={errorMessage || 'Your transaction has not been sent.'}
        icon={<WarningSVG />}
      >

        {!isShieldTransaction && (
          <Button
            variant="primary"
            onClick={() => resetForm()}
            label={'Try Again'}
          />
        )}
      </TransactionStatusCard>

    default:
      return <TransactionStatusCard
        headText={`${actionWord} in progress...`}
        statusMessage={pcztTransferStatus}
        icon={<Loader />}
      />
  }

}

