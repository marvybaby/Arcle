const events = [
  { type: "STAKE", detail: "12.4 USDC on \u201cETH > $4,200 by Fri\u201d", conf: "82%" },
  { type: "SETTLE", detail: "Claimed 31.2 USDC \u2014 \u201cFed holds rates\u201d resolved YES", conf: "win" },
  { type: "STAKE", detail: "6.0 USDC on \u201cArc TVL > $50M in Q3\u201d", conf: "71%" },
  { type: "SCORE", detail: "Published 0.63 probability \u2014 \u201cBTC dominance < 55%\u201d", conf: "signal" },
  { type: "SETTLE", detail: "Claimed 8.9 USDC \u2014 \u201cCPI print < 3.1%\u201d resolved YES", conf: "win" },
];

function Row({ e }) {
  const color =
    e.type === "STAKE" ? "text-signal" : e.type === "SETTLE" ? "text-settle" : "text-muted";
  return (
    <span className="inline-flex items-center gap-3 px-6 font-mono text-sm whitespace-nowrap">
      <span className={`font-semibold ${color}`}>{e.type}</span>
      <span className="text-ink2/80">{e.detail}</span>
      <span className="text-muted">·</span>
    </span>
  );
}

export default function TickerTape() {
  const doubled = [...events, ...events];
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/60 py-3">
      <div className="flex animate-tape">
        {doubled.map((e, i) => (
          <Row e={e} key={i} />
        ))}
      </div>
    </div>
  );
}
