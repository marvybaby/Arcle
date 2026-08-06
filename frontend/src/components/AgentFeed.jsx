import { useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { getReadProvider } from "../lib/web3";
import {
  AI_ORACLE_ADDRESS,
  AI_ORACLE_ABI,
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  AGENT_ADDRESS,
} from "../lib/contracts";

const MAX_BLOCK_RANGE = 9000;
const dot = { stake: "bg-signal", settle: "bg-settle", score: "bg-muted" };

function timeAgo(blockTimestamp) {
  const diffSec = Math.floor(Date.now() / 1000) - blockTimestamp;
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function AgentFeed({ refreshTick }) {
  const [feed, setFeed] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const provider = getReadProvider();
        const aiOracle = new Contract(AI_ORACLE_ADDRESS, AI_ORACLE_ABI, provider);
        const market = new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - MAX_BLOCK_RANGE);

        const [stakeEvents, settleEvents, scoreEvents, acc] = await Promise.all([
          market.queryFilter(market.filters.BetPlaced(null, AGENT_ADDRESS), fromBlock, latestBlock),
          market.queryFilter(market.filters.WinningsClaimed(null, AGENT_ADDRESS), fromBlock, latestBlock),
          aiOracle.queryFilter(aiOracle.filters.PredictionUpdated(), fromBlock, latestBlock),
          aiOracle.getAccuracyPercentage(),
        ]);

        const withTimestamps = async (events, type) =>
          Promise.all(
            events.map(async (e) => {
              const block = await e.getBlock();
              return { event: e, type, timestamp: block.timestamp };
            })
          );

        const [stakes, settles, scores] = await Promise.all([
          withTimestamps(stakeEvents, "stake"),
          withTimestamps(settleEvents, "settle"),
          withTimestamps(scoreEvents, "score"),
        ]);

        const combined = [...stakes, ...settles, ...scores]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 8)
          .map(({ event, type, timestamp }) => {
            if (type === "stake") {
              return {
                type,
                action: `Staked ${Number(formatUnits(event.args.amount, 18)).toFixed(2)} USDC`,
                market: `Market #${event.args.marketId} - outcome ${event.args.outcomeIndex}`,
                confidence: "-",
                time: timeAgo(timestamp),
              };
            }
            if (type === "settle") {
              return {
                type,
                action: `Claimed ${Number(formatUnits(event.args.amount, 18)).toFixed(2)} USDC`,
                market: `Market #${event.args.marketId} - settled`,
                confidence: "won",
                time: timeAgo(timestamp),
              };
            }
            return {
              type,
              action: `Published score`,
              market: `Market #${event.args.marketId} - confidence ${event.args.confidence}%`,
              confidence: "signal",
              time: timeAgo(timestamp),
            };
          });

        if (!cancelled) {
          setFeed(combined);
          setAccuracy(Number(acc));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return (
    <section id="agent" className="px-6 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink2">Agent activity</h2>
        <span className="font-mono text-xs text-muted">
          {accuracy !== null ? `${accuracy}% verified accuracy` : "on-chain, verifiable"}
        </span>
      </div>
      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {loading && (
          <div className="px-5 py-6 text-sm text-muted font-mono">loading on-chain activity...</div>
        )}
        {!loading && feed.length === 0 && (
          <div className="px-5 py-6 text-sm text-muted font-body">
            No agent activity in the recent block range yet.
          </div>
        )}
        {feed.map((f, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <span className={`w-1.5 h-1.5 rounded-full ${dot[f.type]}`} />
            <div className="flex-1 min-w-0">
              <div className="font-body text-sm text-ink2">{f.action}</div>
              <div className="font-mono text-xs text-muted truncate">{f.market}</div>
            </div>
            <span className="font-mono text-xs text-muted whitespace-nowrap">{f.confidence}</span>
            <span className="font-mono text-[11px] text-muted whitespace-nowrap w-16 text-right">{f.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}