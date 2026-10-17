import { WalletAdapter } from "../types.js";
/**
 * TESTING UTILITY ONLY
 * Not permitted for production transactions.
 */
export declare class MockWalletAdapter implements WalletAdapter {
    private address;
    constructor(address?: string);
    getAddress(): Promise<string>;
    signTransaction(txPayload: any): Promise<string>;
}
