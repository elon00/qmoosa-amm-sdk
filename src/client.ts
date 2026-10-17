import { SdkConfig, WalletAdapter, QuoteRequest, QuoteResponse, SwapTransactionParams } from "./types.js";
import { MockWalletAdapter } from "./wallet.js";

const BPS_DENOMINATOR = 10000n;

export class QmoosaAmmClient {
  private config: Required<SdkConfig>;
  private wallet: WalletAdapter;

  constructor(config?: SdkConfig, wallet?: WalletAdapter) {
    this.config = {
      rpcEndpoint: config?.rpcEndpoint || "http://localhost:8545",
      defaultSlippageBps: config?.defaultSlippageBps ?? 50,
      timeoutMs: config?.timeoutMs ?? 15000
    };
    this.wallet = wallet || new MockWalletAdapter();
  }

  public setWallet(wallet: WalletAdapter): void {
    this.wallet = wallet;
  }

  public async getQuote(request: QuoteRequest, currentReserveIn: string, currentReserveOut: string): Promise<QuoteResponse> {
    const amountIn = BigInt(request.amountIn);
    const rIn = BigInt(currentReserveIn);
    const rOut = BigInt(currentReserveOut);
    const feeBps = request.feeBps ?? 30;

    const feeNumerator = BPS_DENOMINATOR - BigInt(feeBps);
    const amountInWithFee = amountIn * feeNumerator;
    const numerator = amountInWithFee * rOut;
    const denominator = (rIn * BPS_DENOMINATOR) + amountInWithFee;
    const expectedOut = numerator / denominator;

    const slippageBps = BigInt(this.config.defaultSlippageBps);
    const minOut = (expectedOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;

    const feeAmount = (amountIn * BigInt(feeBps)) / BPS_DENOMINATOR;

    // Price impact = (amountIn / (reserveIn + amountIn)) * 100
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

  public async signAndSendSwap(params: SwapTransactionParams): Promise<{ txHash: string; payload: any }> {
    const payload = await this.buildSwapPayload(params);
    const sig = await this.wallet.signTransaction(payload);
    const txHash = `0x${Buffer.from(sig + Date.now()).toString("hex").substring(0, 64)}`;

    return { txHash, payload };
  }
}
