import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  containerClassName = '',
  labelClassName = '',
  selectClassName = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col w-full gap-1 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={props.id}
          className={`text-black text-base font-normal leading-normal ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`h-12 px-3 py-1 bg-neutral-50 rounded-xl border border-[#afafaf] appearance-none text-base leading-normal text-[#0e0e0e] font-medium w-full pr-8 ${selectClassName}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-sm text-red-500">{error}</span>}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#a9aaab]">
          ▼
        </div>
      </div>
    </div>
  );
};

export default Select;
