// Arc testnet contract addresses and ABIs for Arcle.
// Update these three addresses if you redeploy.

export const ARC_TESTNET = {
  chainId: "0x4CEF52", // 5042002 in hex
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.io"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

export const AI_ORACLE_ADDRESS = "0xf86072a83Af338F82540C61F42b0AE26b1B733c6";
export const PREDICTION_MARKET_ADDRESS = "0x8fc3666Ed97B3dC908F6892190F198564FADd403";
export const MARKET_FACTORY_ADDRESS = "0x09141b8749075E4E3cD031E55f775E920832fEf7";

export const AI_ORACLE_ABI = [
  "function getPrediction(uint256 marketId) view returns (uint256[] probabilities, uint256 confidence, uint256 timestamp)",
  "function getAccuracyPercentage() view returns (uint256)",
  "event PredictionUpdated(uint256 indexed marketId, uint256[] probabilities, uint256 confidence, uint256 timestamp)",
  "event AccuracyRecorded(uint256 correct, uint256 total)",
];

export const PREDICTION_MARKET_ABI = [
  "function placeBet(uint256 marketId, uint256 outcomeIndex) payable",
  "function claimWinnings(uint256 marketId)",
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 marketId) view returns (string question, string[] outcomes, uint256 endTime, uint8 status, uint256 totalPool)",
  "function getOutcomePool(uint256 marketId, uint256 outcomeIndex) view returns (uint256)",
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, uint256 outcomeIndex, uint256 amount)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount)",
  "event MarketCreated(uint256 indexed marketId, string question, string[] outcomes, uint256 endTime)",
  "function createMarket(string question, string[] outcomes, uint256 endTime) returns (uint256)",
];

// The agent's own wallet address (from your oracle_bot.py / registerAgent.js runs).
// Used to flag which on-chain bets/settlements were placed by the agent itself.
export const AGENT_ADDRESS = "0xc79D299667ca09453a9Ad232b0cE9D1812F2fe2E";

export const MARKET_STATUS = ["Open", "Closed", "Resolved", "Cancelled"];
