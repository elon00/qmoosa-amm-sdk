export declare class SdkError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare class WalletNotConnectedError extends SdkError {
    constructor();
}
export declare class UnsupportedChainAdapterError extends SdkError {
    constructor(message?: string);
}
export declare class InvalidQuoteError extends SdkError {
    constructor(message: string);
}
