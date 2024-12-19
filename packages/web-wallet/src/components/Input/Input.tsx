import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={props.id}
          className={`text-black text-base font-normal leading-normal ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <input
        className={`p-3 bg-neutral-50 rounded-xl border border-[#afafaf] text-base leading-normal text-[#0e0e0e] ${inputClassName}`}
        {...props}
      />
      {error && <span className={`text-sm text-red-500`}>{error}</span>}
    </div>
  );
};

export default Input;
