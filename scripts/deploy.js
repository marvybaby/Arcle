const hre = require("hardhat");

async function main() {
  console.log("Deploying Arcle contracts to Arc testnet...\n");

  // 1. Deploy AIOracle
  console.log("Deploying AIOracle...");
  const AIOracle = await hre.ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy();
  await aiOracle.waitForDeployment();
  console.log(`✅ AIOracle deployed to: ${await aiOracle.getAddress()}`);

  // 2. Deploy PredictionMarket
  console.log("\nDeploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(await aiOracle.getAddress());
  await predictionMarket.waitForDeployment();
  console.log(`✅ PredictionMarket deployed to: ${await predictionMarket.getAddress()}`);

  // 3. Deploy MarketFactory
  console.log("\nDeploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    await aiOracle.getAddress(),
    await predictionMarket.getAddress()
  );
  await marketFactory.waitForDeployment();
  console.log(`✅ MarketFactory deployed to: ${await marketFactory.getAddress()}`);

  // Summary
  console.log("\n--- Deployment Summary ---");
  console.log(`AIOracle:          ${await aiOracle.getAddress()}`);
  console.log(`PredictionMarket:  ${await predictionMarket.getAddress()}`);
  console.log(`MarketFactory:     ${await marketFactory.getAddress()}`);
  console.log("\nSave these addresses to your .env file!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });