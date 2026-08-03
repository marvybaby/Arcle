const hre = require("hardhat");

async function main() {
  const FACTORY_ADDRESS = process.env.MARKETFACTORY_ADDRESS;
  if (!FACTORY_ADDRESS) {
    throw new Error("Set MARKETFACTORY_ADDRESS in your .env first");
  }

  const factory = await hre.ethers.getContractAt("MarketFactory", FACTORY_ADDRESS);

  // No hardcoded gas settings -- let Hardhat/Arc estimate fees automatically,
  // since Arc's gas fees are dynamic and can change rapidly.

  console.log("Creating markets...");

  let tx = await factory.createMarket(
    "Will ETH price exceed $5,000 by end of March 2026?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "crypto"
  );
  let receipt = await tx.wait();
  console.log(`Market 0 created! tx: ${receipt.hash}`);

  tx = await factory.createMarket(
    "Will Arc TVL exceed $50M by end of Q3 2026?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "crypto"
  );
  receipt = await tx.wait();
  console.log(`Market 1 created! tx: ${receipt.hash}`);

  tx = await factory.createMarket(
    "Will a DeFi protocol on Arc exceed $100M TVL in 2026?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "defi"
  );
  receipt = await tx.wait();
  console.log(`Market 2 created! tx: ${receipt.hash}`);

  console.log("\nAll markets created successfully!");
  console.log("Check MarketCreated events on ArcScan to get each marketId,");
  console.log("or query factory.getMarketsByCategory(\"crypto\") / (\"defi\").");
}

main().catch(console.error);