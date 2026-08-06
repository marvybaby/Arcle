import { useState } from "react";

export default function CreateMarketModal({ open, onClose, onSubmit }) {
  const [question, setQuestion] = useState("");
  const [days, setDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const endTime = Math.floor(Date.now() / 1000) + Number(days) * 86400;
      await onSubmit(question.trim(), ["Yes", "No"], endTime);
      setQuestion("");
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
        className="bg-surface border border-line rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-ink2 mb-1">Create a market</h3>
        <p className="font-body text-sm text-muted mb-5">
          Anyone can create a Yes/No prediction market. The agent may pick it up and score it automatically.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will ... by ...?"
            rows={2}
            className="w-full bg-raised border border-line rounded-lg px-3 py-2 font-body text-sm text-ink2 mb-4 resize-none focus:outline-none focus:border-signal/60"
          />

          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            Resolves in (days)
          </label>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
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
              disabled={submitting || !question.trim()}
              className="flex-1 py-2.5 rounded-lg bg-signal text-ink font-body text-sm font-medium hover:brightness-110 transition disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create market"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
