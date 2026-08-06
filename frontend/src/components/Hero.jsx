import { useEffect, useState } from "react";
import { Contract } from "ethers";
import ConfidenceGauge from "./ConfidenceGauge";
import { getReadProvider } from "../lib/web3";
import { AI_ORACLE_ADDRESS, AI_ORACLE_ABI } from "../lib/contracts";

export default function Hero({ refreshTick }) {
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const provider = getReadProvider();
        const aiOracle = new Contract(AI_ORACLE_ADDRESS, AI_ORACLE_ABI, provider);
        const acc = await aiOracle.getAccuracyPercentage();
        if (!cancelled) setAccuracy(Number(acc));
      } catch {
        if (!cancelled) setAccuracy(0);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return (
    <section className="px-6 md:px-10 py-16 md:py-20 grid md:grid-cols-[1.2fr_0.8fr] gap-12 items-center max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight text-ink2">
          An agent that prices markets
          <br />
          and settles its own bets.
        </h1>
        <p className="font-body text-base md:text-lg text-muted mt-6 max-w-lg leading-relaxed">
          Arcle publishes verifiable probability scores on-chain, stakes USDC on
          its own convictions, and claims settlement automatically, with no human
          in the loop and no off-chain trust required.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <a
            href="#markets"
            className="font-body text-sm font-medium px-5 py-3 rounded-lg bg-signal text-ink hover:brightness-110 transition"
          >
            View live markets
          </a>
          <a
            href="#agent"
            className="font-body text-sm font-medium px-5 py-3 rounded-lg border border-line text-ink2 hover:border-signal/50 transition"
          >
            See agent activity
          </a>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="bg-surface border border-line rounded-2xl px-8 py-10">
          <ConfidenceGauge accuracy={accuracy ?? 0} />
          <div className="text-center mt-3 font-body text-xs text-muted">
            {accuracy === null ? "Loading..." : "Live, verified on-chain"}
          </div>
        </div>
      </div>
    </section>
  );
}
