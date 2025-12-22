import React from 'react';
import { CircleDashedSvg, CircleSvg } from '../../assets';
import cn from 'classnames';

interface TabProps {
  tabName: string;
  label: string;
  isActive: boolean;
  onClick: (key: string) => void;
}

const Tab: React.FC<TabProps> = ({ tabName, label, isActive, onClick }) => {
  return (
    <div
      onClick={() => onClick(tabName)}
      className={cn(
        'px-4 py-2 justify-center items-center gap-1.5 flex rounded-3xl cursor-pointer',
        {
          'bg-gray-800 text-white font-semibold': isActive,
          'bg-transparent text-gray-400': !isActive,
        },
      )}
    >
      <div className="justify-start items-center gap-1 flex">
        {isActive ? <CircleSvg /> : <CircleDashedSvg />}
        <div className="text-center">{label}</div>
      </div>
    </div>
  );
};

export default Tab;
