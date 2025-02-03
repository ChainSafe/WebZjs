import React from 'react';
import PageHeading from '../components/PageHeading/PageHeading';
import Table from '../components/Table/Table';

const data = [
  {
    recipient: 'Shielded Recipient',
    amount: '+0.008',
    status: 'Received',
    date: 'Oct 31, 2023',
  },
  {
    recipient: 'zs13h7mt2xyk5t2xy38...2xvxser2',
    amount: '-0.001',
    status: 'Sent',
    date: 'Jun 12, 2024',
  },
  {
    recipient: 'zs13h7mt2xyk5t2xy38...2xvxser2',
    amount: '-0.001',
    status: 'Sent',
    date: 'Jun 12, 2024',
  },
  {
    recipient: 'zs13h7mt2xyk5t2xy38...2xvxser2',
    amount: '-0.001',
    status: 'Sent',
    date: 'Jun 12, 2024',
  },
  {
    recipient: 'zs13h7mt2xyk5t2xy38...2xvxser2',
    amount: '-0.001',
    status: 'Sent',
    date: 'Jun 12, 2024',
  },

  {
    recipient: 'u1jjfvrz0jt2xy38...a77mt2xy383x',
    amount: '+0.000',
    status: 'Sent',
    date: 'May 11, 2024',
  },
  {
    recipient: 'Shielded recipient',
    amount: '+0.001',
    status: 'Sent',
    date: 'Mar 14, 2024',
  },
  {
    recipient: 'Shielded recipient',
    amount: '-0.001',
    status: 'Received',
    date: 'Dec 23, 2023',
  },
  {
    recipient: 'Shielded Recipient',
    amount: '+0.008',
    status: 'Received',
    date: 'Oct 31, 2023',
  },
];

const columns = [
  { label: 'Recipient', key: 'recipient' },
  { label: 'Amount', key: 'amount' },
  {
    label: 'Sent/Received',
    key: 'status',
    render: (value: string) => (
      <div
        className={`px-4 py-0.5 ${value === 'Sent' ? 'bg-[#ceeddf] text-emerald-700' : 'bg-[#ebeeff] text-[#566bdf]'} rounded-3xl justify-center items-center gap-2.5 inline-flex`}
      >
        <div className="text-sm font-medium font-['Roboto'] leading-[21px]">
          {value}
        </div>
      </div>
    ),
  },
  { label: 'Date', key: 'date' },
];

function TransactionHistory(): React.JSX.Element {
  return (
    <>
      <PageHeading title="Transaction history" />
      <Table columns={columns} data={data} />
    </>
  );
}

export default TransactionHistory;
