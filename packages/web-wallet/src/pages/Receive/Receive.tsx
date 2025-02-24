import React, { useEffect, useState } from 'react';
import { useWebZjsActions } from '../../hooks';
import QrCode from './QrCode';
import PageHeading from '../../components/PageHeading/PageHeading';
import Loader from '../../components/Loader/Loader';
import Tab from './Tab';

enum AddressType {
  UNIFIED = 'unified',
  TRANSPARENT = 'transparent',
}

function Receive(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AddressType>(AddressType.UNIFIED);
  const [addresses, setAddresses] = useState<{
    unifiedAddress: string;
    transparentAddress: string;
  }>({
    unifiedAddress: '',
    transparentAddress: '',
  });
  const [error, setError] = useState<string | null>(null);
  const { getAccountData } = useWebZjsActions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAccountData();
        if (data)
          setAddresses({
            unifiedAddress: data.unifiedAddress,
            transparentAddress: data.transparentAddress,
          });
      } catch (err) {
        setError('Failed to fetch account data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getAccountData]);

  const tabs = {
    [AddressType.UNIFIED]: {
      label: 'Unified Address',
    },
    [AddressType.TRANSPARENT]: {
      label: 'Transparent Address',
    },
  };

  return (
    <>
      <PageHeading title="Receive" />
      <div className="max-w-[1000px] p-9 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-9 inline-flex">
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="self-stretch px-[75px] justify-center items-start gap-3 inline-flex">
              {Object.keys(tabs).map((tab) => (
                <Tab
                  key={tab}
                  tabName={tab}
                  label={tabs[tab as AddressType].label}
                  isActive={activeTab === tab}
                  onClick={() => setActiveTab(tab as AddressType)}
                />
              ))}
            </div>
            {activeTab === AddressType.UNIFIED && (
              <QrCode address={addresses.unifiedAddress} />
            )}
            {activeTab === AddressType.TRANSPARENT && (
              <QrCode address={addresses.transparentAddress} />
            )}
          </>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    </>
  );
}

export default Receive;
