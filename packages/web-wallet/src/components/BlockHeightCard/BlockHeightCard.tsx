import { FC } from 'react';
import { WebZjsState } from 'src/context/WebzjsContext';

export const BlockHeightCard: FC<{
  state: WebZjsState;
  syncedFrom?: string;
}> = ({ state, syncedFrom }) => {
  return (
    <div className="grow shrink min-w-[317px] basis-0 p-6 bg-white rounded-xl border border-[#afafaf] flex-col justify-start items-start gap-2 inline-flex">
      {state.syncInProgress ? (
        <div className="self-stretch flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-[#595959]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-[#595959] text-sm font-semibold font-inter leading-[21px]">
            Sync in progress...
          </span>
        </div>
      ) : null}
      <div className="self-stretch text-[#595959] text-sm font-semibold font-inter leading-[21px]">
        Chain Height
      </div>
      <div className="self-stretch justify-start items-center gap-2 inline-flex">
        <div className="text-black text-2xl font-medium font-['Inter'] leading-9">
          {state.chainHeight ? '' + state.chainHeight : '?'}
        </div>
      </div>
      <div className="self-stretch text-[#595959] text-sm font-semibold font-inter leading-[21px]">
        Synced Height
      </div>
      <div className="self-stretch justify-start items-center gap-2 inline-flex">
        <div className="text-black text-2xl font-medium font-['Inter'] leading-9">
          {state.summary?.fully_scanned_height
            ? state.summary?.fully_scanned_height
            : '?'}
        </div>
      </div>
      {syncedFrom && (
        <>
          <div className="self-stretch text-[#595959] text-sm font-semibold font-inter leading-[21px]">
            Sync Start Block
          </div>
          <div className="self-stretch justify-start items-center gap-2 inline-flex">
            <div className="text-black text-2xl font-medium font-['Inter'] leading-9">
              {syncedFrom}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
