import React, { useEffect, useState } from 'react';
import { useWebZjsActions } from '@hooks/useWebzjsActions';
import QrCode from '@pages/Receive/QrCode';
import Tab from '@pages/Receive/Tab';

enum TabTypes {
  UNIFIED = 'unified',
  TRANSPARENT = 'transparent',
}

function Receive(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabTypes>(TabTypes.UNIFIED);
  const [unifiedAddress, setUnifiedAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { getAccountData } = useWebZjsActions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAccountData();
        if (data) setUnifiedAddress(data.unifiedAddress);
      } catch (err) {
        setError('Failed to fetch account data');
      }
    };

    fetchData();
  }, [getAccountData]);

  const tabs = {
    [TabTypes.UNIFIED]: {
      label: 'Unified Address',
      component: <QrCode address={unifiedAddress} />,
    },
    [TabTypes.TRANSPARENT]: {
      label: 'Transparent Address',
      component: <div>TODO: Transparent address</div>,
    },
  };

  return (
    <>
      <section className="py-6 mb-12 border-b border-[#bfbfbf] flex flex-col items-center gap-3">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-black text-4xl font-medium font-inter leading-normal">
              Receive
            </h2>
          </div>
        </div>
      </section>
      <div className="max-w-[1000px] p-9 bg-white rounded-3xl border border-[#afafaf] flex-col justify-start items-center gap-9 inline-flex">
        <div className="self-stretch px-[75px] justify-center items-start gap-3 inline-flex">
          {Object.keys(tabs).map((tab) => (
            <Tab
              key={tab}
              label={tabs[tab as TabTypes].label}
              isActive={activeTab === tab}
              onClick={() => setActiveTab(tab as TabTypes)}
            />
          ))}
        </div>
        {/* Tabs content */}
        {tabs[activeTab].component}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    </>
  );
}

export default Receive;
