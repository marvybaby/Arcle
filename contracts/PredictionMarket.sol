// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AIOracle.sol";

contract PredictionMarket is Ownable, ReentrancyGuard {

    // Market states
    enum MarketStatus { Open, Closed, Resolved, Cancelled }

    // Struct for each market
    struct Market {
        uint256 id;
        string question;
        string[] outcomes;
        uint256 endTime;
        MarketStatus status;
        uint256 winningOutcome;
        uint256 totalPool;
        bool exists;
    }

    // Struct for each bet
    struct Bet {
        address bettor;
        uint256 marketId;
        uint256 outcomeIndex;
        uint256 amount;
        bool claimed;
    }

    // Storage
    AIOracle public aiOracle;
    uint256 public marketCount;
    uint256 public constant PLATFORM_FEE = 200; // 2% in basis points
    uint256 public constant BASIS_POINTS = 10000;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(uint256 => mapping(uint256 => uint256)) public outcomePool; // marketId => outcomeIndex => total
    mapping(uint256 => mapping(address => uint256[])) public userBetIndexes; // marketId => user => bet indexes

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        string[] outcomes,
        uint256 endTime
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 outcomeIndex,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint256 winningOutcome
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount
    );
    event MarketCancelled(uint256 indexed marketId);

    constructor(address _aiOracle) Ownable(msg.sender) {
        aiOracle = AIOracle(_aiOracle);
    }

    // Create a new prediction market
    function createMarket(
        string calldata question,
        string[] calldata outcomes,
        uint256 endTime
    ) external returns (uint256) {
        require(outcomes.length >= 2, "PredictionMarket: Need at least 2 outcomes");
        require(endTime > block.timestamp, "PredictionMarket: End time must be in future");

        uint256 marketId = marketCount++;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            outcomes: outcomes,
            endTime: endTime,
            status: MarketStatus.Open,
            winningOutcome: 0,
            totalPool: 0,
            exists: true
        });

        emit MarketCreated(marketId, question, outcomes, endTime);
        return marketId;
    }

    // Place a bet on an outcome
    function placeBet(
        uint256 marketId,
        uint256 outcomeIndex
    ) external payable nonReentrant {
        Market storage market = markets[marketId];
        require(market.exists, "PredictionMarket: Market not found");
        require(market.status == MarketStatus.Open, "PredictionMarket: Market not open");
        require(block.timestamp < market.endTime, "PredictionMarket: Market has ended");
        require(outcomeIndex < market.outcomes.length, "PredictionMarket: Invalid outcome");
        require(msg.value > 0, "PredictionMarket: Bet amount must be greater than 0");

        uint256 betIndex = marketBets[marketId].length;

        marketBets[marketId].push(Bet({
            bettor: msg.sender,
            marketId: marketId,
            outcomeIndex: outcomeIndex,
            amount: msg.value,
            claimed: false
        }));

        outcomePool[marketId][outcomeIndex] += msg.value;
        market.totalPool += msg.value;
        userBetIndexes[marketId][msg.sender].push(betIndex);

        emit BetPlaced(marketId, msg.sender, outcomeIndex, msg.value);
    }

    // Resolve market with winning outcome
    function resolveMarket(
        uint256 marketId,
        uint256 winningOutcome
    ) external  {
        Market storage market = markets[marketId];
        require(market.exists, "PredictionMarket: Market not found");
        require(market.status == MarketStatus.Open, "PredictionMarket: Market not open");
        require(block.timestamp >= market.endTime, "PredictionMarket: Market still ongoing");
        require(winningOutcome < market.outcomes.length, "PredictionMarket: Invalid outcome");

        market.status = MarketStatus.Resolved;
        market.winningOutcome = winningOutcome;

        emit MarketResolved(marketId, winningOutcome);
    }

    // Claim winnings
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.exists, "PredictionMarket: Market not found");
        require(market.status == MarketStatus.Resolved, "PredictionMarket: Market not resolved");

        uint256[] storage betIndexes = userBetIndexes[marketId][msg.sender];
        require(betIndexes.length > 0, "PredictionMarket: No bets found");

        uint256 totalWinnings = 0;
        uint256 winningPool = outcomePool[marketId][market.winningOutcome];

        for (uint256 i = 0; i < betIndexes.length; i++) {
            Bet storage bet = marketBets[marketId][betIndexes[i]];
            if (bet.outcomeIndex == market.winningOutcome && !bet.claimed) {
                bet.claimed = true;
                // Calculate share of total pool minus platform fee
                uint256 grossWinnings = (bet.amount * market.totalPool) / winningPool;
                uint256 fee = (grossWinnings * PLATFORM_FEE) / BASIS_POINTS;
                totalWinnings += grossWinnings - fee;
            }
        }

        require(totalWinnings > 0, "PredictionMarket: No winnings to claim");

        (bool success, ) = payable(msg.sender).call{value: totalWinnings}("");
        require(success, "PredictionMarket: Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, totalWinnings);
    }

    // Cancel market and refund all bets
    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.exists, "PredictionMarket: Market not found");
        require(market.status == MarketStatus.Open, "PredictionMarket: Market not open");

        market.status = MarketStatus.Cancelled;
        emit MarketCancelled(marketId);
    }

    // Claim refund for cancelled market
    function claimRefund(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Cancelled, "PredictionMarket: Market not cancelled");

        uint256[] storage betIndexes = userBetIndexes[marketId][msg.sender];
        uint256 refundAmount = 0;

        for (uint256 i = 0; i < betIndexes.length; i++) {
            Bet storage bet = marketBets[marketId][betIndexes[i]];
            if (!bet.claimed) {
                bet.claimed = true;
                refundAmount += bet.amount;
            }
        }

        require(refundAmount > 0, "PredictionMarket: No refund available");

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "PredictionMarket: Refund failed");
    }

    // Get market details
    function getMarket(uint256 marketId) external view returns (
        string memory question,
        string[] memory outcomes,
        uint256 endTime,
        MarketStatus status,
        uint256 totalPool
    ) {
        Market storage market = markets[marketId];
        require(market.exists, "PredictionMarket: Market not found");
        return (
            market.question,
            market.outcomes,
            market.endTime,
            market.status,
            market.totalPool
        );
    }

    // Get AI prediction for a market
    function getAIPrediction(uint256 marketId) external view returns (
        uint256[] memory probabilities,
        uint256 confidence,
        uint256 timestamp
    ) {
        return aiOracle.getPrediction(marketId);
    }

    // Get outcome pool amounts
    function getOutcomePool(uint256 marketId, uint256 outcomeIndex) 
        external view returns (uint256) {
        return outcomePool[marketId][outcomeIndex];
    }
}