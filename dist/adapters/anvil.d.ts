import { ChainTransactionAdapter, TransactionReceipt } from "../types.js";
export interface AnvilAdapterConfig {
    rpcUrl?: string;
    chainId?: number;
    pollIntervalMs?: number;
    timeoutMs?: number;
}
export declare class AnvilLocalChainAdapter implements ChainTransactionAdapter {
    readonly chainId: number;
    readonly rpcUrl: string;
    readonly isLocalSandbox: boolean;
    private readonly pollIntervalMs;
    private readonly timeoutMs;
    constructor(config?: AnvilAdapterConfig);
    /**
     * Dispatches a JSON-RPC request to the local Anvil development node.
     */
    callRpc(method: string, params?: any[]): Promise<any>;
    /**
     * Broadcasts a signed raw transaction to the local Anvil node.
     */
    broadcastTransaction(signedTxPayload: any): Promise<TransactionReceipt>;
    /**
     * Polls local Anvil for transaction receipt and parses status and logs.
     */
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    waitForReceipt(txHash: string): Promise<TransactionReceipt>;
}
