import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  QmoosaAmmClient,
  MockWalletAdapter,
  WalletNotConnectedError,
  UnsupportedChainAdapterError,
  InvalidQuoteError,
  utf8ToHex
} from "../dist/index.js";

describe("AMM SDK Client & Fail-Closed Boundaries", () => {
  const rA = "10000000000000000000000"; // 10,000 Token A
  const rB = "20000000000000000000000"; // 20,000 Token B

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

  test("Zero or negative quote amounts are strictly rejected", async () => {
    const client = new QmoosaAmmClient();
    await assert.rejects(
      () => client.getQuote({ tokenIn: "USDC", tokenOut: "ETH", amountIn: "0" }, rA, rB),
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
});
