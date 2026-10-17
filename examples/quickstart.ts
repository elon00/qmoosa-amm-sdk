import { QmoosaAmmClient } from "../src/index.js";

async function main() {
  console.log("=== QMOOSA AMM SDK QUICKSTART DEMO ===");
  const client = new QmoosaAmmClient({ defaultSlippageBps: 50 });

  const rA = "10000000000000000000000"; // 10,000 Token A
  const rB = "20000000000000000000000"; // 20,000 Token B

  const quote = await client.getQuote({
    tokenIn: "USDC",
    tokenOut: "ETH",
    amountIn: "1000000000000000000" // 1 unit
  }, rA, rB);

  console.log("Quote Result:", quote);

  const swapTx = await client.signAndSendSwap({
    tokenIn: "USDC",
    tokenOut: "ETH",
    amountIn: "1000000000000000000",
    minAmountOut: quote.minAmountOut
  });

  console.log("Transaction Submitted:", swapTx.txHash);
}

main().catch(console.error);
