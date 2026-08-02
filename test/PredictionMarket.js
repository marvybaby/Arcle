const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("OracleX - Prediction Market", function () {
  let aiOracle, predictionMarket, marketFactory;
  let owner, user1, user2;
  let marketId;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AIOracle = await ethers.getContractFactory("AIOracle");
    aiOracle = await AIOracle.deploy();

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy(await aiOracle.getAddress());

    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy(
      await aiOracle.getAddress(),
      await predictionMarket.getAddress()
    );

    // Transfer ownership of PredictionMarket to MarketFactory
    await predictionMarket.transferOwnership(await marketFactory.getAddress());
  });

  // ─────────────────────────────────────────
  // AIOracle Tests
  // ─────────────────────────────────────────
  describe("AIOracle", function () {

    it("Should deploy with correct owner", async function () {
      expect(await aiOracle.owner()).to.equal(owner.address);
    });

    it("Should allow owner to update prediction", async function () {
      const probabilities = [6000, 4000];
      await aiOracle.updatePrediction(0, probabilities, 85);
      const [probs, confidence] = await aiOracle.getPrediction(0);
      expect(probs[0]).to.equal(6000n);
      expect(probs[1]).to.equal(4000n);
      expect(confidence).to.equal(85n);
    });

    it("Should reject probabilities that don't sum to 10000", async function () {
      await expect(
        aiOracle.updatePrediction(0, [5000, 3000], 80)
      ).to.be.revertedWith("AIOracle: Probabilities must sum to 100%");
    });

    it("Should authorize and revoke updaters", async function () {
      await aiOracle.authorizeUpdater(user1.address);
      expect(await aiOracle.authorizedUpdaters(user1.address)).to.equal(true);
      await aiOracle.revokeUpdater(user1.address);
      expect(await aiOracle.authorizedUpdaters(user1.address)).to.equal(false);
    });

    it("Should track AI accuracy correctly", async function () {
      await aiOracle.recordAccuracy(true);
      await aiOracle.recordAccuracy(true);
      await aiOracle.recordAccuracy(false);
      expect(await aiOracle.getAccuracyPercentage()).to.equal(66n);
    });

  });

  // ─────────────────────────────────────────
  // PredictionMarket Tests
  // ─────────────────────────────────────────
  describe("PredictionMarket", function () {

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const endTime = latestBlock.timestamp + 3600;
      await marketFactory.createMarket(
        "Will ETH price exceed $5000 by end of March 2026?",
        ["Yes", "No"],
        endTime,
        "Crypto"
      );
      marketId = 0;
    });

    it("Should create a market correctly", async function () {
      const [question, outcomes, , status, totalPool] =
        await predictionMarket.getMarket(marketId);
      expect(question).to.equal("Will ETH price exceed $5000 by end of March 2026?");
      expect(outcomes.length).to.equal(2);
      expect(status).to.equal(0n);
      expect(totalPool).to.equal(0n);
    });

    it("Should allow users to place bets", async function () {
      const betAmount = ethers.parseEther("1.0");
      await predictionMarket.connect(user1).placeBet(marketId, 0, { value: betAmount });
      const pool = await predictionMarket.getOutcomePool(marketId, 0);
      expect(pool).to.equal(betAmount);
    });

    it("Should reject bet with zero value", async function () {
      await expect(
        predictionMarket.connect(user1).placeBet(marketId, 0, { value: 0 })
      ).to.be.revertedWith("PredictionMarket: Bet amount must be greater than 0");
    });

    it("Should reject invalid outcome index", async function () {
      await expect(
        predictionMarket.connect(user1).placeBet(marketId, 5, {
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWith("PredictionMarket: Invalid outcome");
    });

    it("Should allow winner to claim winnings", async function () {
      await predictionMarket
        .connect(user1)
        .placeBet(marketId, 0, { value: ethers.parseEther("2.0") });
      await predictionMarket
        .connect(user2)
        .placeBet(marketId, 1, { value: ethers.parseEther("1.0") });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await marketFactory.resolveMarket(marketId, 0);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await predictionMarket.connect(user1).claimWinnings(marketId);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter > balanceBefore).to.be.true;
    });

    it("Should allow refund on cancelled market", async function () {
      await predictionMarket
        .connect(user1)
        .placeBet(marketId, 0, { value: ethers.parseEther("1.0") });

      await marketFactory.cancelMarket(marketId);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await predictionMarket.connect(user1).claimRefund(marketId);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter > balanceBefore).to.be.true;
    });

  });

  // ─────────────────────────────────────────
  // MarketFactory Tests
  // ─────────────────────────────────────────
  describe("MarketFactory", function () {

    it("Should create market through factory", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const endTime = latestBlock.timestamp + 3600;
      await marketFactory.createMarket(
        "Will DOT price exceed $20 in March 2026?",
        ["Yes", "No"],
        endTime,
        "Crypto"
      );
      expect(await marketFactory.totalMarketsCreated()).to.equal(1n);
    });

    it("Should retrieve markets by category", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const endTime = latestBlock.timestamp + 3600;
      await marketFactory.createMarket(
        "Will DOT price exceed $20?",
        ["Yes", "No"],
        endTime,
        "Crypto"
      );
      await marketFactory.createMarket(
        "Will ETH merge happen in 2026?",
        ["Yes", "No"],
        endTime,
        "Crypto"
      );
      const cryptoMarkets = await marketFactory.getMarketsByCategory("Crypto");
      expect(cryptoMarkets.length).to.equal(2);
    });

  });

});