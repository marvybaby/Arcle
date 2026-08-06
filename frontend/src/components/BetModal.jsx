import { useState } from "react";

export default function BetModal({ market, onClose, onSubmit }) {
  const [amount, setAmount] = useState("1.0");
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!market) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(market.marketId, outcomeIndex, amount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-ink2 mb-1">Place a bet</h3>
        <p className="font-body text-sm text-muted mb-5">{market.question}</p>

        <form onSubmit={handleSubmit}>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            Outcome
          </label>
          <div className="flex gap-2 mb-4">
            {["Yes", "No"].map((label, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setOutcomeIndex(i)}
                className={`flex-1 py-2 rounded-lg font-body text-sm font-medium border transition ${
                  outcomeIndex === i
                    ? "border-signal bg-signal/10 text-signal"
                    : "border-line text-muted hover:border-signal/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-raised border border-line rounded-lg px-3 py-2 font-mono text-sm text-ink2 mb-5 focus:outline-none focus:border-signal/60"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-line text-ink2 font-body text-sm hover:bg-raised transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-signal text-ink font-body text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Confirm bet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
