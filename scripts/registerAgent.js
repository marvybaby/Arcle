// Registers Arcle's AI agent with an onchain identity via Arc's ERC-8004 IdentityRegistry.
// Run with: npx hardhat run scripts/registerAgent.js --network arc

const hre = require("hardhat");

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

// TODO: replace with a real IPFS URI once agent-metadata.json is uploaded
// (e.g. via Pinata or NFT.Storage). Using a placeholder is fine for the hackathon
// submission if you're short on time.
const METADATA_URI =
  process.env.METADATA_URI ||
  "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei";

const IDENTITY_ABI = [
  "function register(string metadataURI) returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log(`Registering Arcle agent identity from: ${signer.address}\n`);

  const identity = new hre.ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, signer);

  console.log(`Metadata URI: ${METADATA_URI}`);
  const tx = await identity.register(METADATA_URI);
  console.log(`Tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log("✅ Registration confirmed\n");

  // Pull the agent's tokenId from the Transfer event in this tx's receipt
  const transferLog = receipt.logs
    .map((log) => {
      try {
        return identity.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "Transfer");

  if (!transferLog) {
    console.log("Could not find Transfer event — check the tx on ArcScan manually.");
    return;
  }

  const agentId = transferLog.args.tokenId.toString();
  const owner = await identity.ownerOf(agentId);
  const tokenURI = await identity.tokenURI(agentId);

  console.log("--- Agent Identity ---");
  console.log(`Agent ID:     ${agentId}`);
  console.log(`Owner:        ${owner}`);
  console.log(`Metadata URI: ${tokenURI}`);
  console.log(`\nSave the Agent ID above — reference it in your deck/demo as Arcle's onchain identity.`);
  console.log(`View on ArcScan: https://testnet.arcscan.app/tx/${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });