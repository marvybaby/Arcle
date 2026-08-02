// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";
import "./AIOracle.sol";

contract MarketFactory is Ownable {

    // Storage
    AIOracle public aiOracle;
    PredictionMarket public predictionMarket;

    uint256 public totalMarketsCreated;

    // Market metadata
    struct MarketInfo {
        uint256 marketId;
        string category;
        address createdBy;
        uint256 createdAt;
    }

    mapping(uint256 => MarketInfo) public marketInfo;
    mapping(string => uint256[]) public marketsByCategory;
    uint256[] public allMarketIds;

    // Events
    event MarketDeployed(
        uint256 indexed marketId,
        string question,
        string category,
        address createdBy,
        uint256 endTime
    );

    constructor(address _aiOracle, address _predictionMarket) Ownable(msg.sender) {
        aiOracle = AIOracle(_aiOracle);
        predictionMarket = PredictionMarket(_predictionMarket);
    }

    // Create a new market through the factory
    function createMarket(
        string calldata question,
        string[] calldata outcomes,
        uint256 endTime,
        string calldata category
    ) external returns (uint256) {
        uint256 marketId = predictionMarket.createMarket(
            question,
            outcomes,
            endTime
        );

        marketInfo[marketId] = MarketInfo({
            marketId: marketId,
            category: category,
            createdBy: msg.sender,
            createdAt: block.timestamp
        });

        marketsByCategory[category].push(marketId);
        allMarketIds.push(marketId);
        totalMarketsCreated++;

        emit MarketDeployed(marketId, question, category, msg.sender, endTime);
        return marketId;
    }

    // Get all markets by category
    function getMarketsByCategory(string calldata category)
        external view returns (uint256[] memory) {
        return marketsByCategory[category];
    }

    // Get all market IDs
    function getAllMarkets() external view returns (uint256[] memory) {
        return allMarketIds;
    }

    // Get full market details including AI prediction
    function getMarketWithAI(uint256 marketId) external view returns (
        string memory question,
        string[] memory outcomes,
        uint256 endTime,
        uint256 totalPool,
        uint256[] memory aiProbabilities,
        uint256 aiConfidence
    ) {
        (
            question,
            outcomes,
            endTime,
            ,
            totalPool
        ) = predictionMarket.getMarket(marketId);

        try aiOracle.getPrediction(marketId) returns (
            uint256[] memory probabilities,
            uint256 confidence,
            uint256 /* timestamp */
        ) {
            aiProbabilities = probabilities;
            aiConfidence = confidence;
        } catch {
            aiProbabilities = new uint256[](0);
            aiConfidence = 0;
        }
    }

    // Get market info
    function getMarketInfo(uint256 marketId) external view returns (
        string memory category,
        address createdBy,
        uint256 createdAt
    ) {
        MarketInfo storage info = marketInfo[marketId];
        return (info.category, info.createdBy, info.createdAt);
    }

    function resolveMarket(uint256 marketId, uint256 winningOutcome) external {
    predictionMarket.resolveMarket(marketId, winningOutcome);
}

function cancelMarket(uint256 marketId) external onlyOwner {
    predictionMarket.cancelMarket(marketId);
}
}