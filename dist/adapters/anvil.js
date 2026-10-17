import { SdkError } from "../errors.js";
export class AnvilLocalChainAdapter {
    chainId;
    rpcUrl;
    isLocalSandbox = true;
    pollIntervalMs;
    timeoutMs;
    constructor(config = {}) {
        this.chainId = config.chainId ?? 31337;
        if (this.chainId !== 31337) {
            throw new SdkError("INVALID_LOCAL_CHAIN_ID", `AnvilLocalChainAdapter strictly requires local test chainId 31337. Got ${this.chainId}. Public networks are locked.`);
        }
        this.rpcUrl = config.rpcUrl ?? "http://127.0.0.1:8545";
        this.pollIntervalMs = config.pollIntervalMs ?? 500;
        this.timeoutMs = config.timeoutMs ?? 15000;
    }
    /**
     * Dispatches a JSON-RPC request to the local Anvil development node.
     */
    async callRpc(method, params = []) {
        try {
            const response = await fetch(this.rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method,
                    params
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP_${response.status}_${response.statusText}`);
            }
            const json = await response.json();
            if (json.error) {
                throw new Error(`RPC_ERROR: ${json.error.message || JSON.stringify(json.error)}`);
            }
            return json.result;
        }
        catch (err) {
            throw new SdkError("ANVIL_RPC_UNAVAILABLE", `Failed to reach local Anvil RPC at ${this.rpcUrl}: ${err.message}. Offline sandbox contracts require an active 'anvil' process.`);
        }
    }
    /**
     * Broadcasts a signed raw transaction to the local Anvil node.
     */
    async broadcastTransaction(signedTxPayload) {
        if (typeof signedTxPayload !== "string" || !signedTxPayload.startsWith("0x")) {
            throw new SdkError("INVALID_RAW_TX_PAYLOAD", "Broadcast requires a valid 0x-prefixed hex-encoded signed raw transaction");
        }
        const txHash = await this.callRpc("eth_sendRawTransaction", [signedTxPayload]);
        if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
            throw new SdkError("RPC_TRANSACTION_REJECTED", "Local Anvil node did not return a valid transaction hash");
        }
        const receipt = await this.waitForReceipt(txHash);
        return receipt;
    }
    /**
     * Polls local Anvil for transaction receipt and parses status and logs.
     */
    async getTransactionReceipt(txHash) {
        const rawReceipt = await this.callRpc("eth_getTransactionReceipt", [txHash]);
        if (!rawReceipt)
            return null;
        const status = rawReceipt.status === "0x1" ? "CONFIRMED" : "FAILED";
        const blockNumber = parseInt(rawReceipt.blockNumber, 16);
        return {
            txHash: rawReceipt.transactionHash,
            blockNumber,
            status,
            timestamp: Date.now(),
            explorerUrl: `local://anvil/chain/${this.chainId}/tx/${rawReceipt.transactionHash}`
        };
    }
    async waitForReceipt(txHash) {
        const startTime = Date.now();
        while (Date.now() - startTime < this.timeoutMs) {
            const receipt = await this.getTransactionReceipt(txHash);
            if (receipt)
                return receipt;
            await new Promise((r) => setTimeout(r, this.pollIntervalMs));
        }
        throw new SdkError("TRANSACTION_TIMEOUT", `Timed out waiting for receipt of ${txHash} on local Anvil`);
    }
}
