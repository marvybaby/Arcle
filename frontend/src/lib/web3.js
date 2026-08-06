import { BrowserProvider, JsonRpcProvider, Contract, formatUnits } from "ethers";
import {
  ARC_TESTNET,
  AI_ORACLE_ADDRESS,
  AI_ORACLE_ABI,
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
} from "./contracts";

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet found. Install MetaMask to connect.");
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 5042002) {
    throw new Error(
      "Wrong network. Please switch to Arc Testnet manually in MetaMask, then click Connect again."
    );
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

export function getReadProvider() {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return new JsonRpcProvider(ARC_TESTNET.rpcUrls[0]);
}

export function getContracts(providerOrSigner) {
  const aiOracle = new Contract(AI_ORACLE_ADDRESS, AI_ORACLE_ABI, providerOrSigner);
  const market = new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, providerOrSigner);
  return { aiOracle, market };
}

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSDC(weiValue) {
  return Number(formatUnits(weiValue, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

// Retries a function on RPC rate-limit errors with exponential backoff.
// Arc's public RPC can reject bursts of simultaneous requests (common on
// first page load, when multiple components query on-chain data at once).
export async function withRetry(fn, { retries = 4, baseDelay = 700 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const code = e?.info?.error?.code ?? e?.error?.code;
      const msg = (e?.info?.error?.message || e?.error?.message || e?.message || "").toLowerCase();
      const isRateLimit = code === -32005 || msg.includes("rate limit") || msg.includes("429");
      if (!isRateLimit || i === retries) throw e;
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}
