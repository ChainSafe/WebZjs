import React from 'react';
import cn from 'classnames';
import { NavLink } from 'react-router-dom';

import {
  ArrowReceiveSvg,
  ArrowTransferSvg,
  SummarySvg,
  ShieldSvg,
} from '../../assets';

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
    to: 'shielded-transfer',
    label: 'STRK Shielded Transfer',
    icon: <ShieldSvg />,
  },
  {
    to: 'receive',
    label: 'Receive',
    icon: <ArrowReceiveSvg />,
  },
];

function NavBar() {
  return (
    <nav className="flex space-x-9 mb-3 justify-center self-center items-center align-middle">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn('text-sm text-gray-300 font-semibold leading-tight pb-3', {
              'text-white border-b border-orange-500': isActive,
            })
          }
        >
          {({ isActive }) => (
            <span
              className={cn(
                'inline-flex items-center hover:text-brand-orange navbar-link',
                { 'navbar-link-active': isActive },
              )}
            >
              <span className="text-brand-grey10 text-sm  mr-2">
                {item.icon}
              </span>
              {item.label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default NavBar;
