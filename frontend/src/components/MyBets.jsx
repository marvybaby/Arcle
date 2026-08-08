import { useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { getReadProvider, getContracts, queryFilterChunked, withRetry } from "../lib/web3";
import { PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, MARKET_STATUS } from "../lib/contracts";

export default function MyBets({ address, signer, refreshTick, onClaim }) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (!address) {
      setBets([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const provider = getReadProvider();
        const market = new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);

        const latestBlock = await withRetry(() => provider.getBlockNumber());

        const myBetEvents = await queryFilterChunked(
          market, market.filters.BetPlaced(null, address), latestBlock
        );

        const grouped = {};
        for (const e of myBetEvents) {
          const id = e.args.marketId.toString();
          if (!grouped[id]) grouped[id] = { marketId: id, outcomeIndex: e.args.outcomeIndex, amount: 0n };
          grouped[id].amount += e.args.amount;
        }

        const results = await Promise.all(
          Object.values(grouped).map(async (b) => {
            const [question, , , status] = await withRetry(() => market.getMarket(b.marketId));
            return {
              ...b,
              question,
              status: MARKET_STATUS[status],
              statusRaw: status,
              amountFormatted: Number(formatUnits(b.amount, 18)).toFixed(2),
            };
          })
        );

        if (!cancelled) {
          setBets(results);
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
  }, [address, refreshTick]);

  async function handleClaim(marketId) {
    setClaiming(marketId);
    try {
      const { market } = getContracts(signer);
      const tx = await market.claimWinnings(marketId);
      await tx.wait();
      onClaim();
    } catch (e) {
      alert(`Claim failed: ${e.message}`);
    } finally {
      setClaiming(null);
    }
  }

  if (!address) return null;

  return (
    <section id="my-bets" className="px-6 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-8">
        <h2 className="font-display text-2xl font-semibold text-ink2">My bets</h2>
        <span className="font-mono text-xs text-muted">{loading ? "loading..." : `${bets.length} positions`}</span>
      </div>

      {!loading && bets.length === 0 && (
        <div className="text-sm text-muted font-body">You haven't placed any bets yet.</div>
      )}

      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {bets.map((b) => (
          <div key={b.marketId} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="font-body text-sm text-ink2 truncate">{b.question}</div>
              <div className="font-mono text-xs text-muted">
                {b.amountFormatted} USDC - outcome {b.outcomeIndex} - {b.status}
              </div>
            </div>
            {b.status === "Resolved" && (
              <button
                onClick={() => handleClaim(b.marketId)}
                disabled={claiming === b.marketId}
                className="font-body text-xs font-medium px-3 py-1.5 rounded-lg bg-signal text-ink hover:brightness-110 transition disabled:opacity-60"
              >
                {claiming === b.marketId ? "Claiming..." : "Claim"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
