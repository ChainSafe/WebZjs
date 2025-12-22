import React from 'react';
import ErrorMessage from '../ErrorMessage/ErrorMessage';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  suffix?: string;
  id: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  suffix = '',
  id,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className={`text-gray-200 text-base font-normal leading-normal ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="h-full flex items-center bg-gray-900 rounded-xl border border-gray-700 p-3">
        <input
          {...props}
          id={id}
          className={`grow bg-transparent focus:outline-hidden text-white text-base font-semibold font-inter ${inputClassName}`}
          aria-describedby={`${id}-suffix`}
        />
        <span
          id={`${id}-suffix`}
          className="ml-2 text-gray-400 text-base font-medium leading-normal"
        >
          {suffix}
        </span>
      </div>
      <ErrorMessage text={error} />
    </div>
  );
};

export default Input;
