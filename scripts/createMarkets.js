const hre = require("hardhat");

async function main() {
  const FACTORY_ADDRESS = "0x936800b22e483A2ec3d112da9027bbFEc0Cf55d5";


  const factory = await hre.ethers.getContractAt("MarketFactory", FACTORY_ADDRESS);

  const gasSettings = {
    maxPriorityFeePerGas: hre.ethers.parseUnits("1500", "gwei"),
    maxFeePerGas: hre.ethers.parseUnits("2000", "gwei")
  };

  console.log("Creating markets...");

  let tx = await factory.createMarket(
    "Will ETH price exceed $5,000 by end of March 2026?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "crypto",
    gasSettings
  );
  await tx.wait();
  console.log("Market 0 created!");

  tx = await factory.createMarket(
    "Will DOT price exceed $20 before the hackathon ends?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "crypto",
    gasSettings
  );
  await tx.wait();
  console.log("Market 1 created!");

  tx = await factory.createMarket(
    "Will a DeFi protocol on Polkadot Hub exceed $100M TVL in 2026?",
    ["Yes", "No"],
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    "defi",
    gasSettings
  );
  await tx.wait();
  console.log("Market 2 created!");

  console.log("All markets created successfully!");
}

main().catch(console.error);