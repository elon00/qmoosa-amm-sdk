import { WalletAdapter } from "./types.js";

function stringToHex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

export class MockWalletAdapter implements WalletAdapter {
  constructor(private address: string = "0x71C8360f37ab882085718a287EcBE3C3F85Bf12B") {}

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public async signTransaction(txPayload: any): Promise<string> {
    const payloadStr = JSON.stringify(txPayload);
    // Deterministic mock signature using pure cross-platform hex encoding
    return `0x_sig_${stringToHex(payloadStr).substring(0, 64)}`;
  }
}
