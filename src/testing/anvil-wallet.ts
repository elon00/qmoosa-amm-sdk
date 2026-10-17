import { privateKeyToAccount } from "viem/accounts";
import { WalletAdapter, EvmTransactionRequest } from "../types.js";

/**
 * Genuine EVM local test wallet backed by Viem.
 * Generates valid EIP-1559 signed raw transactions for chainId 31337.
 */
export class AnvilTestWallet implements WalletAdapter {
  public readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(
    privateKey: `0x${string}` = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  ) {
    this.account = privateKeyToAccount(privateKey);
  }

  public async getAddress(): Promise<string> {
    return this.account.address;
  }

  public async signTransaction(txPayload: any): Promise<string> {
    if (txPayload && typeof txPayload === "object" && txPayload.to && txPayload.data) {
      return await this.signRawTransaction(txPayload);
    }
    const payloadStr = typeof txPayload === "string" ? txPayload : JSON.stringify(txPayload);
    return await this.account.signMessage({ message: payloadStr });
  }

  public async signRawTransaction(tx: EvmTransactionRequest): Promise<`0x${string}`> {
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

  public async signMessage(message: string): Promise<`0x${string}`> {
    return await this.account.signMessage({ message });
  }
}
