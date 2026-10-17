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
     * Validates that the RPC URL is strictly bound to a local loopback interface.
     * Remote and public URLs are strictly forbidden.
     */
    validateRpcUrl(urlStr: string): void;
    /**
     * Dispatches a JSON-RPC request to the local Anvil development node.
     */
    callRpc(method: string, params?: any[]): Promise<any>;
    /**
     * Verifies that the connected active RPC provider genuinely operates chain ID 31337.
     */
    verifyNetwork(): Promise<number>;
    /**
     * Verifies that bytecode exists at a specific address on the local chain.
     */
    verifyContractCode(address: string, expectedBytecodePrefix?: string): Promise<string>;
    /**
     * Broadcasts a signed raw transaction to the local Anvil node.
     * Strictly verifies network identity before submission.
     */
    broadcastTransaction(signedTxPayload: any): Promise<TransactionReceipt>;
    /**
     * Polls local Anvil for transaction receipt and parses status and logs.
     */
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    waitForReceipt(txHash: string): Promise<TransactionReceipt>;
}
