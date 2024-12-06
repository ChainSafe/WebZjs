import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowReceiveSvg,
  ArrowTransferSvg,
  ClockSvg,
  SummarySvg,
} from '../assets';

interface NavItem {
  to: string;
  label: string;
  icon: React.JSX.Element;
}

const navItems: NavItem[] = [
  {
    to: 'account-summary',
    label: 'Account Summary',
    icon: <SummarySvg />,
  },
  {
    to: 'transfer-balance',
    label: 'Transfer Balance',
    icon: <ArrowTransferSvg />,
  },
  {
    to: 'receive',
    label: 'Receive',
    icon: <ArrowReceiveSvg />,
  },
  {
    to: 'transaction-history',
    label: 'Transaction History',
    icon: <ClockSvg />,
  },
];

const getClassNames = (isActive: boolean) => {
  const baseClasses =
    'text-sm font-medium text-[#0e0e0e] font-inter font-semibold leading-tight';
  return isActive
    ? `${baseClasses} pb-3 text-black border-b border-orange-500`
    : `${baseClasses}`;
};

const Dashboard: React.FC = () => {
  return (
    <div>
      <nav className="flex space-x-9 mb-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => {
              return getClassNames(isActive);
            }}
          >
            {({ isActive }) => (
              <span
                className={`inline-flex items-center hover:text-brand-orange navbar-link ${isActive && 'navbar-link-active'}`}
              >
                <span className="text-brand-grey10  mr-2">{item.icon}</span>
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default Dashboard;
