import React, { useEffect, useRef, useState } from 'react';
import { ChevronSVG } from '../../assets';
import ErrorMessage from '../ErrorMessage/ErrorMessage';

interface Option {
  value: string;
  label: string;
}

interface OptionWithBalance extends Option {
  balance: number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[] | OptionWithBalance[];
  containerClassName?: string;
  labelClassName?: string;
  dropdownClassName?: string;
  defaultOption?: Option | OptionWithBalance;
  handleChange: (option: string) => void;
  selectedSuffix?: string | React.ReactNode;
  suffixOptions?: { label: string; value: string | React.JSX.Element }[];
}

interface DropdownOptionProps {
  option: Option;
  handleSelectOption: (option: Option) => void;
  suffixOptions?: { label: string; value: string | React.JSX.Element }[];
}

const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement | null>,
  callback: () => void,
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref && ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

const DropdownOption: React.FC<DropdownOptionProps> = ({
  option,
  handleSelectOption,
  suffixOptions,
}) => (
  <div
    className="px-6 mr-1 py-3 hover:bg-neutral-100 cursor-pointer flex justify-between items-center"
    onClick={() => handleSelectOption(option)}
  >
    <span className="text-[#0e0e0e] text-base font-normal font-['Roboto']">
      {option.label}
    </span>
    {suffixOptions && (
      <div className="ml-2">
        {suffixOptions.map((suffix) => {
          if (suffix.label === option.value) return suffix.value;
          return null;
        })}
      </div>
    )}
  </div>
);

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  defaultOption,
  containerClassName = '',
  labelClassName = '',
  dropdownClassName = '',
  selectedSuffix = '',
  suffixOptions,
  handleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(
    defaultOption || null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(containerRef, () => setIsOpen(false));

  const handleSelectOption = (option: Option) => {
    handleChange(option.value);
    setSelected(option);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full gap-1 ${containerClassName}`}
    >
      {label && (
        <label
          className={`text-black text-base font-normal leading-normal ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div
        className="relative h-full flex items-center bg-neutral-50 rounded-xl border border-[#afafaf] p-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="grow bg-transparent focus:outline-hidden text-[#0e0e0e] text-base font-semibold font-inter">
          {selected ? (
            selected.label
          ) : (
            <div className="text-[#afafaf] text-base font-normal font-['Roboto'] leading-normal">
              -Select-
            </div>
          )}
        </span>

        <div className="ml-2 flex items-center justify-center">
          {selectedSuffix && <div className="mr-1">{selectedSuffix}</div>}
          <ChevronSVG className="w-4 h-4 text-[#a9aaab]" />
        </div>

        {isOpen && (
          <div
            className={`absolute top-full botto left-0 right-0 bg-white border border-[#afafaf] rounded-xl overflow-hidden z-10 ${dropdownClassName}`}
          >
            {options.map((option) => (
              <DropdownOption
                key={option.value}
                option={option}
                handleSelectOption={handleSelectOption}
                suffixOptions={suffixOptions}
              />
            ))}
          </div>
        )}
      </div>
      <ErrorMessage text={error} />
    </div>
  );
};

export default Select;
