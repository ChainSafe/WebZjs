import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const HIDE_IN_SECONDS = 2000;

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), HIDE_IN_SECONDS);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="relative inline-block">
      {copied && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2  text-white px-2 py-2 rounded-3xl mb-1 whitespace-nowrap text-sm
      bg-neutral-800 justify-center items-center gap-2.5 inline-flex"
        >
          Address copied!
        </div>
      )}
      <button
        onClick={handleCopy}
        className="text-[#e27625] text-base font-semibold leading-normal cursor-pointer"
      >
        copy
      </button>
    </div>
  );
};

export default CopyButton;
