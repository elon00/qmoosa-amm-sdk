/**
 * TESTING UTILITY ONLY
 * Not permitted for production transactions.
 */
export class MockWalletAdapter {
    address;
    constructor(address = "0x71C8360f37ab882085718a287EcBE3C3F85Bf12B") {
        this.address = address;
    }
    async getAddress() {
        return this.address;
    }
    async signTransaction(txPayload) {
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
