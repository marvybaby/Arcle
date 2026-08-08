import { useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import MarketCard from "./MarketCard";
import { getReadProvider, queryFilterChunked, withRetry } from "../lib/web3";
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  AI_ORACLE_ADDRESS,
  AI_ORACLE_ABI,
  AGENT_ADDRESS,
  MARKET_STATUS,
} from "../lib/contracts";

function timeLeft(endTime) {
  const diffMs = endTime * 1000 - Date.now();
  if (diffMs <= 0) return "Ended";
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function MarketsGrid({ onBet, onCreateClick, refreshTick }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const provider = getReadProvider();
        const market = new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);
        const aiOracle = new Contract(AI_ORACLE_ADDRESS, AI_ORACLE_ABI, provider);

        const latestBlock = await withRetry(() => provider.getBlockNumber());
        const count = Number(await withRetry(() => market.marketCount()));

        const agentBetEvents = await queryFilterChunked(
          market, market.filters.BetPlaced(null, AGENT_ADDRESS), latestBlock
        );
        const scoreEvents = await queryFilterChunked(
          aiOracle, aiOracle.filters.PredictionUpdated(), latestBlock
        );

        const agentStakeByMarket = {};
        for (const e of agentBetEvents) {
          const id = e.args.marketId.toString();
          agentStakeByMarket[id] = (agentStakeByMarket[id] || 0n) + e.args.amount;
        }

        const confidenceByMarket = {};
        for (const e of scoreEvents) {
          // last event wins (most recent score) since events are in chronological order
          confidenceByMarket[e.args.marketId.toString()] = Number(e.args.confidence);
        }

        const results = [];
        for (let id = 0; id < count; id++) {
          const [question, outcomes, endTime, status, totalPool] = await withRetry(() => market.getMarket(id));
          const yesPool = await withRetry(() => market.getOutcomePool(id, 0));
          const agentStakeWei = agentStakeByMarket[id.toString()] || 0n;

          results.push({
            marketId: id,
            question,
            category: "Prediction",
            yesPoolPct: totalPool > 0n ? Math.round((Number(yesPool) / Number(totalPool)) * 100) : 50,
            poolFormatted: Number(formatUnits(totalPool, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            timeLeft: `${MARKET_STATUS[status]} - ${timeLeft(Number(endTime))}`,
            agentStake: agentStakeWei > 0n ? Number(formatUnits(agentStakeWei, 18)).toFixed(2) : null,
            agentConfidence: confidenceByMarket[id.toString()] ?? null,
          });
        }

        if (!cancelled) {
          setMarkets(results.reverse());
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filtered = markets.filter((m) =>
    m.question.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section id="markets" className="px-6 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <h2 className="font-display text-2xl font-semibold text-ink2">Live markets</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            {loading ? "loading..." : `${filtered.length} on-chain`}
          </span>
          <button
            onClick={onCreateClick}
            className="font-body text-xs font-medium px-3 py-1.5 rounded-lg bg-signal text-ink hover:brightness-110 transition"
          >
            + Create market
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search markets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full md:w-80 bg-surface border border-line rounded-lg px-3 py-2 font-body text-sm text-ink2 mb-8 focus:outline-none focus:border-signal/60"
      />

      {error && (
        <div className="text-sm text-no font-mono mb-6">
          Couldn't load markets: {error}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-sm text-muted font-body">
          {markets.length === 0 ? "No markets yet - create the first one." : "No markets match your search."}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <MarketCard market={m} key={m.marketId} onBet={onBet} />
        ))}
      </div>
    </section>
  );
}
