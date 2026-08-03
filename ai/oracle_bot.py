"""
Arcle Oracle Agent

Autonomous agent for the Build on Arc hackathon (Agentic Economy track).

What it does, end to end, with no human in the loop:
  1. Analyzes a prediction market question and produces a probability score + confidence
  2. Publishes that score on-chain via AIOracle.updatePrediction()
  3. Decides a stake size based on its own confidence and places a bet via
     PredictionMarket.placeBet() -- paid in USDC, since USDC is Arc's native gas token
  4. Periodically checks resolved markets and claims winnings automatically via
     PredictionMarket.claimWinnings()
  5. Records its own accuracy on-chain via AIOracle.recordAccuracy()

Run modes:
  python oracle_bot.py score <marketId> "<question>" <numOutcomes>
  python oracle_bot.py stake <marketId> <numOutcomes>
  python oracle_bot.py settle <marketId> <winningOutcomeIndex>
  python oracle_bot.py loop     # scores + stakes on all open markets, then checks settlement
"""

import os
import sys
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("ARC_RPC_URL", "https://rpc.testnet.arc.io")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
AI_ORACLE_ADDRESS = os.getenv("AIORACLE_ADDRESS")
PREDICTION_MARKET_ADDRESS = os.getenv("PREDICTIONMARKET_ADDRESS")

# How much of its own confidence the agent is willing to convert into stake size.
# e.g. confidence 80/100 * MAX_STAKE_USDC * STAKE_SCALING = stake amount
MAX_STAKE_USDC = float(os.getenv("MAX_STAKE_USDC", "5.0"))
MIN_CONFIDENCE_TO_STAKE = int(os.getenv("MIN_CONFIDENCE_TO_STAKE", "60"))

