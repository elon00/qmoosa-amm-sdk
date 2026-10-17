import { WalletNotConnectedError, UnsupportedChainAdapterError, InvalidQuoteError } from "./errors.js";
const BPS_DENOMINATOR = 10000n;
/**
 * Standard cross-platform UTF-8 string to hexadecimal encoder.
 */
export function utf8ToHex(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
}
export class QmoosaAmmClient {
    config;
    wallet = null;
    chainAdapter = null;
    constructor(config) {
        const slippage = config?.defaultSlippageBps ?? 50;
        if (slippage < 1 || slippage > 5000) {
            throw new InvalidQuoteError("defaultSlippageBps must be between 1 and 5000 bps (0.01% - 50%)");
        }
        this.config = {
            defaultSlippageBps: slippage,
            timeoutMs: config?.timeoutMs ?? 15000
        };
        if (config?.chainAdapter) {
            this.chainAdapter = config.chainAdapter;
        }
    }
    setWallet(wallet) {
        if (!wallet)
            throw new Error("Wallet adapter cannot be null or undefined");
        this.wallet = wallet;
    }
    setChainAdapter(adapter) {
        if (!adapter)
            throw new Error("Chain adapter cannot be null or undefined");
        this.chainAdapter = adapter;
    }
    hasWallet() {
        return this.wallet !== null;
    }
    hasChainAdapter() {
        return this.chainAdapter !== null;
    }
    async getQuote(request, currentReserveIn, currentReserveOut) {
        const amountIn = BigInt(request.amountIn);
        const rIn = BigInt(currentReserveIn);
        const rOut = BigInt(currentReserveOut);
        const feeBps = request.feeBps ?? 30;
        if (feeBps < 1 || feeBps > 1000) {
            throw new InvalidQuoteError("feeBps must be between 1 and 1000 bps (0.01% - 10%)");
        }
        const slippageBps = BigInt(request.slippageBps ?? this.config.defaultSlippageBps);
        if (slippageBps < 1n || slippageBps > 5000n) {
            throw new InvalidQuoteError("slippageBps must be between 1 and 5000 bps (0.01% - 50%)");
        }
        if (amountIn <= 0n) {
            throw new InvalidQuoteError("amountIn must be strictly positive");
        }
        if (rIn <= 0n || rOut <= 0n) {
            throw new InvalidQuoteError("Reserves must be strictly positive");
        }
        const feeNumerator = BPS_DENOMINATOR - BigInt(feeBps);
        const amountInWithFee = amountIn * feeNumerator;
        const numerator = amountInWithFee * rOut;
        const denominator = (rIn * BPS_DENOMINATOR) + amountInWithFee;
        const expectedOut = numerator / denominator;
        const minOut = (expectedOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
        const feeAmount = (amountIn * BigInt(feeBps)) / BPS_DENOMINATOR;
        // Price impact percentage = (amountIn / (reserveIn + amountIn)) * 100
        const impactNum = Number(amountIn) * 100;
        const impactDenom = Number(rIn + amountIn);
        const priceImpact = impactDenom > 0 ? Number((impactNum / impactDenom).toFixed(2)) : 0;
        return {
            tokenIn: request.tokenIn,
            tokenOut: request.tokenOut,
            amountIn: request.amountIn,
            expectedAmountOut: expectedOut.toString(),
            minAmountOut: minOut.toString(),
            priceImpactPercent: priceImpact,
            feeAmount: feeAmount.toString()
        };
    }
    async buildSwapPayload(params) {
        if (!this.wallet) {
            throw new WalletNotConnectedError();
        }
        const sender = await this.wallet.getAddress();
        const deadline = Date.now() + ((params.deadlineMinutes ?? 10) * 60 * 1000);
        return {
            action: "SWAP_EXACT_IN",
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountIn: params.amountIn,
            minAmountOut: params.minAmountOut,
            sender,
            recipient: params.recipient || sender,
            deadline,
            timestamp: Date.now()
        };
    }
    /**
     * Signs and broadcasts swap transaction to the configured chain adapter.
     * Fails closed with typed error if no chain adapter is configured.
     * Does NOT manufacture fake transaction hashes.
     */
    async signAndSendSwap(params) {
        if (!this.wallet) {
            throw new WalletNotConnectedError();
        }
        if (!this.chainAdapter) {
            throw new UnsupportedChainAdapterError("Cannot broadcast transaction: No ChainTransactionAdapter is configured. Operation failed closed to prevent false production signals.");
        }
        const payload = await this.buildSwapPayload(params);
        const signature = await this.wallet.signTransaction(payload);
        const signedTx = {
            payload,
            signature
        };
        // Actual broadcast via chain adapter
        return await this.chainAdapter.broadcastTransaction(signedTx);
    }
}
