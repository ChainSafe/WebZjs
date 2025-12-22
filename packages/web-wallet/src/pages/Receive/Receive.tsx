import React, { useEffect, useState } from 'react';
import { useWebZjsActions } from '../../hooks';
import QrCode from './QrCode';
import PageHeading from '../../components/PageHeading/PageHeading';
import Loader from '../../components/Loader/Loader';

function Receive(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [unifiedAddress, setUnifiedAddress] = useState('');
  const { getAccountData } = useWebZjsActions();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAccountData();
      if (data) {
        setUnifiedAddress(data.unifiedAddress);
      }
      setLoading(false);
    };
    fetchData();
  }, [getAccountData]);

  return (
    <>
      <PageHeading title="Receive" />
      <div className="max-w-[1000px] p-9 bg-gray-900 rounded-3xl border border-gray-700 flex-col justify-start items-center gap-9 inline-flex">
        {loading ? (
          <Loader />
        ) : (
          <QrCode address={unifiedAddress} />
        )}
      </div>
    </>
  );
}

export default Receive;
