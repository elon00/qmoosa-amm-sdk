import { WalletAdapter } from "../types.js";

/**
 * TESTING UTILITY ONLY
 * Not permitted for production transactions.
 */
export class MockWalletAdapter implements WalletAdapter {
  constructor(private address: string = "0x71C8360f37ab882085718a287EcBE3C3F85Bf12B") {}

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public async signTransaction(txPayload: any): Promise<string> {
    const payloadStr = JSON.stringify(txPayload);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(payloadStr);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return `0x_mock_sig_${hex.substring(0, 48)}`;
  }
}
