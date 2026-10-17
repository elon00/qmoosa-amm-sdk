import { SdkError, WalletNotConnectedError, UnsupportedChainAdapterError, InvalidQuoteError } from "./errors.js";
import { encodeFunctionData } from "viem";
export const ROUTER_SWAP_ABI = [
    {
        type: "function",
        name: "swapExactTokensForTokens",
        inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" }
        ],
        outputs: [
            { name: "amounts", type: "uint256[]" }
        ],
        stateMutability: "nonpayable"
    }
];
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
    constructor(config, wallet) {
        const slippage = config?.defaultSlippageBps ?? 50;
        if (typeof slippage !== "number" ||
            !Number.isFinite(slippage) ||
            !Number.isInteger(slippage) ||
            slippage < 1 ||
            slippage > 5000) {
            throw new InvalidQuoteError("defaultSlippageBps must be a finite integer between 1 and 5000 bps (0.01% - 50%)");
        }
        const timeout = config?.timeoutMs ?? 15000;
        if (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0) {
            throw new SdkError("SDK_INVALID_CONFIG", "timeoutMs must be a positive finite number");
        }
        this.config = {
            defaultSlippageBps: slippage,
            timeoutMs: timeout
        };
        if (config?.chainAdapter) {
            this.chainAdapter = config.chainAdapter;
        }
        if (wallet) {
            this.setWallet(wallet);
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
        if (!request || typeof request !== "object") {
            throw new InvalidQuoteError("QuoteRequest must be an object");
        }
        if (!request.tokenIn || typeof request.tokenIn !== "string" || request.tokenIn.trim().length === 0) {
            throw new InvalidQuoteError("tokenIn must be a non-empty string");
        }
        if (!request.tokenOut || typeof request.tokenOut !== "string" || request.tokenOut.trim().length === 0) {
            throw new InvalidQuoteError("tokenOut must be a non-empty string");
        }
        if (typeof request.amountIn !== "string" || !/^\d+$/.test(request.amountIn.trim())) {
            throw new InvalidQuoteError("amountIn must be a positive integer base unit string without decimals or exponents");
        }
        if (typeof currentReserveIn !== "string" || !/^\d+$/.test(currentReserveIn.trim())) {
            throw new InvalidQuoteError("currentReserveIn must be a positive integer base unit string");
        }
        if (typeof currentReserveOut !== "string" || !/^\d+$/.test(currentReserveOut.trim())) {
            throw new InvalidQuoteError("currentReserveOut must be a positive integer base unit string");
        }
        const amountIn = BigInt(request.amountIn.trim());
        const rIn = BigInt(currentReserveIn.trim());
        const rOut = BigInt(currentReserveOut.trim());
        if (amountIn <= 0n) {
            throw new InvalidQuoteError("amountIn must be strictly positive");
        }
        if (rIn <= 0n || rOut <= 0n) {
            throw new InvalidQuoteError("Reserves must be strictly positive");
        }
        const feeBps = request.feeBps ?? 30;
        if (typeof feeBps !== "number" ||
            !Number.isFinite(feeBps) ||
            !Number.isInteger(feeBps) ||
            feeBps < 1 ||
            feeBps > 1000) {
            throw new InvalidQuoteError("feeBps must be a finite integer between 1 and 1000 bps (0.01% - 10%)");
        }
        const rawSlippage = request.slippageBps ?? this.config.defaultSlippageBps;
        if (typeof rawSlippage !== "number" ||
            !Number.isFinite(rawSlippage) ||
            !Number.isInteger(rawSlippage) ||
            rawSlippage < 1 ||
            rawSlippage > 5000) {
            throw new InvalidQuoteError("slippageBps must be a finite integer between 1 and 5000 bps (0.01% - 50%)");
        }
        const slippageBps = BigInt(rawSlippage);
        const feeNumerator = BPS_DENOMINATOR - BigInt(feeBps);
        const amountInWithFee = amountIn * feeNumerator;
        const numerator = amountInWithFee * rOut;
        const denominator = (rIn * BPS_DENOMINATOR) + amountInWithFee;
        const expectedOut = numerator / denominator;
        const minOut = (expectedOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
        const feeAmount = (amountIn * BigInt(feeBps)) / BPS_DENOMINATOR;
        // Price impact calculation using exact integer arithmetic (scaled to 10000 basis points)
        // priceImpactBps = (amountIn * 10000) / (rIn + amountIn)
        const priceImpactBps = (amountIn * 10000n) / (rIn + amountIn);
        const priceImpactPercent = Number(priceImpactBps) / 100;
        return {
            tokenIn: request.tokenIn.trim(),
            tokenOut: request.tokenOut.trim(),
            amountIn: amountIn.toString(),
            expectedAmountOut: expectedOut.toString(),
            minAmountOut: minOut.toString(),
            priceImpactPercent,
            feeAmount: feeAmount.toString()
        };
    }
    async buildSwapPayload(params) {
        if (!this.wallet) {
            throw new WalletNotConnectedError();
        }
        if (!params || typeof params !== "object") {
            throw new InvalidQuoteError("SwapTransactionParams must be an object");
        }
        if (!params.tokenIn || !params.tokenOut) {
            throw new InvalidQuoteError("tokenIn and tokenOut must be specified");
        }
        if (typeof params.amountIn !== "string" || !/^\d+$/.test(params.amountIn.trim()) || BigInt(params.amountIn.trim()) <= 0n) {
            throw new InvalidQuoteError("amountIn must be a positive integer base unit string");
        }
        if (typeof params.minAmountOut !== "string" || !/^\d+$/.test(params.minAmountOut.trim())) {
            throw new InvalidQuoteError("minAmountOut must be a non-negative integer base unit string");
        }
        const sender = await this.wallet.getAddress();
        const deadline = Date.now() + ((params.deadlineMinutes ?? 10) * 60 * 1000);
        return {
            action: "SWAP_EXACT_IN",
            tokenIn: params.tokenIn.trim(),
            tokenOut: params.tokenOut.trim(),
            amountIn: params.amountIn.trim(),
            minAmountOut: params.minAmountOut.trim(),
            sender,
            recipient: params.recipient || sender,
            deadline,
            timestamp: Date.now()
        };
    }
    async buildEvmSwapTransaction(params) {
        if (!this.wallet) {
            throw new WalletNotConnectedError();
        }
        if (!params.routerAddress || !params.routerAddress.startsWith("0x")) {
            throw new InvalidQuoteError("routerAddress must be a valid 0x address");
        }
        if (!params.tokenIn || !params.tokenOut) {
            throw new InvalidQuoteError("tokenIn and tokenOut must be specified");
        }
        if (typeof params.amountIn !== "string" || !/^\d+$/.test(params.amountIn.trim()) || BigInt(params.amountIn.trim()) <= 0n) {
            throw new InvalidQuoteError("amountIn must be a positive integer base unit string");
        }
        if (typeof params.minAmountOut !== "string" || !/^\d+$/.test(params.minAmountOut.trim())) {
            throw new InvalidQuoteError("minAmountOut must be a non-negative integer base unit string");
        }
        const sender = (await this.wallet.getAddress());
        const to = ((params.recipient && params.recipient.startsWith("0x")) ? params.recipient : sender);
        const tokenIn = params.tokenIn.trim();
        const tokenOut = params.tokenOut.trim();
        const amountIn = BigInt(params.amountIn.trim());
        const minAmountOut = BigInt(params.minAmountOut.trim());
        const deadline = BigInt(Math.floor(Date.now() / 1000) + ((params.deadlineMinutes ?? 10) * 60));
        const data = encodeFunctionData({
            abi: ROUTER_SWAP_ABI,
            functionName: "swapExactTokensForTokens",
            args: [amountIn, minAmountOut, [tokenIn, tokenOut], to, deadline]
        });
        return {
            to: params.routerAddress,
            data,
            value: 0n,
            nonce: params.nonce,
            gas: 500000n,
            chainId: 31337
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
        // If routerAddress is provided, execute genuine on-chain EVM transaction
        if (params.routerAddress && params.routerAddress.startsWith("0x")) {
            const evmTx = await this.buildEvmSwapTransaction({
                ...params,
                routerAddress: params.routerAddress
            });
            const signedRawTx = await this.wallet.signTransaction(evmTx);
            return await this.chainAdapter.broadcastTransaction(signedRawTx);
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
