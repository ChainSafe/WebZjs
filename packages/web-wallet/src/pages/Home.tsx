import React from 'react';

const Home: React.FC = () => {
  return (
    <>
      <h1 className="text-3xl font-semibold mb-4">Zcash Web Wallet</h1>
      <p className="text-center text-gray-500 mb-6 max-w-md">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
        varius enim in eros elementum tristique. Duis cursus, mi quis viverra
        ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.
      </p>
      <button className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 focus:outline-none mb-4">
        Connect MetaMask Snap
      </button>
      <a href="#" className="text-gray-600 hover:underline">
        Already have an account? Restore account
      </a>
    </>
  );
};

export default Home;
