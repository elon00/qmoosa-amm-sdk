import { SdkConfig, WalletAdapter, ChainTransactionAdapter, TransactionReceipt, QuoteRequest, QuoteResponse, SwapTransactionParams } from "./types.js";
/**
 * Standard cross-platform UTF-8 string to hexadecimal encoder.
 */
export declare function utf8ToHex(str: string): string;
export declare class QmoosaAmmClient {
    private config;
    private wallet;
    private chainAdapter;
    constructor(config?: SdkConfig);
    setWallet(wallet: WalletAdapter): void;
    setChainAdapter(adapter: ChainTransactionAdapter): void;
    hasWallet(): boolean;
    hasChainAdapter(): boolean;
    getQuote(request: QuoteRequest, currentReserveIn: string, currentReserveOut: string): Promise<QuoteResponse>;
    buildSwapPayload(params: SwapTransactionParams): Promise<any>;
    /**
     * Signs and broadcasts swap transaction to the configured chain adapter.
     * Fails closed with typed error if no chain adapter is configured.
     * Does NOT manufacture fake transaction hashes.
     */
    signAndSendSwap(params: SwapTransactionParams): Promise<TransactionReceipt>;
}
