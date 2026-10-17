import { ChainTransactionAdapter, TransactionReceipt } from "../types.js";
import { SdkError } from "../errors.js";

export interface AnvilAdapterConfig {
  rpcUrl?: string; // Default: http://127.0.0.1:8545
  chainId?: number; // Strict default: 31337 (Anvil local node)
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class AnvilLocalChainAdapter implements ChainTransactionAdapter {
  public readonly chainId: number;
  public readonly rpcUrl: string;
  public readonly isLocalSandbox: boolean = true;
  private readonly pollIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(config: AnvilAdapterConfig = {}) {
    this.chainId = config.chainId ?? 31337;
    if (this.chainId !== 31337) {
      throw new SdkError(
        "INVALID_LOCAL_CHAIN_ID",
        `AnvilLocalChainAdapter strictly requires local test chainId 31337. Got ${this.chainId}. Public networks are locked.`
      );
    }
    const targetUrl = config.rpcUrl ?? "http://127.0.0.1:8545";
    this.validateRpcUrl(targetUrl);
    this.rpcUrl = targetUrl;
    this.pollIntervalMs = config.pollIntervalMs ?? 500;
    this.timeoutMs = config.timeoutMs ?? 15000;
  }

  /**
   * Validates that the RPC URL is strictly bound to a local loopback interface.
   * Remote and public URLs are strictly forbidden.
   */
  public validateRpcUrl(urlStr: string): void {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      const isLoopback = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
      if (!isLoopback) {
        throw new SdkError(
          "NON_LOOPBACK_RPC_FORBIDDEN",
          `AnvilLocalChainAdapter strictly forbids non-loopback endpoint: ${urlStr}. Public networks and remote endpoints are locked.`
        );
      }
    } catch (err: any) {
      if (err instanceof SdkError) throw err;
      throw new SdkError("INVALID_RPC_URL", `Malformed RPC URL: ${urlStr}`);
    }
  }

  /**
   * Dispatches a JSON-RPC request to the local Anvil development node.
   */
  public async callRpc(method: string, params: any[] = []): Promise<any> {
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
    } catch (err: any) {
      if (err instanceof SdkError) throw err;
      throw new SdkError(
        "ANVIL_RPC_UNAVAILABLE",
        `Failed to reach local Anvil RPC at ${this.rpcUrl}: ${err.message}. Offline sandbox contracts require an active 'anvil' process.`
      );
    }
  }

  /**
   * Verifies that the connected active RPC provider genuinely operates chain ID 31337.
   */
  public async verifyNetwork(): Promise<number> {
    const rawChainId = await this.callRpc("eth_chainId");
    const remoteChainId = typeof rawChainId === "string" ? parseInt(rawChainId, 16) : Number(rawChainId);
    if (remoteChainId !== 31337) {
      throw new SdkError(
        "CHAIN_ID_MISMATCH",
        `Connected RPC node returned chainId ${remoteChainId}, expected 31337. Operation blocked to prevent wrong-network broadcast.`
      );
    }
    return remoteChainId;
  }

  /**
   * Verifies that bytecode exists at a specific address on the local chain.
   */
  public async verifyContractCode(address: string, expectedBytecodePrefix?: string): Promise<string> {
    if (!address || typeof address !== "string" || !address.startsWith("0x")) {
      throw new SdkError("INVALID_ADDRESS", `Invalid address format: ${address}`);
    }
    const code = await this.callRpc("eth_getCode", [address, "latest"]);
    if (!code || code === "0x" || code === "0x0") {
      throw new SdkError("CONTRACT_NOT_DEPLOYED", `No contract code deployed at address ${address}`);
    }
    if (expectedBytecodePrefix && !code.toLowerCase().startsWith(expectedBytecodePrefix.toLowerCase())) {
      throw new SdkError("BYTECODE_MISMATCH", `Bytecode at ${address} does not match expected prefix`);
    }
    return code;
  }

  /**
   * Broadcasts a signed raw transaction to the local Anvil node.
   * Strictly verifies network identity before submission.
   */
  public async broadcastTransaction(signedTxPayload: any): Promise<TransactionReceipt> {
    // 1. Extract and syntactically validate raw transaction hex
    let rawTx: string;
    if (typeof signedTxPayload === "string") {
      rawTx = signedTxPayload;
    } else if (signedTxPayload && typeof signedTxPayload.rawTransaction === "string") {
      rawTx = signedTxPayload.rawTransaction;
    } else if (signedTxPayload && typeof signedTxPayload.signature === "string" && signedTxPayload.signature.startsWith("0x")) {
      rawTx = signedTxPayload.signature;
    } else {
      throw new SdkError(
        "INVALID_RAW_TX_PAYLOAD",
        "Broadcast requires a valid 0x-prefixed hex-encoded signed raw transaction"
      );
    }

    if (!rawTx.startsWith("0x") || rawTx.length < 10) {
      throw new SdkError(
        "INVALID_RAW_TX_PAYLOAD",
        "Broadcast requires a valid 0x-prefixed hex-encoded signed raw transaction"
      );
    }

    // 2. Pre-broadcast active network verification
    await this.verifyNetwork();

    const txHash = await this.callRpc("eth_sendRawTransaction", [rawTx]);
    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
      throw new SdkError("RPC_TRANSACTION_REJECTED", "Local Anvil node did not return a valid transaction hash");
    }

    const receipt = await this.waitForReceipt(txHash);
    return receipt;
  }

  /**
   * Polls local Anvil for transaction receipt and parses status and logs.
   */
  public async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    const rawReceipt = await this.callRpc("eth_getTransactionReceipt", [txHash]);
    if (!rawReceipt) return null;

    const status: "CONFIRMED" | "FAILED" = rawReceipt.status === "0x1" ? "CONFIRMED" : "FAILED";
    const blockNumber = parseInt(rawReceipt.blockNumber, 16);
    const gasUsed = rawReceipt.gasUsed ? BigInt(rawReceipt.gasUsed).toString() : undefined;

    return {
      txHash: rawReceipt.transactionHash,
      blockNumber,
      status,
      gasUsed,
      timestamp: Date.now(),
      explorerUrl: `local://anvil/chain/${this.chainId}/tx/${rawReceipt.transactionHash}`
    };
  }

  public async waitForReceipt(txHash: string): Promise<TransactionReceipt> {
    const startTime = Date.now();
    while (Date.now() - startTime < this.timeoutMs) {
      const receipt = await this.getTransactionReceipt(txHash);
      if (receipt) return receipt;
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
    throw new SdkError("TRANSACTION_TIMEOUT", `Timed out waiting for receipt of ${txHash} on local Anvil`);
  }
}
