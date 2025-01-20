import React from 'react';
import { CircleDashedSvg, CircleSvg } from '../../assets';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => {
  const baseClasses =
    'px-4 py-2 justify-center items-center gap-1.5 flex rounded-3xl';
  const classNames = isActive
    ? `${baseClasses} bg-[#e8e8e8] text-black font-semibold`
    : `${baseClasses} bg-transparent text-[#afafaf]`;

  return (
    <div onClick={onClick} className={classNames}>
      <div className="justify-start items-center gap-1 flex">
        {isActive ? <CircleSvg /> : <CircleDashedSvg />}
        <div className="text-center">{label}</div>
      </div>
    </div>
  );
};

export default Tab;
