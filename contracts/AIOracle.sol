// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AIOracle is Ownable {
    
    // Struct to store AI prediction for a market
    struct Prediction {
        uint256 marketId;
        uint256[] outcomeProbabilities; // in basis points (10000 = 100%)
        uint256 confidence;             // 0-100
        uint256 timestamp;
        bool exists;
    }

    // Struct to track AI accuracy
    struct AccuracyRecord {
        uint256 totalPredictions;
        uint256 correctPredictions;
    }

    // Storage
    mapping(uint256 => Prediction) public predictions;
    mapping(address => bool) public authorizedUpdaters;
    AccuracyRecord public aiAccuracy;

    // Events
    event PredictionUpdated(
        uint256 indexed marketId,
        uint256[] probabilities,
        uint256 confidence,
        uint256 timestamp
    );
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);
    event AccuracyRecorded(uint256 correct, uint256 total);

    // Modifiers
    modifier onlyAuthorized() {
        require(
            authorizedUpdaters[msg.sender] || msg.sender == owner(),
            "AIOracle: Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedUpdaters[msg.sender] = true;
    }

    // Authorize an AI updater address
    function authorizeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }

    // Revoke an AI updater address
    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRevoked(updater);
    }

    // Push AI prediction on-chain
    function updatePrediction(
        uint256 marketId,
        uint256[] calldata probabilities,
        uint256 confidence
    ) external onlyAuthorized {
        // Validate probabilities sum to 10000 (100%)
        uint256 total = 0;
        for (uint256 i = 0; i < probabilities.length; i++) {
            total += probabilities[i];
        }
        require(total == 10000, "AIOracle: Probabilities must sum to 100%");
        require(confidence <= 100, "AIOracle: Confidence must be 0-100");

        predictions[marketId] = Prediction({
            marketId: marketId,
            outcomeProbabilities: probabilities,
            confidence: confidence,
            timestamp: block.timestamp,
            exists: true
        });

        emit PredictionUpdated(marketId, probabilities, confidence, block.timestamp);
    }

    // Get prediction for a market
    function getPrediction(uint256 marketId) 
        external 
        view 
        returns (
            uint256[] memory probabilities,
            uint256 confidence,
            uint256 timestamp
        ) 
    {
        require(predictions[marketId].exists, "AIOracle: No prediction found");
        Prediction memory p = predictions[marketId];
        return (p.outcomeProbabilities, p.confidence, p.timestamp);
    }

    // Record AI accuracy after market resolves
    function recordAccuracy(bool wasCorrect) external onlyAuthorized {
        aiAccuracy.totalPredictions++;
        if (wasCorrect) {
            aiAccuracy.correctPredictions++;
        }
        emit AccuracyRecorded(
            aiAccuracy.correctPredictions,
            aiAccuracy.totalPredictions
        );
    }

    // Get AI accuracy percentage
    function getAccuracyPercentage() external view returns (uint256) {
        if (aiAccuracy.totalPredictions == 0) return 0;
        return (aiAccuracy.correctPredictions * 100) / aiAccuracy.totalPredictions;
    }
}