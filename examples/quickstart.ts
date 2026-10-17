import { QmoosaAmmClient } from "../src/index.js";

async function main() {
  console.log("=== QMOOSA AMM SDK QUICKSTART DEMO ===");
  console.log("Environment: Read-Only Simulation / Production Safe Client");

  const client = new QmoosaAmmClient({ defaultSlippageBps: 50 });

  const rA = "10000000000000000000000"; // 10,000 Token A
  const rB = "20000000000000000000000"; // 20,000 Token B

  const quote = await client.getQuote({
    tokenIn: "USDC",
    tokenOut: "ETH",
    amountIn: "1000000000000000000", // 1 unit
    feeBps: 30,
    slippageBps: 50
  }, rA, rB);

  console.log("Calculated Swap Quote:");
  console.log(` - Expected Amount Out: ${quote.expectedAmountOut}`);
  console.log(` - Minimum Amount Out:  ${quote.minAmountOut}`);
  console.log(` - Price Impact:        ${quote.priceImpactPercent}%`);
  console.log(` - Fee Amount:          ${quote.feeAmount}`);
  console.log("\nNote: Broadcasting requires configuring an explicit WalletAdapter and ChainTransactionAdapter.");
}

main().catch(console.error);
