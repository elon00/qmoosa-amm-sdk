import {
  SdkConfig,
  WalletAdapter,
  ChainTransactionAdapter,
  TransactionReceipt,
  QuoteRequest,
  QuoteResponse,
  SwapTransactionParams
} from "./types.js";
import {
  WalletNotConnectedError,
  UnsupportedChainAdapterError,
  InvalidQuoteError
} from "./errors.js";

const BPS_DENOMINATOR = 10000n;

/**
 * Standard cross-platform UTF-8 string to hexadecimal encoder.
 */
export function utf8ToHex(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export class QmoosaAmmClient {
  private config: { defaultSlippageBps: number; timeoutMs: number };
  private wallet: WalletAdapter | null = null;
  private chainAdapter: ChainTransactionAdapter | null = null;

  constructor(config?: SdkConfig) {
    this.config = {
      defaultSlippageBps: config?.defaultSlippageBps ?? 50,
      timeoutMs: config?.timeoutMs ?? 15000
    };
    if (config?.chainAdapter) {
      this.chainAdapter = config.chainAdapter;
    }
  }

  public setWallet(wallet: WalletAdapter): void {
    if (!wallet) throw new Error("Wallet adapter cannot be null or undefined");
    this.wallet = wallet;
  }

  public setChainAdapter(adapter: ChainTransactionAdapter): void {
    if (!adapter) throw new Error("Chain adapter cannot be null or undefined");
    this.chainAdapter = adapter;
  }

  public hasWallet(): boolean {
    return this.wallet !== null;
  }

  public hasChainAdapter(): boolean {
    return this.chainAdapter !== null;
  }

  public async getQuote(request: QuoteRequest, currentReserveIn: string, currentReserveOut: string): Promise<QuoteResponse> {
    const amountIn = BigInt(request.amountIn);
    const rIn = BigInt(currentReserveIn);
    const rOut = BigInt(currentReserveOut);
    const feeBps = request.feeBps ?? 30;

    if (amountIn <= 0n) {
      throw new InvalidQuoteError("amountIn must be strictly positive");
    }
    if (rIn <= 0n || rOut <= 0n) {
      throw new InvalidQuoteError("Reserves must be strictly positive");
    }

    const feeNumerator = BPS_DENOMINATOR - BigInt(feeBps);
    const amountInWithFee = amountIn * feeNumerator;
    const numerator = amountInWithFee * rOut;
    const denominator = (rIn * BPS_DENOMINATOR) + amountInWithFee;
    const expectedOut = numerator / denominator;

    const slippageBps = BigInt(this.config.defaultSlippageBps);
    const minOut = (expectedOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;

    const feeAmount = (amountIn * BigInt(feeBps)) / BPS_DENOMINATOR;

    // Price impact percentage = (amountIn / (reserveIn + amountIn)) * 100
    const impactNum = Number(amountIn) * 100;
    const impactDenom = Number(rIn + amountIn);
    const priceImpact = impactDenom > 0 ? Number((impactNum / impactDenom).toFixed(2)) : 0;

    return {
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      expectedAmountOut: expectedOut.toString(),
      minAmountOut: minOut.toString(),
      priceImpactPercent: priceImpact,
      feeAmount: feeAmount.toString()
    };
  }

  public async buildSwapPayload(params: SwapTransactionParams): Promise<any> {
    if (!this.wallet) {
      throw new WalletNotConnectedError();
    }
    const sender = await this.wallet.getAddress();
    const deadline = Date.now() + ((params.deadlineMinutes ?? 10) * 60 * 1000);

    return {
      action: "SWAP_EXACT_IN",
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      minAmountOut: params.minAmountOut,
      sender,
      recipient: params.recipient || sender,
      deadline,
      timestamp: Date.now()
    };
  }

  /**
   * Signs and broadcasts swap transaction to the configured chain adapter.
   * Fails closed with typed error if no chain adapter is configured.
   * Does NOT manufacture fake transaction hashes.
   */
  public async signAndSendSwap(params: SwapTransactionParams): Promise<TransactionReceipt> {
    if (!this.wallet) {
      throw new WalletNotConnectedError();
    }
    if (!this.chainAdapter) {
      throw new UnsupportedChainAdapterError(
        "Cannot broadcast transaction: No ChainTransactionAdapter is configured. Operation failed closed to prevent false production signals."
      );
    }

    const payload = await this.buildSwapPayload(params);
    const signature = await this.wallet.signTransaction(payload);
    
    const signedTx = {
      payload,
      signature
    };

    // Actual broadcast via chain adapter
    return await this.chainAdapter.broadcastTransaction(signedTx);
  }
}
