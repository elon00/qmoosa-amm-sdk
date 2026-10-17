export interface SdkConfig {
    defaultSlippageBps?: number;
    timeoutMs?: number;
    chainAdapter?: ChainTransactionAdapter;
}
export interface EvmTransactionRequest {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
    nonce?: number;
    gas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    chainId?: number;
}
export interface WalletAdapter {
    getAddress(): Promise<string>;
    signTransaction(txPayload: any): Promise<string>;
    signRawTransaction?(tx: EvmTransactionRequest): Promise<`0x${string}`>;
}
export interface TransactionReceipt {
    txHash: string;
    blockNumber: number;
    status: "CONFIRMED" | "FAILED";
    gasUsed?: string;
    timestamp: number;
    explorerUrl?: string;
}
export interface ChainTransactionAdapter {
    broadcastTransaction(signedTxPayload: any): Promise<TransactionReceipt>;
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    verifyNetwork?(): Promise<number>;
    verifyContractCode?(address: string, expectedBytecodePrefix?: string): Promise<string>;
}
export interface QuoteRequest {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    feeBps?: number;
    slippageBps?: number;
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
    routerAddress?: string;
}
