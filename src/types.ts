export interface SdkConfig {
  rpcEndpoint?: string;
  defaultSlippageBps?: number; // default 50 bps (0.5%)
  timeoutMs?: number;
}

export interface WalletAdapter {
  getAddress(): Promise<string>;
  signTransaction(txPayload: any): Promise<string>;
}

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  feeBps?: number;
}

export interface QuoteResponse {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  expectedAmountOut: string;
  minAmountOut: string;
  priceImpactPercent: number;
  feeAmount: string;
}

export interface SwapTransactionParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  recipient?: string;
  deadlineMinutes?: number;
}
