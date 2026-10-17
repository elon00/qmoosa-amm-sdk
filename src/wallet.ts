import { WalletAdapter } from "./types.js";

export class MockWalletAdapter implements WalletAdapter {
  constructor(private address: string = "0x71C8360f37ab882085718a287EcBE3C3F85Bf12B") {}

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public async signTransaction(txPayload: any): Promise<string> {
    const payloadStr = JSON.stringify(txPayload);
    // Deterministic mock signature for local simulation
    return `0x_sig_${Buffer.from(payloadStr).toString("hex").substring(0, 64)}`;
  }
}
