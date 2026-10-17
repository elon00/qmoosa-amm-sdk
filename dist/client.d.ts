import { SdkConfig, WalletAdapter, ChainTransactionAdapter, TransactionReceipt, QuoteRequest, QuoteResponse, SwapTransactionParams, EvmTransactionRequest } from "./types.js";
export declare const ROUTER_SWAP_ABI: readonly [{
    readonly type: "function";
    readonly name: "swapExactTokensForTokens";
    readonly inputs: readonly [{
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly name: "amountOutMin";
        readonly type: "uint256";
    }, {
        readonly name: "path";
        readonly type: "address[]";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "deadline";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "amounts";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "nonpayable";
}];
/**
 * Standard cross-platform UTF-8 string to hexadecimal encoder.
 */
export declare function utf8ToHex(str: string): string;
export declare class QmoosaAmmClient {
    private config;
    private wallet;
    private chainAdapter;
    constructor(config?: SdkConfig, wallet?: WalletAdapter);
    setWallet(wallet: WalletAdapter): void;
    setChainAdapter(adapter: ChainTransactionAdapter): void;
    hasWallet(): boolean;
    hasChainAdapter(): boolean;
    getQuote(request: QuoteRequest, currentReserveIn: string, currentReserveOut: string): Promise<QuoteResponse>;
    buildSwapPayload(params: SwapTransactionParams): Promise<any>;
    buildEvmSwapTransaction(params: SwapTransactionParams & {
        routerAddress: string;
        nonce?: number;
    }): Promise<EvmTransactionRequest>;
    /**
     * Signs and broadcasts swap transaction to the configured chain adapter.
     * Fails closed with typed error if no chain adapter is configured.
     * Does NOT manufacture fake transaction hashes.
     */
    signAndSendSwap(params: SwapTransactionParams): Promise<TransactionReceipt>;
}
