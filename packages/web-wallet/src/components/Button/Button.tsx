import React from 'react';
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
  const baseClasses =
    'min-w-[228px] px-6 py-3 rounded-3xl text-base font-medium leading-normal cursor-pointer transition-all hover:transition-all';

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#0e0e0e] text-white border hover:bg-buttonBlackGradientHover'
      : 'bg-transparent text-black hover:bg-[#fff7e6] border hover:border-[#ffa940]';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${classNames}`}
    >
      <div className="flex items-center justify-center">
        {icon && <span className="mr-2 flex items-center">{icon}</span>}
        <span>{label}</span>
      </div>
    </button>
  );
}

export default Button;
