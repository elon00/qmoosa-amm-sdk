import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as RootExport from "../dist/index.js";
import {
  QmoosaAmmClient,
  WalletNotConnectedError,
  UnsupportedChainAdapterError,
  InvalidQuoteError,
  AnvilLocalChainAdapter,
  utf8ToHex
} from "../dist/index.js";
import { MockWalletAdapter, AnvilTestWallet } from "../dist/testing/index.js";

describe("AMM SDK Client & Fail-Closed Boundaries", () => {
  const rA = "10000000000000000000000"; // 10,000 Token A
  const rB = "20000000000000000000000"; // 20,000 Token B

  test("Root package exports only production symbols, isolating MockWalletAdapter to testing module", () => {
    assert.equal("MockWalletAdapter" in RootExport, false, "MockWalletAdapter must NOT be exported in root bundle");
    assert.ok(MockWalletAdapter, "MockWalletAdapter must be accessible via testing submodule");
  });

  test("Constructor validates defaultSlippageBps: rejects non-finite, fractional, or out-of-range values", () => {
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: 0 }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: 5001 }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: NaN }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: Infinity }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: -Infinity }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: 50.5 }), /SDK_INVALID_QUOTE/);
    assert.throws(() => new QmoosaAmmClient({ defaultSlippageBps: "50" }), /SDK_INVALID_QUOTE/);

    const validClient = new QmoosaAmmClient({ defaultSlippageBps: 100 });
    assert.ok(validClient);
  });

  test("UTF-8 hex encoding accurately encodes ASCII and Unicode strings", () => {
    assert.equal(utf8ToHex("QMOOSA"), "514d4f4f5341");
    assert.equal(utf8ToHex("hello"), "68656c6c6f");
    assert.ok(utf8ToHex("नमस्ते").length > 0);
  });

  test("Quote estimation calculates correct expected output and minimum received", async () => {
    const client = new QmoosaAmmClient({ defaultSlippageBps: 50 });
    const quote = await client.getQuote({
      tokenIn: "USDC",
      tokenOut: "ETH",
      amountIn: "1000000000000000000"
    }, rA, rB);

    assert.ok(BigInt(quote.expectedAmountOut) > 0n);
    assert.ok(BigInt(quote.minAmountOut) < BigInt(quote.expectedAmountOut));
    assert.equal(quote.priceImpactPercent >= 0, true);
  });

  test("Strict finite-integer validation for feeBps and slippageBps in getQuote", async () => {
    const client = new QmoosaAmmClient();

    // Out of range or non-finite feeBps
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", feeBps: 0 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", feeBps: 1001 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", feeBps: NaN }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", feeBps: Infinity }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", feeBps: 30.5 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );

    // Out of range or non-finite slippageBps
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", slippageBps: 0 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", slippageBps: 5001 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", slippageBps: NaN }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", slippageBps: Infinity }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000", slippageBps: 50.25 }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
  });

  test("Malformed or non-integer financial amounts in getQuote are strictly rejected", async () => {
    const client = new QmoosaAmmClient();

    // Scientific notation
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1e3" }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    // Negative values
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "-100" }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    // Decimals in base units
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "100.5" }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    // Zero value
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "0" }, rA, rB),
      /SDK_INVALID_QUOTE/
    );
    // Alphabetic characters
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "abc" }, rA, rB),
      /SDK_INVALID_QUOTE/
    );

    // Malformed reserves
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000" }, "0", rB),
      /SDK_INVALID_QUOTE/
    );
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "1000" }, rA, "1e18"),
      /SDK_INVALID_QUOTE/
    );
  });

  test("Client fails closed without wallet: buildSwapPayload throws WalletNotConnectedError", async () => {
    const client = new QmoosaAmmClient();
    assert.equal(client.hasWallet(), false);

    await assert.rejects(
      () => client.buildSwapPayload({
        tokenIn: "USDC",
        tokenOut: "ETH",
        amountIn: "1000",
        minAmountOut: "990"
      }),
      (err) => err instanceof WalletNotConnectedError
    );
  });

  test("Client validates swap payload parameters before submission", async () => {
    const client = new QmoosaAmmClient();
    client.setWallet(new MockWalletAdapter());

    await assert.rejects(
      () => client.buildSwapPayload({
        tokenIn: "",
        tokenOut: "ETH",
        amountIn: "1000",
        minAmountOut: "990"
      }),
      /SDK_INVALID_QUOTE/
    );

    await assert.rejects(
      () => client.buildSwapPayload({
        tokenIn: "USDC",
        tokenOut: "ETH",
        amountIn: "1e3",
        minAmountOut: "990"
      }),
      /SDK_INVALID_QUOTE/
    );
  });

  test("Client fails closed without chain adapter: signAndSendSwap throws UnsupportedChainAdapterError", async () => {
    const client = new QmoosaAmmClient();
    const mockWallet = new MockWalletAdapter("0x1234567890123456789012345678901234567890");
    client.setWallet(mockWallet);
    assert.equal(client.hasWallet(), true);
    assert.equal(client.hasChainAdapter(), false);

    // Must FAIL CLOSED and NEVER fabricate a fake transaction hash!
    await assert.rejects(
      () => client.signAndSendSwap({
        tokenIn: "USDC",
        tokenOut: "ETH",
        amountIn: "1000",
        minAmountOut: "990"
      }),
      (err) => err instanceof UnsupportedChainAdapterError
    );
  });

  test("Configured chain adapter receives signed payload and returns receipt", async () => {
    const mockReceipt = {
      txHash: "0x_verified_tx_hash_12345",
      blockNumber: 123456,
      status: "CONFIRMED",
      timestamp: Date.now()
    };

    const mockAdapter = {
      async broadcastTransaction(tx) {
        assert.ok(tx.payload);
        assert.ok(tx.signature);
        return mockReceipt;
      },
      async getTransactionReceipt(hash) {
        return hash === mockReceipt.txHash ? mockReceipt : null;
      }
    };

    const client = new QmoosaAmmClient({ chainAdapter: mockAdapter });
    client.setWallet(new MockWalletAdapter());

    const receipt = await client.signAndSendSwap({
      tokenIn: "USDC",
      tokenOut: "ETH",
      amountIn: "1000",
      minAmountOut: "990"
    });

    assert.equal(receipt.txHash, "0x_verified_tx_hash_12345");
    assert.equal(receipt.status, "CONFIRMED");
  });

  test("AnvilLocalChainAdapter enforces local sandbox constraints and fails closed when offline", async () => {
    // 1. Rejection of public mainnet chain IDs
    assert.throws(
      () => new AnvilLocalChainAdapter({ chainId: 1 }),
      /INVALID_LOCAL_CHAIN_ID/
    );
    assert.throws(
      () => new AnvilLocalChainAdapter({ chainId: 42161 }),
      /INVALID_LOCAL_CHAIN_ID/
    );

    // 2. Default local anvil configuration
    const adapter = new AnvilLocalChainAdapter();
    assert.equal(adapter.chainId, 31337);
    assert.equal(adapter.isLocalSandbox, true);

    // 3. Rejection of non-loopback endpoints
    assert.throws(
      () => new AnvilLocalChainAdapter({ rpcUrl: "https://mainnet.infura.io/v3/fake" }),
      /NON_LOOPBACK_RPC_FORBIDDEN/
    );
    assert.throws(
      () => new AnvilLocalChainAdapter({ rpcUrl: "http://192.168.1.50:8545" }),
      /NON_LOOPBACK_RPC_FORBIDDEN/
    );

    // 4. Rejection of malformed raw transaction payload
    await assert.rejects(
      () => adapter.broadcastTransaction("not-a-hex-string"),
      /INVALID_RAW_TX_PAYLOAD/
    );

    // 5. Fail-closed behavior when local Anvil node is unreachable (zero fabricated receipts)
    const deadAdapter = new AnvilLocalChainAdapter({ rpcUrl: "http://127.0.0.1:19999" });
    await assert.rejects(
      () => deadAdapter.broadcastTransaction("0x1234567890abcdef"),
      /ANVIL_RPC_UNAVAILABLE/
    );
  });

  test("AnvilTestWallet and buildEvmSwapTransaction prepare valid EIP-1559 signed transactions", async () => {
    const wallet = new AnvilTestWallet();
    const address = await wallet.getAddress();
    assert.equal(address.toLowerCase(), "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");

    const client = new QmoosaAmmClient({ chainAdapter: new AnvilLocalChainAdapter() }, wallet);

    const evmTx = await client.buildEvmSwapTransaction({
      routerAddress: "0x1111111111111111111111111111111111111111",
      tokenIn: "0x2222222222222222222222222222222222222222",
      tokenOut: "0x3333333333333333333333333333333333333333",
      amountIn: "1000000",
      minAmountOut: "990000",
      deadlineMinutes: 15
    });

    assert.equal(evmTx.to, "0x1111111111111111111111111111111111111111");
    assert.equal(evmTx.chainId, 31337);
    // swapExactTokensForTokens selector is 0x38ed1739
    assert.ok(evmTx.data.startsWith("0x38ed1739"));

    const signedRawTx = await wallet.signTransaction(evmTx);
    assert.ok(typeof signedRawTx === "string");
    assert.ok(signedRawTx.startsWith("0x02")); // EIP-1559 type 2 transaction
  });
});
