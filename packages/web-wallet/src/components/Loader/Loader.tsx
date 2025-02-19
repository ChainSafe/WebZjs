import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className={`flex justify-center items-center`}>
      <div
        className={`w-8 h-8 border-4 border-t-transparent border-gray-300 rounded-full animate-spin`}
      />
    </div>
  );
};

export default Loader;
