
const hre = require("hardhat");

async function main() {
  const marketAddress = process.env.PREDICTIONMARKET_ADDRESS;
  const marketId = process.env.MARKET_ID || "0";
  const winningOutcome = process.env.WINNING_OUTCOME || "1";

  const market = await hre.ethers.getContractAt("PredictionMarket", marketAddress);

  console.log(`Resolving market ${marketId} with winning outcome ${winningOutcome}...`);
  const tx = await market.resolveMarket(marketId, winningOutcome);
  await tx.wait();
  console.log("✅ Market resolved.");
}

main().catch(console.error);