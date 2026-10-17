import { privateKeyToAccount } from "viem/accounts";
/**
 * Genuine EVM local test wallet backed by Viem.
 * Generates valid EIP-1559 signed raw transactions for chainId 31337.
 */
export class AnvilTestWallet {
    account;
    constructor(privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") {
        this.account = privateKeyToAccount(privateKey);
    }
    async getAddress() {
        return this.account.address;
    }
    async signTransaction(txPayload) {
        if (txPayload && typeof txPayload === "object" && txPayload.to && txPayload.data) {
            return await this.signRawTransaction(txPayload);
        }
        const payloadStr = typeof txPayload === "string" ? txPayload : JSON.stringify(txPayload);
        return await this.account.signMessage({ message: payloadStr });
    }
    async signRawTransaction(tx) {
        return await this.account.signTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ?? 0n,
            nonce: tx.nonce ?? 0,
            gas: tx.gas ?? 500000n,
            maxFeePerGas: tx.maxFeePerGas ?? 25000000000n,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? 1500000000n,
            chainId: tx.chainId ?? 31337
        });
    }
    async signMessage(message) {
        return await this.account.signMessage({ message });
    }
}
