import {
  OpenAPI,
  OneClickService,
  QuoteRequest,
} from '@defuse-protocol/one-click-sdk-typescript';

// Initialize the API client
OpenAPI.BASE = 'https://1click.chaindefuser.com';

// Configure JWT token from environment variable (optional)
// If not provided, will incur 0.1% fee on all swaps
const jwtToken = import.meta.env?.VITE_ONE_CLICK_JWT;
if (jwtToken) {
  OpenAPI.TOKEN = jwtToken;
}

export interface QuoteResponse {
  quote?: {
    depositAddress?: string;
    amountInFormatted?: string;
    amountOutFormatted?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Get a quote for cross-chain token swap
 * @param dry - Set to true for quote estimation/testing, false for actual execution
 * @param senderAddress - Address to receive refunds if swap fails
 * @param recipientAddress - Final recipient address for the swapped tokens
 * @param originAsset - Source token identifier (e.g., "nep141:starknet.omft.near" or "nep141:zec.omft.near")
 * @param destinationAsset - Target token identifier
 * @param amount - Amount to swap in token's smallest unit/decimals
 * @returns Quote response with depositAddress and other details
 */
export async function getQuote(
  dry: boolean,
  senderAddress: string,
  recipientAddress: string,
  originAsset: string,
  destinationAsset: string,
  amount: string,
): Promise<QuoteResponse> {
  try {
    const quoteRequest: QuoteRequest = {
      // Testing Mode: set to true for quote estimation/testing, false for actual execution
      // When true, the response will NOT CONTAIN the following fields:
      //  - depositAddress
      //  - timeWhenInactive
      //  - timeEstimate
      //  - deadline
      dry,

      // Swap execution type - determines whether input or output amount is the basis of the swap
      // EXACT_INPUT: input amount is fixed, output varies
      // EXACT_OUTPUT: output amount is fixed, input varies
      swapType: QuoteRequest.swapType.EXACT_INPUT,

      // Maximum acceptable slippage as basis points (100 = 1.00%)
      slippageTolerance: 100,

      // Source token identifier in NEP:contract format
      originAsset,

      // Type of deposit address:
      // - ORIGIN_CHAIN: deposit address on the origin chain
      // - INTENTS: deposit address inside of near intents (the verifier smart contract)
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,

      // Target token identifier in NEP:contract format
      destinationAsset,

      // Amount to swap (in token's smallest unit/decimals)
      // Based on the swapType, this will be the INPUT or OUTPUT token amount
      amount,

      // Address to receive refunds if swap fails
      refundTo: senderAddress,

      // Type of refund address:
      // - ORIGIN_CHAIN: refund to the account on source chain
      // - INTENTS: refund to the account inside intents contract
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,

      // Final recipient address for the swapped tokens. Format should match recipientType.
      recipient: recipientAddress,

      // Type of recipient address:
      // - DESTINATION_CHAIN: send to destination chain
      // - INTENTS: send to account inside intents contract
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,

      // Quote expiration timestamp in ISO format.
      // Swap must execute before this time (currently set to 10 minutes from now)
      deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),

      // Referral identifier for fee sharing/tracking
      referral: 'referral',

      // Maximum time to wait for quote response in milliseconds
      quoteWaitingTimeMs: 3000,
    };

    // Log the request being sent
    console.log('[NearIntents] Request to 1-Click API:', {
      dry,
      swapType: quoteRequest.swapType,
      slippageTolerance: quoteRequest.slippageTolerance,
      originAsset,
      destinationAsset,
      amount,
      refundTo: senderAddress,
      refundType: quoteRequest.refundType,
      recipient: recipientAddress,
      recipientType: quoteRequest.recipientType,
      deadline: quoteRequest.deadline,
      depositType: quoteRequest.depositType,
      referral: quoteRequest.referral,
      quoteWaitingTimeMs: quoteRequest.quoteWaitingTimeMs,
    });

    // Fetch quote from 1-Click API `/quote` endpoint
    const quote = await OneClickService.getQuote(quoteRequest);
    
    // Log the response received
    console.log('[NearIntents] Response from 1-Click API:', {
      quote: quote.quote,
      depositAddress: quote.quote?.depositAddress,
      amountInFormatted: quote.quote?.amountInFormatted,
      amountOutFormatted: quote.quote?.amountOutFormatted,
      fullResponse: quote,
    });
    
    return quote;
  } catch (error) {
    console.error('[NearIntents] Error fetching quote:', error);
    throw error;
  }
}

/**
 * Submit transaction hash to expedite the swap process
 * @param txHash - Transaction hash from the deposit transaction
 * @param depositAddress - Deposit address from the quote
 */
export async function submitTxHash(
  txHash: string,
  depositAddress: string,
): Promise<void> {
  try {
    console.log('[NearIntents] Submitting transaction hash:', {
      txHash,
      depositAddress,
    });

    // Make the API call to submit the transaction hash
    await OneClickService.submitDepositTx({
      txHash,
      depositAddress,
    });

    console.log('[NearIntents] Transaction hash submitted successfully');
  } catch (error) {
    console.error('[NearIntents] Error submitting transaction hash:', error);
    throw error;
  }
}

