// Creates a test prediction market on the deployed PredictionMarket contract.
// Run with: npx hardhat run scripts/createMarket.js --network arc

const hre = require("hardhat");

async function main() {
  const predictionMarketAddress = process.env.PREDICTIONMARKET_ADDRESS;
  if (!predictionMarketAddress) {
    throw new Error("Set PREDICTIONMARKET_ADDRESS in your .env first");
  }

  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = PredictionMarket.attach(predictionMarketAddress);

  const question = "Will ETH close above $4,200 by Friday?";
  const outcomes = ["Yes", "No"];
  const endTime = Math.floor(Date.now() / 1000) + 60 * 10; // resolves in 10 minutes, for quick testing

  console.log(`Creating market: "${question}"`);
  const tx = await market.createMarket(question, outcomes, endTime);
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try {
        return market.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "MarketCreated");

  const marketId = event.args.marketId.toString();
  console.log(`✅ Market created with ID: ${marketId}`);
  console.log(`Ends at: ${new Date(endTime * 1000).toISOString()}`);
  console.log(`\nUse this marketId with oracle_bot.py, e.g.:`);
  console.log(`  python ai\\oracle_bot.py score ${marketId} "${question}" ${outcomes.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });