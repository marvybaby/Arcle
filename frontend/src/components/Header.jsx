import { shortenAddress } from "../lib/web3";

export default function Header({ onConnect, address, connecting }) {
  return (
    <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-line">
      <div className="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="11" stroke="#FFB74A" strokeWidth="1.6" />
          <circle cx="13" cy="13" r="2.4" fill="#FFB74A" />
          <path d="M13 5.5V13L18 10" stroke="#FFB74A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display text-lg font-semibold tracking-tight">Arcle</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 font-body text-sm text-muted">
        <a href="#markets" className="hover:text-ink2 transition-colors">Markets</a>
        <a href="#my-bets" className="hover:text-ink2 transition-colors">My bets</a>
        <a href="#agent" className="hover:text-ink2 transition-colors">Agent</a>
      </nav>
      <button
        onClick={onConnect}
        disabled={connecting}
        className="font-body text-sm font-medium px-4 py-2 rounded-lg bg-signal text-ink hover:brightness-110 transition disabled:opacity-60"
      >
        {connecting ? "Connecting..." : address ? shortenAddress(address) : "Connect wallet"}
      </button>
    </header>
  );
}
