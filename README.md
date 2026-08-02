# Arcle

Autonomous AI agent that prices prediction markets and stakes/settles in USDC on Arc — built for Circle's **Build on Arc** hackathon, Agentic Economy track.

## Overview

Arcle combines on-chain smart contracts with an AI oracle agent that:

1. Analyzes prediction market questions and publishes verifiable probability scores on-chain
2. Autonomously stakes USDC on the positions it's most confident in — no human in the loop
3. Automatically claims settlement once markets resolve
4. Maintains a fully verifiable, on-chain accuracy track record

Arcle is built on Arc — Circle's stablecoin-native L1 with USDC-denominated gas and sub-second settlement.

## Architecture

**Smart contracts** (Solidity 0.8.20, Hardhat, OpenZeppelin)
- `AIOracle.sol` — receives and verifies AI-generated probability scores, tracks prediction accuracy
- `PredictionMarket.sol` — market creation, bet placement, payout/claim logic
- `MarketFactory.sol` — deploys and indexes markets by category

**AI agent** (Python)
- Analyzes market questions and signals
- Publishes probability scores on-chain via the AIOracle contract
- Decides stake sizing based on confidence and autonomously submits transactions to stake USDC

**Frontend**
- HTML/CSS/JS with MetaMask/ethers.js integration for viewing markets and agent activity

## Network

Deployed on Arc Testnet:
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.io`
- Gas and market settlement denominated in USDC

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env   # add your PRIVATE_KEY
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network arc
```

## Hackathon

Built for the **Build on Arc** hackathon (Agentic Economy track) — an autonomous agent that holds a wallet and transacts in USDC without a human in the loop.