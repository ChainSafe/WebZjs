import React from 'react';

interface PageHeadingProps {
  title: string;
  children?: React.ReactNode;
}

function PageHeading({ title, children }: PageHeadingProps) {
  return (
    <section className="py-6 mb-12 border-b border-gray-700 flex flex-col items-center gap-3">
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-4xl font-medium font-inter leading-normal">
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default PageHeading;
