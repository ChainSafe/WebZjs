import React, { useEffect, useRef, useState } from 'react';
import { ChevronSVG } from '../../assets';
import ErrorMessage from '../ErrorMessage/ErrorMessage';

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
  dropdownClassName?: string;
  defaultOption?: Option;
  handleChange: (option: string) => void;
  suffix?: string | React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  defaultOption,
  containerClassName = '',
  labelClassName = '',
  dropdownClassName = '',
  suffix = '',
  handleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(
    defaultOption || null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <span className="flex-grow bg-transparent focus:outline-none text-[#0e0e0e] text-base font-semibold font-inter">
          {selected ? (
            selected.label
          ) : (
            <div className="text-[#afafaf] text-base font-normal font-['Roboto'] leading-normal">
              -Select-
            </div>
          )}
        </span>

        <div className="ml-2 flex items-center justify-center">
          {suffix && <div className="mr-1">{suffix}</div>}
          <ChevronSVG className="w-4 h-4 text-[#a9aaab]" />
        </div>

        {isOpen && (
          <div
            className={`absolute top-full botto left-0 right-0 bg-white border border-[#afafaf] rounded-xl overflow-hidden z-10 ${dropdownClassName}`}
          >
            {options.map((option) => (
              <div
                key={option.value}
                className="px-6 mr-1 py-3 hover:bg-neutral-100 cursor-pointer flex justify-between items-center"
                onClick={() => handleSelectOption(option)}
              >
                <span className="text-[#0e0e0e] text-base font-normal font-['Roboto']">
                  {option.label}
                </span>
                {suffix && <div className="ml-2">{suffix}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <ErrorMessage text={error} />
    </div>
  );
};

export default Select;
