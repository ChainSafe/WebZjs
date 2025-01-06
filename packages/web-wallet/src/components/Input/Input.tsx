import React from 'react';
import ErrorMessage from '@components/ErrorMessage/ErrorMessage';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  suffix?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  suffix = '',
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
      <div className="h-full flex items-center bg-neutral-50 rounded-xl border border-[#afafaf] p-3">
        <input
          id={props.id}
          className={`flex-grow bg-transparent focus:outline-none text-[#0e0e0e] text-base font-semibold font-inter ${inputClassName}`}
          {...props}
          aria-describedby={props.id ? `${props.id}-suffix` : undefined}
        />
        <span
          id={props.id ? `${props.id}-suffix` : undefined}
          className="ml-2 text-[#a9aaab] text-base font-medium leading-normal"
        >
          {suffix}
        </span>
      </div>
      <ErrorMessage text={error} />
    </div>
  );
};

export default Input;
