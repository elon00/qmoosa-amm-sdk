import { privateKeyToAccount } from "viem/accounts";
import { WalletAdapter, EvmTransactionRequest } from "../types.js";
/**
 * Genuine EVM local test wallet backed by Viem.
 * Generates valid EIP-1559 signed raw transactions for chainId 31337.
 */
export declare class AnvilTestWallet implements WalletAdapter {
    readonly account: ReturnType<typeof privateKeyToAccount>;
    constructor(privateKey?: `0x${string}`);
    getAddress(): Promise<string>;
    signTransaction(txPayload: any): Promise<string>;
    signRawTransaction(tx: EvmTransactionRequest): Promise<`0x${string}`>;
    signMessage(message: string): Promise<`0x${string}`>;
}
