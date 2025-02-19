import React from 'react';
import cn from 'classnames';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps {
  onClick: () => void;
  label: string;
  classNames?: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

function Button({
  onClick,
  label,
  classNames = '',
  variant = 'primary',
  icon,
}: ButtonProps) {
  const buttonClasses = cn(
    'min-w-[228px] px-6 py-3 rounded-3xl text-base font-medium leading-normal',
    'cursor-pointer transition-all hover:transition-all',
    {
      'bg-[#0e0e0e] text-white border hover:bg-buttonBlackGradientHover':
        variant === 'primary',
      'bg-transparent text-black hover:bg-[#fff7e6] border hover:border-[#ffa940]':
        variant === 'secondary',
    },
    classNames,
  );

  return (
    <button onClick={onClick} className={buttonClasses}>
      <div className="flex items-center justify-center">
        {icon && <span className="mr-2 flex items-center">{icon}</span>}
        <span>{label}</span>
      </div>
    </button>
  );
}

export default Button;
