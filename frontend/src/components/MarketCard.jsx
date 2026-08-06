export default function MarketCard({ market, onBet }) {
  const { question, category, yesPoolPct, poolFormatted, timeLeft, agentStake, agentConfidence } = market;

  return (
    <div className="bg-surface border border-line rounded-xl p-5 hover:border-signal/40 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{category}</span>
        <span className="font-mono text-[11px] text-muted">{timeLeft}</span>
      </div>
      <h3 className="font-display text-base font-medium text-ink2 leading-snug mb-4">
        {question}
      </h3>

      {agentConfidence !== null && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-signal" />
          <span className="font-mono text-[11px] text-signal">
            Agent confidence: {agentConfidence}%
          </span>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-2xl font-semibold text-settle">{yesPoolPct}%</div>
          <div className="font-mono text-[11px] text-muted">YES pool share</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-ink2">{poolFormatted} USDC pool</div>
          {agentStake && (
            <div className="font-mono text-[11px] text-signal mt-0.5">
              Agent staked {agentStake} USDC
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onBet(market)}
        className="w-full mt-4 font-body text-sm font-medium py-2.5 rounded-lg border border-line text-ink2 hover:border-signal/50 hover:bg-raised transition"
      >
        Place a bet
      </button>
    </div>
  );
}
