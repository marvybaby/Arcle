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
  // Reads always go straight to Arc's RPC, independent of any visitor's
  // wallet or whichever network it happens to be connected to -- this is
  // what makes the site work for visitors with no wallet, or a wallet on
  // the wrong network. Only writes (placing bets, creating markets) use
  // the wallet's signer, via getContracts() with a signer passed in.
  return new JsonRpcProvider(ARC_TESTNET.rpcUrls[0]);
}

// Fetches logs across a wider window than a single eth_getLogs call allows,
// by querying backward in bounded chunks and merging the results. Needed
// because Arc's RPC caps a single query's block range.
export async function queryFilterChunked(contract, filter, latestBlock, {
  chunkSize = 9000,
  maxChunks = 1, // single window only -- minimize eth_getLogs calls as much as possible
  delayBetween = 150,
} = {}) {
  let toBlock = latestBlock;
  let all = [];
  for (let i = 0; i < maxChunks; i++) {
    const fromBlock = Math.max(0, toBlock - chunkSize);
    const events = await withRetry(() => contract.queryFilter(filter, fromBlock, toBlock));
    all = all.concat(events);
    if (fromBlock === 0) break;
    toBlock = fromBlock - 1;
    if (delayBetween) await new Promise((r) => setTimeout(r, delayBetween));
  }
  return all;
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
// Concurrency-limited pool: allows a few RPC calls in flight at once
// (instead of strict one-at-a-time) so the app loads reasonably fast, while
// still capping how many simultaneous requests hit Arc's RPC to avoid
// triggering its rate limit. Tuned as a balance between speed and safety --
// pure serial (limit 1) was reliable but too slow; fully parallel is fast
// but re-triggers rate limiting.
const POOL_SIZE = 4;
let activeCount = 0;
const waiters = [];

function acquire() {
  if (activeCount < POOL_SIZE) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function release() {
  activeCount--;
  const next = waiters.shift();
  if (next) {
    activeCount++;
    next();
  }
}

async function enqueue(fn) {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function withRetry(fn, { retries = 6, baseDelay = 900 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await enqueue(fn);
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
