import React, { useState } from 'react';

const PAGE_SIZE = 6;

interface Column {
  label: string;
  key: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: Array<Record<string, any>>;
  pageSize?: number;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  pageSize = PAGE_SIZE,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Calculate total pages
  const totalPages = Math.ceil(data.length / pageSize);

  // Determine which slice of data to display on this page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = data.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="max-w-[1000px] w-full bg-neutral-50 rounded-3xl border border-[#afafaf] flex flex-col justify-start items-start overflow-hidden">
      {/* Main columns container */}
      <div className="self-stretch inline-flex justify-start items-start overflow-hidden">
        {columns.map((column) => (
          <div
            key={column.key}
            className="grow shrink basis-0 self-stretch flex flex-col items-start"
          >
            {/* Header */}
            <div className="self-stretch px-6 py-4 bg-[#eeeeee] border-b border-[#afafaf] flex justify-start items-center">
              <div className="text-black text-sm font-semibold font-['Roboto'] leading-[21px]">
                {column.label}
              </div>
            </div>

            {/* Rows for current page only */}
            {pageData.map((row, index) => (
              <div
                key={index}
                className="self-stretch h-[60px] px-6 py-[18px] border-b border-[#afafaf] flex flex-col justify-center items-start gap-1"
              >
                <div className="self-stretch h-6 text-black text-sm font-normal font-['Roboto'] leading-[21px]">
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="self-stretch h-16 py-3 flex flex-col justify-start items-start">
        <div className="self-stretch flex justify-between items-center px-4">
          {/* Page number buttons */}
          <div className="flex gap-1 items-center m-auto">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-[30px] h-[30px] p-1.5 rounded-md border flex items-center justify-center text-sm font-normal font-['Roboto'] leading-[21px]
                    ${
                      isActive
                        ? 'border-black text-black'
                        : 'border-transparent text-black'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Table;
