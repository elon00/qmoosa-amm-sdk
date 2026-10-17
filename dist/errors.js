export class SdkError extends Error {
    code;
    constructor(code, message) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.name = "SdkError";
    }
}
export class WalletNotConnectedError extends SdkError {
    constructor() {
        super("SDK_WALLET_NOT_CONNECTED", "Operation requires an explicitly connected WalletAdapter. No wallet adapter was supplied.");
    }
}
export class UnsupportedChainAdapterError extends SdkError {
    constructor(message = "No active ChainTransactionAdapter configured. Live blockchain broadcast is fail-closed by default.") {
        super("SDK_UNSUPPORTED_CHAIN_ADAPTER", message);
    }
}
export class InvalidQuoteError extends SdkError {
    constructor(message) {
        super("SDK_INVALID_QUOTE", message);
    }
}
