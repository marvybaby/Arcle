import { useState, useCallback } from "react";
import { parseUnits } from "ethers";
import Header from "./components/Header";
import Hero from "./components/Hero";
import MarketsGrid from "./components/MarketsGrid";
import MyBets from "./components/MyBets";
import AgentFeed from "./components/AgentFeed";
import Footer from "./components/Footer";
import BetModal from "./components/BetModal";
import CreateMarketModal from "./components/CreateMarketModal";
import { connectWallet, getContracts } from "./lib/web3";

export default function App() {
  const [address, setAddress] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [betTarget, setBetTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  async function handleConnect() {
    if (address) return;
    setConnecting(true);
    try {
      const { signer: s, address: a } = await connectWallet();
      setSigner(s);
      setAddress(a);
    } catch (e) {
      alert(e.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleBetClick(market) {
    if (!signer) {
      await handleConnect();
      return;
    }
    setBetTarget(market);
  }

  async function handleBetSubmit(marketId, outcomeIndex, amount) {
    const { market } = getContracts(signer);
    const tx = await market.placeBet(marketId, outcomeIndex, {
      value: parseUnits(amount, 18),
    });
    await tx.wait();
    refresh();
  }

  async function handleCreateClick() {
    if (!signer) {
      await handleConnect();
      return;
    }
    setCreateOpen(true);
  }

  async function handleCreateSubmit(question, outcomes, endTime) {
    const { market } = getContracts(signer);
    const tx = await market.createMarket(question, outcomes, endTime);
    await tx.wait();
    refresh();
  }

  return (
    <div className="min-h-screen bg-ink font-body">
      <Header onConnect={handleConnect} address={address} connecting={connecting} />
      <Hero refreshTick={refreshTick} />
      <MarketsGrid onBet={handleBetClick} onCreateClick={handleCreateClick} refreshTick={refreshTick} />
      <MyBets address={address} signer={signer} refreshTick={refreshTick} onClaim={refresh} />
      <AgentFeed refreshTick={refreshTick} />
      <Footer />
      <BetModal market={betTarget} onClose={() => setBetTarget(null)} onSubmit={handleBetSubmit} />
      <CreateMarketModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreateSubmit} />
    </div>
  );
}
