export const CONTRACTS = {
  mockUSDC: process.env.NEXT_PUBLIC_MOCK_USDC ?? "",
  cUSDC: process.env.NEXT_PUBLIC_CUSDC ?? "",
  market: process.env.NEXT_PUBLIC_MARKET ?? "",
  vault: process.env.NEXT_PUBLIC_VAULT ?? "",
  registry: process.env.NEXT_PUBLIC_QUALIFICATION_REGISTRY ?? "",
  groth16Verifier: process.env.NEXT_PUBLIC_GROTH16_VERIFIER ?? ""
};

export const REGISTRY_MODE = process.env.NEXT_PUBLIC_REGISTRY_MODE ?? "groth16";
export const ZK_ASSET_THRESHOLD = process.env.NEXT_PUBLIC_ZK_ASSET_THRESHOLD ?? "1000000000000";
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "localhost";

export const MOCK_USDC_ABI = [
  "function mint(address to,uint256 amount)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
] as const;

export const CUSDC_ABI = [
  "function wrap(address to,uint256 amount)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function confidentialTransferAndCall(address to,bytes32 encryptedAmount,bytes inputProof,bytes data) returns (bytes32)"
] as const;

export const MARKET_ABI = [
  "function getProducts() view returns (tuple(uint256 id,string name,string category,string issuer,uint16 currentAprBps,uint48 lastRateUpdate,bool active)[])",
  "function listProduct(string name,string category,string issuer,uint16 aprBps) returns (uint256)",
  "function publishYieldRate(uint256 productId,uint16 aprBps)",
  "function depositCountByProduct(uint256 productId) view returns (uint64)"
] as const;

export const REGISTRY_ABI = [
  "function isQualified(address account) view returns (bool)",
  "function submitDemoProof(bytes32 proofCommitment)",
  "function registerCommitment(uint256 commitment)",
  "function validCommitments(uint256 commitment) view returns (bool)",
  "function proveQualified(uint256[2] a,uint256[2][2] b,uint256[2] c,uint256[4] input)"
] as const;

export const VAULT_ABI = [
  "function accrueReward(address user,uint256 productId,uint64 periods)",
  "function requestDecryptReward(uint256 productId)",
  "function getEncryptedPrincipal(address user,uint256 productId) view returns (bytes32)",
  "function getEncryptedReward(address user,uint256 productId) view returns (bytes32)",
  "function claimReward(uint256 productId)",
  "function totalDepositEvents() view returns (uint64)",
  "function totalClaimEvents() view returns (uint64)"
] as const;

export type Product = {
  id: bigint;
  name: string;
  category: string;
  issuer: string;
  currentAprBps: number;
  lastRateUpdate: bigint;
  active: boolean;
};

export type Groth16ProofPayload = {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  public_inputs: [string, string, string, string];
  proof_compressed_hex: string;
  commitment: string;
  threshold: string;
  user: string;
  nullifier_hash: string;
  salt: string;
};

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 0n,
    name: "US Treasury Bills",
    category: "Government Bonds",
    issuer: "Treasury Desk",
    currentAprBps: 520,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 1n,
    name: "Tokenized Real Estate Income",
    category: "Real Estate",
    issuer: "Urban Yield SPV",
    currentAprBps: 740,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 2n,
    name: "ETH Validator Yield",
    category: "Staking",
    issuer: "Validator Pool",
    currentAprBps: 390,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 3n,
    name: "BTC Mining Cashflow",
    category: "Mining",
    issuer: "Hashrate Coop",
    currentAprBps: 1180,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 4n,
    name: "Private Credit Notes",
    category: "Private Credit",
    issuer: "Credit Originator",
    currentAprBps: 910,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 5n,
    name: "Stablecoin Basis Strategy",
    category: "Market Neutral",
    issuer: "Basis Desk",
    currentAprBps: 680,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 6n,
    name: "DeFi Lending Basket",
    category: "DeFi Credit",
    issuer: "Lending Allocator",
    currentAprBps: 570,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 7n,
    name: "GPU Compute Revenue",
    category: "Compute",
    issuer: "AI Infra Pool",
    currentAprBps: 1320,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 8n,
    name: "Dividend Equity Basket",
    category: "Public Equity",
    issuer: "Dividend Desk",
    currentAprBps: 480,
    lastRateUpdate: 0n,
    active: true
  },
  {
    id: 9n,
    name: "Tokenized Money Market",
    category: "Money Market",
    issuer: "Liquidity Desk",
    currentAprBps: 445,
    lastRateUpdate: 0n,
    active: true
  }
];
