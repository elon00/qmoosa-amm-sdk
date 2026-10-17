export interface SdkConfig {
    defaultSlippageBps?: number;
    timeoutMs?: number;
    chainAdapter?: ChainTransactionAdapter;
}
export interface WalletAdapter {
    getAddress(): Promise<string>;
    signTransaction(txPayload: any): Promise<string>;
}
export interface TransactionReceipt {
    txHash: string;
    blockNumber: number;
    status: "CONFIRMED" | "FAILED";
    timestamp: number;
    explorerUrl?: string;
}
export interface ChainTransactionAdapter {
    broadcastTransaction(signedTxPayload: any): Promise<TransactionReceipt>;
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
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
