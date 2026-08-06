export default function ConfidenceGauge({ accuracy = 74 }) {
  // Semi-circular gauge, 0-100, drawn as an arc via stroke-dasharray
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const filled = (accuracy / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="112" viewBox="0 0 200 112">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#242E3D"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#FFB74A"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="-mt-14 text-center">
        <div className="font-display text-4xl font-semibold text-ink2">{accuracy}%</div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted mt-1">
          Verified accuracy
        </div>
      </div>
    </div>
  );
}