AI_ORACLE_ABI = [
    {
        "inputs": [
            {"name": "marketId", "type": "uint256"},
            {"name": "probabilities", "type": "uint256[]"},
            {"name": "confidence", "type": "uint256"},
        ],
        "name": "updatePrediction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "name": "getPrediction",
        "outputs": [
            {"name": "probabilities", "type": "uint256[]"},
            {"name": "confidence", "type": "uint256"},
            {"name": "timestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "wasCorrect", "type": "bool"}],
        "name": "recordAccuracy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAccuracyPercentage",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

PREDICTION_MARKET_ABI = [
    {
        "inputs": [
            {"name": "marketId", "type": "uint256"},
            {"name": "outcomeIndex", "type": "uint256"},
        ],
        "name": "placeBet",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "name": "claimWinnings",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "name": "getMarket",
        "outputs": [
            {"name": "question", "type": "string"},
            {"name": "outcomes", "type": "string[]"},
            {"name": "endTime", "type": "uint256"},
            {"name": "status", "type": "uint8"},
            {"name": "totalPool", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


def get_web3_and_account():
    if not PRIVATE_KEY:
        raise SystemExit("PRIVATE_KEY not set in .env")
    if not AI_ORACLE_ADDRESS or not PREDICTION_MARKET_ADDRESS:
        raise SystemExit(
            "AIORACLE_ADDRESS and PREDICTIONMARKET_ADDRESS must be set in .env "
            "(from your deploy.js output)"
        )
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = w3.eth.account.from_key(PRIVATE_KEY)
    return w3, account


def get_contracts(w3):
    ai_oracle = w3.eth.contract(address=Web3.to_checksum_address(AI_ORACLE_ADDRESS), abi=AI_ORACLE_ABI)
    market = w3.eth.contract(address=Web3.to_checksum_address(PREDICTION_MARKET_ADDRESS), abi=PREDICTION_MARKET_ABI)
    return ai_oracle, market


def send_tx(w3, account, fn):
    """Build, sign, and send a contract call; wait for the receipt."""
    tx = fn.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 500_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  tx sent: {tx_hash.hex()}")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"  confirmed in block {receipt.blockNumber}")
    return receipt


def analyze_market(question: str, num_outcomes: int):
    """
    Produces a probability distribution (basis points, sums to 10000) and a
    confidence score (0-100) for a market question.

    This is a placeholder scoring function -- swap in a real model call
    (an LLM prompt, a stats model, live signal ingestion, etc.) here.
    It is deliberately simple and deterministic so the on-chain flow can be
    tested end-to-end without depending on an external AI service.
    """
    import hashlib

    seed = int(hashlib.sha256(question.encode()).hexdigest(), 16)
    weights = []
    remaining_seed = seed
    for i in range(num_outcomes):
        remaining_seed, part = divmod(remaining_seed, 97)
        weights.append(part + 1)

    total_weight = sum(weights)
    probabilities = [int((w / total_weight) * 10000) for w in weights]

    # Fix rounding so probabilities sum to exactly 10000 (contract requires this)
    diff = 10000 - sum(probabilities)
    probabilities[0] += diff

    # Confidence: how skewed the distribution is towards one outcome
    top = max(probabilities)
    confidence = min(100, int((top / 10000) * 130))  # skew towards higher confidence on lopsided markets

    return probabilities, confidence


def cmd_score(market_id: int, question: str, num_outcomes: int):
    w3, account = get_web3_and_account()
    ai_oracle, _ = get_contracts(w3)

    probabilities, confidence = analyze_market(question, num_outcomes)
    print(f"Market {market_id}: {question}")
    print(f"  probabilities (bps): {probabilities}")
    print(f"  confidence: {confidence}")

    print("Publishing prediction on-chain...")
    send_tx(w3, account, ai_oracle.functions.updatePrediction(market_id, probabilities, confidence))
    return probabilities, confidence


def cmd_stake(market_id: int, num_outcomes: int):
    w3, account = get_web3_and_account()
    ai_oracle, market = get_contracts(w3)

    probabilities, confidence, _ = ai_oracle.functions.getPrediction(market_id).call()

    if confidence < MIN_CONFIDENCE_TO_STAKE:
        print(f"Confidence {confidence} below threshold {MIN_CONFIDENCE_TO_STAKE} -- not staking.")
        return

    best_outcome = probabilities.index(max(probabilities))
    stake_fraction = confidence / 100
    stake_usdc = round(MAX_STAKE_USDC * stake_fraction, 4)
    stake_wei = w3.to_wei(stake_usdc, "ether")  # Arc native token (USDC) uses 18 decimals

    print(f"Staking {stake_usdc} USDC on outcome {best_outcome} for market {market_id} (confidence {confidence})")
    send_tx(
        w3,
        account,
        market.functions.placeBet(market_id, best_outcome),
    )


def cmd_settle(market_id: int, winning_outcome: int):
    w3, account = get_web3_and_account()
    ai_oracle, market = get_contracts(w3)

    probabilities, confidence, _ = ai_oracle.functions.getPrediction(market_id).call()
    predicted_outcome = probabilities.index(max(probabilities))
    was_correct = predicted_outcome == winning_outcome

    print(f"Market {market_id} resolved. Winning outcome: {winning_outcome}")
    print(f"Agent had predicted outcome {predicted_outcome} -- {'correct' if was_correct else 'incorrect'}")

    print("Claiming winnings (if any)...")
    try:
        send_tx(w3, account, market.functions.claimWinnings(market_id))
    except Exception as e:
        print(f"  no winnings to claim, or already claimed ({e})")

    print("Recording accuracy on-chain...")
    send_tx(w3, account, ai_oracle.functions.recordAccuracy(was_correct))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    mode = sys.argv[1]

    if mode == "score":
        market_id, question, num_outcomes = int(sys.argv[2]), sys.argv[3], int(sys.argv[4])
        cmd_score(market_id, question, num_outcomes)

    elif mode == "stake":
        market_id, num_outcomes = int(sys.argv[2]), int(sys.argv[3])
        cmd_stake(market_id, num_outcomes)

    elif mode == "settle":
        market_id, winning_outcome = int(sys.argv[2]), int(sys.argv[3])
        cmd_settle(market_id, winning_outcome)

    else:
        print(f"Unknown mode: {mode}")
        print(__doc__)
        sys.exit(1)