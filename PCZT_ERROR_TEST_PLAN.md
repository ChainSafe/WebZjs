# PCZT Creation Error - Reproduction Test Plan

## Changes Made
✅ **Error Handling Improvements Applied**
- `error.rs`: Changed `PcztCreate` to include error details: `PcztCreate(String)`
- `wallet.rs:569`: Updated `pczt_shield` to log and capture error details
- `wallet.rs:657-660`: Updated `pczt_create` to log and capture error details
- **Build Status**: ✅ Compiled successfully

## Error Will Now Show Details
Previously: `"Failed to create PCZT"` (no details)
Now: `"Failed to create PCZT: <actual error from librustzcash>"` (includes root cause)

## Testing Scenarios

### Scenario 1: Transaction with Memo (PRIORITY - Never Tested)

**Setup:**
1. Open http://localhost:3000
2. Connect MetaMask snap
3. Ensure wallet is fully synced
4. Attempt to send ZEC with a memo

**Steps:**
```
To: <any_valid_zcash_address>
Amount: 0.001 ZEC
Memo: "Test memo for NU6.1"
```

**Expected Behaviors:**
- ✅ **Success**: Transaction creates PCZT successfully
- ❌ **Failure**: Console shows detailed error message

**Check Console For:**
- `pczt_create: create_pczt_from_proposal failed: <details>`
- Look for: memo-related errors, encoding issues, or validation failures

### Scenario 2: Shielding Operation

**Setup:**
1. Ensure wallet has transparent balance
2. Attempt to shield funds to Sapling/Orchard

**Steps:**
```
Shield Amount: <available_transparent_balance>
Target Pool: Orchard
```

**Check Console For:**
- `pczt_shield: create_pczt_from_proposal failed: <details>`
- Look for: anchor mismatch, tree state issues

### Scenario 3: Multiple Small Transactions (Note Fragmentation)

**Hypothesis:** Wallet with many small notes might trigger input selection issues

**Setup:**
1. Create multiple small notes by receiving several small transactions
2. Attempt to spend more than any single note
3. Forces wallet to combine notes

**Check For:**
- Input selection failures
- "insufficient balance" despite having enough total

### Scenario 4: Transaction After Partial Sync

**Hypothesis:** Wallet not fully synced might have stale anchor

**Setup:**
1. Stop sync before completion (close browser mid-sync)
2. Reload and attempt transaction without re-syncing
3. See if pre-sync validation catches it or if PCZT creation fails

**Check For:**
- "Wallet not fully synced" warning triggers auto-sync (line 598-605)
- OR anchor mismatch in PCZT creation

### Scenario 5: Pre-NU6.1 Notes (If Available)

**Hypothesis:** Notes received before block 3,146,400 might have compatibility issues

**Check:**
- Look at transaction history for any notes from before Jan 2026
- Try to spend these specific notes
- Check if serialization format causes issues

## What to Look For in Console

With our improved error handling, you should now see:

```javascript
// Console output will show:
ERROR pczt_create: create_pczt_from_proposal failed: <ACTUAL ERROR>

// Examples of what might appear:
// - "anchor not found in commitment tree"
// - "insufficient balance after selecting inputs"
// - "note value exceeds maximum"
// - "invalid memo encoding"
// - "transaction would create negative balance"
```

## Debugging Steps

1. **Open Browser Console** (F12) before any transaction attempt
2. **Enable verbose logging** if available
3. **Copy full error message** including the new detailed part
4. **Note wallet state**:
   - Current block height
   - Number of notes
   - Total balance
   - Last sync time

## Expected Results

If the forum user's error is reproducible:
- You'll see the SAME detailed error message
- Can then determine if it's:
  - ✅ A memo-specific issue
  - ✅ A tree/anchor sync issue
  - ✅ A NU6.1 compatibility issue
  - ✅ An input selection bug

If NO error occurs:
- The issue might be environment-specific
- Or related to a specific wallet state we haven't replicated
- Request more details from the forum user about their setup

## Next Steps After Testing

1. **If error reproduced**: Analyze the detailed error message to identify fix
2. **If error NOT reproduced**: Deploy this improved error logging to production so users can report detailed errors
3. **Check forum**: Ask user to update snap and provide new detailed error message

## Quick Commands

```bash
# Start dev servers
cd /home/skynet/ztest/WebZjs && yarn dev

# Check build status
cd /home/skynet/ztest/WebZjs && just build

# View console logs in browser
# F12 → Console tab → Look for "pczt_create" or "pczt_shield" errors
```
