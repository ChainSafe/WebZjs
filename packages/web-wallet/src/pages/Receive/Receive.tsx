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
  const [unifiedAddress, setUnifiedAddress] = useState('');
  const { getAccountData } = useWebZjsActions();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAccountData();
      if (data) setUnifiedAddress(data.unifiedAddress);
      setLoading(false);
    };
    fetchData();
  }, [getAccountData]);

  const tabs = {
    [AddressType.UNIFIED]: {
      label: 'Unified Address',
      component: <QrCode address={unifiedAddress} />,
    },
    [AddressType.TRANSPARENT]: {
      label: 'Transparent Address',
      component: <div>TODO: Transparent address</div>,
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
                  label={tabs[tab as AddressType].label}
                  isActive={activeTab === tab}
                  onClick={() => setActiveTab(tab as AddressType)}
                />
              ))}
            </div>
            {/* Tabs content */}
            {tabs[activeTab].component}
          </>
        )}
      </div>
    </>
  );
}

export default Receive;
