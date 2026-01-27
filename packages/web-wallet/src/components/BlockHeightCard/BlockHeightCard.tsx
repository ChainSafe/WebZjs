import { FC, useState } from 'react';
import { WebZjsState } from 'src/context/WebzjsContext';

// Zcash mainnet activation block (Sapling activation)
const ZCASH_SAPLING_ACTIVATION = 419200;

export const BlockHeightCard: FC<{
  state: WebZjsState;
  syncedFrom?: string;
  onFullResync?: (customBirthday?: number) => Promise<void>;
}> = ({ state, syncedFrom, onFullResync }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [customBirthday, setCustomBirthday] = useState('');

  const handleResync = () => {
    setShowConfirm(false);
    const birthday = customBirthday ? parseInt(customBirthday, 10) : undefined;
    if (birthday && birthday < ZCASH_SAPLING_ACTIVATION) {
      alert(`Birthday must be at least ${ZCASH_SAPLING_ACTIVATION} (Sapling activation)`);
      return;
    }
    onFullResync?.(birthday);
    setCustomBirthday('');
  };

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
      {onFullResync && !state.syncInProgress && (
        <div className="self-stretch mt-4 pt-4 border-t border-[#e0e0e0]">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-[#595959] text-sm font-medium hover:text-black transition-colors cursor-pointer underline"
            >
              Full Resync
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[#595959] text-xs">
                Clear cached data and resync. Enter a custom birthday block or leave empty to use stored birthday.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-[#595959] text-xs">
                  Birthday Block (min: {ZCASH_SAPLING_ACTIVATION})
                </label>
                <input
                  type="number"
                  value={customBirthday}
                  onChange={(e) => setCustomBirthday(e.target.value)}
                  placeholder="e.g. 2674500"
                  min={ZCASH_SAPLING_ACTIVATION}
                  className="px-2 py-1 border border-[#afafaf] rounded text-sm w-full bg-white text-black"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResync}
                  className="px-3 py-1 bg-[#f5a623] text-white text-sm font-medium rounded hover:bg-[#e09000] transition-colors"
                >
                  Confirm Resync
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setCustomBirthday('');
                  }}
                  className="px-3 py-1 bg-[#e0e0e0] text-[#595959] text-sm font-medium rounded hover:bg-[#d0d0d0] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
