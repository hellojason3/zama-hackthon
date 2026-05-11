"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {AbiCoder, BrowserProvider, Contract, formatUnits, getAddress, hexlify, id, parseUnits} from "ethers";
import {
  CONTRACTS,
  CUSDC_ABI,
  FALLBACK_PRODUCTS,
  Groth16ProofPayload,
  MARKET_ABI,
  MOCK_USDC_ABI,
  Product,
  REGISTRY_ABI,
  REGISTRY_MODE,
  VAULT_ABI,
  ZK_ASSET_THRESHOLD
} from "@/lib/contracts";

type EthereumProvider = {
  request(args: {method: string; params?: unknown[]}): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type WizardStage =
  | "intro"
  | "wallet"
  | "products"
  | "qualify"
  | "mint"
  | "wrap"
  | "deposit"
  | "yield"
  | "claim"
  | "complete";
type Locale = "en" | "zh";
type Theme = "light" | "dark";
type RelayerModule = typeof import("@zama-fhe/relayer-sdk/web");
type RelayerInstance = Awaited<ReturnType<RelayerModule["createInstance"]>>;
type DemoLog = {id: number; message: string};
type BalanceHistoryEntry = {
  id: string;
  label: string;
  handle: string;
  contractAddress: string;
  createdAt: number;
  txHash?: string;
  plain?: string;
};

const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const txExplorerUrl = (txHash?: string) => (txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : "");

const PRODUCT_ZH: Record<number, {name: string; category: string; issuer: string}> = {
  0: {name: "美国短期国债", category: "政府债券", issuer: "国债策略台"},
  1: {name: "代币化房地产收入", category: "房地产", issuer: "城市收益 SPV"},
  2: {name: "ETH 验证者收益", category: "质押", issuer: "验证者资金池"},
  3: {name: "BTC 挖矿现金流", category: "挖矿", issuer: "算力合作池"},
  4: {name: "私募信贷票据", category: "私募信贷", issuer: "信贷发行方"},
  5: {name: "稳定币基差策略", category: "市场中性", issuer: "基差策略台"},
  6: {name: "DeFi 借贷组合", category: "DeFi 信贷", issuer: "借贷配置器"},
  7: {name: "GPU 算力收入", category: "算力", issuer: "AI 基础设施池"},
  8: {name: "股息股票组合", category: "公开股票", issuer: "股息策略台"},
  9: {name: "代币化货币市场", category: "货币市场", issuer: "流动性策略台"}
};

const COPY = {
  en: {
    eyebrow: "Confidential Qualified Yield Market",
    connectWallet: "Connect Wallet",
    controls: {light: "Light", dark: "Dark", english: "EN", chinese: "中文"},
    nav: {slides: "Slides", docs: "Docs", config: "Config"},
    wizard: {
      start: "Start",
      back: "Back",
      continue: "Continue",
      startOver: "Start Over",
      connected: "Connected wallet",
      notConnected: "Wallet not connected",
      selected: "Selected product",
      chooseProduct: "Choose this product",
      reviewConfig: "Deployment Config",
      viewDocs: "Project Docs",
      introTitle: "Private yield access, without public positions.",
      introBody:
        "Prove eligibility once, choose a public yield product, then keep allocation and reward amounts encrypted through the rest of the flow.",
      walletTitle: "Connect a wallet to begin",
      walletBody: "The demo uses your wallet to read Sepolia state, submit the qualification proof, and sign each product interaction.",
      productsTitle: "Choose a yield product",
      productsBody:
        "These products appear after qualification. In this demo the same public list is shown to every qualified wallet; later this gate can map different asset tiers to different product sets.",
      qualifyTitle: "Prove investor qualification",
      qualifyBody:
        "Generate a local asset-threshold proof, self-register its demo commitment, and submit it to the registry before allocating capital.",
      alreadyQualified: "This wallet is already qualified in the registry, so a new proof is not required for this demo run.",
      mintTitle: "Mint demo USDC",
      mintBody:
        "A fresh wallet may not have demo USDC. Mint mock USDC and approve the cUSDC wrapper, or use existing demo USDC if this wallet has already run the flow.",
      wrapTitle: "Wrap into confidential cUSDC",
      wrapBody: "Convert the approved demo USDC into cUSDC so later actions can use encrypted handles.",
      depositTitle: "Encrypt and allocate capital",
      depositBody: "The deposit amount is encrypted locally before being sent to the selected product vault.",
      yieldTitle: "Publish yield and settle reward",
      yieldBody: "For the demo, APR publishing is public and each user can settle their own encrypted reward.",
      claimTitle: "Decrypt and claim your reward",
      claimBody: "Authorize user decryption for the reward handle, inspect your own reward, then claim confidential cUSDC.",
      completeTitle: "Demo flow complete",
      completeBody: "You have walked through qualification, confidential allocation, encrypted reward accounting, and claim.",
      progress: {
        wallet: "Wallet",
        products: "Product",
        qualify: "Qualification",
        mint: "Mint",
        wrap: "cUSDC",
        deposit: "Allocation",
        yield: "Yield",
        claim: "Claim"
      }
    },
    intro: {
      kicker: "What this product is",
      title: "A private marketplace where qualified investors can access yield products without revealing their wealth or allocation size.",
      body:
        "Privyields combines ZK qualification and Zama FHE accounting: users prove they meet an asset threshold, wrap demo USDC into confidential cUSDC, allocate encrypted capital, and decrypt only their own rewards.",
      vision:
        "Our vision is a permissionless yield marketplace where issuers can launch products openly, while investor eligibility, positions, and rewards remain private by default."
    },
    metrics: {
      qualification: "Qualification",
      verified: "Verified",
      notVerified: "Not verified",
      threshold: "ZK threshold: assets >= 1,000,000 USDC",
      publicUsdc: "Public USDC",
      publicUsdcHint: "Only mock balance is public in this demo",
      selectedProduct: "Selected Product",
      contractMode: "Contract Mode",
      live: "Live",
      preview: "Preview",
      liveHint: "NEXT_PUBLIC addresses loaded",
      previewHint: "Set env addresses after deploy"
    },
    steps: {
      qualify: {
        label: "ZK asset gate",
        detail: "Generate a Groth16 proof that assets meet the threshold without revealing the balance."
      },
      wrap: {
        label: "Wrap to cUSDC",
        detail: "Move demo USDC into the confidential token rail so later balances use encrypted handles."
      },
      deposit: {
        label: "Encrypted allocation",
        detail: "Encrypt the deposit amount locally and route it to the selected product through cUSDC."
      },
      yield: {
        label: "Published yield",
        detail: "APR publishing is public for the demo, and the vault settles user rewards with FHE arithmetic."
      },
      claim: {
        label: "Encrypted claim",
        detail: "Authorize user decrypt for the reward handle, then claim the reward as confidential cUSDC."
      },
      pending: "Pending",
      done: "Done"
    },
    notice:
      "Why this split: ZK proves eligibility once, while FHE keeps every allocation and reward amount private across the rest of the workflow.",
    market: "Marketplace",
    yieldProducts: "Yield products",
    refresh: "Refresh",
    issueProduct: "Issue Product",
    hideIssuer: "Hide Form",
    issueProductTitle: "Launch a yield product",
    issueProductHint: "Any connected wallet can list a product. The product is public; future user allocations stay encrypted.",
    productName: "Product name",
    productCategory: "Category",
    issuerName: "Issuer name",
    initialAprBps: "Initial APR bps",
    createProduct: "Create Product",
    gate: "Gate",
    qualificationProof: "Qualification proof",
    passed: "Passed",
    required: "Required",
    zkAssetBalance: "Self-reported asset balance",
    zkSalt: "Private salt",
    generateProof: "Generate Arkworks Proof",
    registerCommitment: "Issuer Register Commitment",
    submitProof: "Submit Groth16 Proof",
    submitDemoProof: "Submit Demo ZK Proof",
    proofReady: "Proof ready",
    noProof: "No proof generated",
    assetRail: "Asset rail",
    mintApproveWrap: "Mint, approve, wrap",
    amount: "Amount",
    mintApprove: "Mint + Approve",
    useExistingUsdc: "Use Existing USDC",
    wrapCusdc: "Wrap cUSDC",
    allocation: "Allocation",
    encryptedDeposit: "Encrypted deposit",
    depositAmount: "Deposit amount",
    encryptDeposit: "Encrypt + Deposit",
    publisher: "Demo settlement",
    yieldUpdate: "Yield update",
    aprBps: "APR bps",
    periods: "Periods",
    publishAccrue: "Publish + Accrue",
    reward: "Reward",
    decryptClaim: "Decrypt and claim",
    refreshReward: "Refresh Reward",
    userDecrypt: "User Decrypt",
    claimCusdc: "Claim cUSDC",
    cusdcBalance: "cUSDC Balance",
    decryptCusdcBalance: "Decrypt cUSDC Balance",
    balanceHistory: "Balance History",
    balanceHistoryBody: "Encrypted cUSDC balance and reward snapshots recorded by this browser for the connected wallet.",
    decryptHistory: "Decrypt History",
    clearHistory: "Clear History",
    noRewardHandle: "No reward handle yet",
    noBalanceHandle: "No balance handle yet",
    noHistory: "No balance history recorded yet.",
    demoTape: "Demo tape",
    latestEvents: "Latest events",
    running: "Running",
    initialLog: "Open the app with deployed contract addresses in NEXT_PUBLIC_* env variables.",
    errors: {
      noWallet: "No injected wallet found.",
      installWallet: "Install a wallet to run the live demo.",
      requestDecrypt: "Request reward decryption first.",
      insufficientMockUSDC: "Not enough mock USDC. Mint more demo USDC or lower the amount.",
      wrongNetwork: "Switch your wallet to Ethereum Sepolia before using encrypted allocation.",
      commitmentRegistration:
        "The demo registry could not register this proof commitment. Generate a fresh proof and try again."
    },
    progress: {
      preparingRelayer: "Preparing Zama relayer",
      encryptingDeposit: "Encrypting deposit",
      submittingDeposit: "Submitting encrypted deposit",
      waitingDeposit: "Waiting for deposit confirmation"
    },
    logs: {
      connected: (address: string) => `Connected ${address}`,
      proofGenerated: "Arkworks Groth16 asset-threshold proof generated.",
      commitmentRegistered: "Asset commitment registered by issuer.",
      proofAccepted: "Groth16 asset-threshold proof accepted by registry.",
      demoProofAccepted: "Demo ZK asset-threshold proof accepted by registry.",
      minted: (amount: string) => `Minted and approved ${amount} mock USDC.`,
      existingUsdcReady: "Existing mock USDC is approved for wrapping.",
      existingUsdcApproved: (amount: string) => `Approved ${amount} existing mock USDC for wrapping.`,
      wrapped: "Wrapped public USDC into confidential cUSDC.",
      deposited: (product: string) => `Encrypted deposit routed to ${product}.`,
      accrued: (apr: string) => `Published ${apr} APR and accrued encrypted reward.`,
      accruedOnly: (apr: string) => `Accrued encrypted reward at the current ${apr} APR.`,
      decryptAllowed: "Reward handle is authorized for user decryption.",
      userDecryptDone: "User decrypt completed through the Zama relayer SDK.",
      claimed: "Encrypted reward claimed as cUSDC.",
      balanceDecrypted: "Confidential cUSDC balance decrypted.",
      historySnapshot: (label: string) => `History snapshot recorded: ${label}.`,
      historyDecrypted: (count: number) => `Decrypted ${count} history item${count === 1 ? "" : "s"} with one wallet signature.`,
      productIssued: (name: string) => `Product listed: ${name}.`
    },
    historyLabels: {
      afterWrap: "Wallet balance: after wrap",
      afterAllocation: "Wallet balance: after deposit",
      reward: "Reward amount",
      afterClaim: "Wallet balance: after claim"
    }
  },
  zh: {
    eyebrow: "隐私合格投资收益市场",
    connectWallet: "连接钱包",
    controls: {light: "日间", dark: "夜间", english: "EN", chinese: "中文"},
    nav: {slides: "介绍 Slide", docs: "工程文档", config: "部署配置"},
    wizard: {
      start: "开始",
      back: "上一步",
      continue: "继续",
      startOver: "重新开始",
      connected: "已连接钱包",
      notConnected: "尚未连接钱包",
      selected: "已选择产品",
      chooseProduct: "选择这个产品",
      reviewConfig: "部署配置",
      viewDocs: "工程文档",
      introTitle: "让合格投资人访问收益产品，但不公开仓位。",
      introBody: "用户只需要证明一次准入资格，选择公开收益产品后，配置金额和收益金额在后续流程里保持加密。",
      walletTitle: "先连接钱包",
      walletBody: "Demo 会用你的钱包读取 Sepolia 状态、提交资格证明，并签署每一步产品交互。",
      productsTitle: "选择一个收益产品",
      productsBody: "这些产品会在资格验证后展示。当前 demo 对所有通过资格的钱包展示同一组公开产品；后续可以根据不同资产等级展示不同产品集合。",
      qualifyTitle: "证明投资人资格",
      qualifyBody: "先在本地生成资产门槛 proof，公开登记 demo commitment，再提交到 registry，通过后才能配置资金。",
      alreadyQualified: "这个钱包已经在 registry 中通过资格验证，所以本次 demo 不需要重新提交 proof。",
      mintTitle: "铸造 demo USDC",
      mintBody: "新钱包通常没有 demo USDC。可以铸造 mock USDC 并授权 cUSDC wrapper；如果这个钱包已经跑过流程，也可以直接使用已有 demo USDC。",
      wrapTitle: "包装成 confidential cUSDC",
      wrapBody: "把已授权的 demo USDC 转成 cUSDC，后续操作会使用加密 handle。",
      depositTitle: "加密并配置资金",
      depositBody: "存款金额会在本地加密，然后发送到选中的收益产品 vault。",
      yieldTitle: "发布收益率并结算 reward",
      yieldBody: "为了让 demo 可自助完成，APR 发布是公开的，并且用户可以为自己的仓位完成加密收益结算。",
      claimTitle: "解密并提取收益",
      claimBody: "授权 reward handle 给自己解密，查看自己的收益，然后提取 confidential cUSDC。",
      completeTitle: "Demo 流程完成",
      completeBody: "你已经完成了资格证明、隐私配置、加密收益记账和收益提取。",
      progress: {
        wallet: "钱包",
        products: "产品",
        qualify: "资格",
        mint: "铸造",
        wrap: "cUSDC",
        deposit: "配置",
        yield: "收益",
        claim: "提取"
      }
    },
    intro: {
      kicker: "产品一句话",
      title: "一个面向合格投资人的隐私收益市场：用户可以证明自己有资格参与，但不暴露资产规模和配置金额。",
      body:
        "Privyields 把 ZK 资格证明和 Zama FHE 记账结合起来：用户证明资产满足门槛，把 demo USDC 包装为 confidential cUSDC，加密配置资金，并只解密自己的收益。",
      vision:
        "我们的愿景是一个 permissionless 的收益产品市场：发行方可以开放创建产品，投资人的资格、仓位和收益默认保持隐私。"
    },
    metrics: {
      qualification: "资格状态",
      verified: "已验证",
      notVerified: "未验证",
      threshold: "ZK 门槛：资产 >= 1,000,000 USDC",
      publicUsdc: "公开 USDC",
      publicUsdcHint: "Demo 中只有 mock 余额是公开的",
      selectedProduct: "当前产品",
      contractMode: "合约模式",
      live: "实时",
      preview: "预览",
      liveHint: "已加载 NEXT_PUBLIC 合约地址",
      previewHint: "部署后设置环境变量地址"
    },
    steps: {
      qualify: {
        label: "ZK 资产门槛",
        detail: "生成 Groth16 proof，证明资产满足门槛，但不披露具体余额。"
      },
      wrap: {
        label: "包装为 cUSDC",
        detail: "把 demo USDC 放入 confidential token rail，后续余额用加密 handle 表示。"
      },
      deposit: {
        label: "加密配置",
        detail: "在本地加密存款金额，并通过 cUSDC 路由到选中的收益产品。"
      },
      yield: {
        label: "收益发布",
        detail: "Demo 中 APR 发布公开可调用，vault 使用 FHE 算术为用户结算加密收益。"
      },
      claim: {
        label: "加密提款",
        detail: "授权用户解密 reward handle，然后把收益作为 confidential cUSDC 提取。"
      },
      pending: "待完成",
      done: "已完成"
    },
    notice: "为什么要分层：ZK 只负责一次性证明准入资格；之后的配置金额和收益金额都由 FHE 保持隐私。",
    market: "市场",
    yieldProducts: "收益产品",
    refresh: "刷新",
    issueProduct: "发行产品",
    hideIssuer: "收起表单",
    issueProductTitle: "创建收益产品",
    issueProductHint: "任意已连接钱包都可以发行产品。产品信息是公开的，但后续用户配置金额保持加密。",
    productName: "产品名称",
    productCategory: "产品类别",
    issuerName: "发行方名称",
    initialAprBps: "初始 APR bps",
    createProduct: "创建产品",
    gate: "准入",
    qualificationProof: "资格证明",
    passed: "已通过",
    required: "需要验证",
    zkAssetBalance: "自报资产余额",
    zkSalt: "私密 salt",
    generateProof: "生成 Arkworks Proof",
    registerCommitment: "发行方登记 Commitment",
    submitProof: "提交 Groth16 Proof",
    submitDemoProof: "提交 Demo ZK 证明",
    proofReady: "Proof 已生成",
    noProof: "尚未生成 proof",
    assetRail: "资产通道",
    mintApproveWrap: "铸造、授权、包装",
    amount: "金额",
    mintApprove: "铸造 + 授权",
    useExistingUsdc: "使用现有 USDC",
    wrapCusdc: "包装 cUSDC",
    allocation: "配置",
    encryptedDeposit: "加密存款",
    depositAmount: "存款金额",
    encryptDeposit: "加密 + 存入",
    publisher: "Demo 结算",
    yieldUpdate: "收益更新",
    aprBps: "APR bps",
    periods: "周期",
    publishAccrue: "发布 + 结算",
    reward: "收益",
    decryptClaim: "解密和提款",
    refreshReward: "刷新 Reward",
    userDecrypt: "用户解密",
    claimCusdc: "提取 cUSDC",
    cusdcBalance: "cUSDC 余额",
    decryptCusdcBalance: "解密 cUSDC 余额",
    balanceHistory: "余额历史",
    balanceHistoryBody: "当前浏览器为已连接钱包记录的加密 cUSDC 余额和 reward 快照。",
    decryptHistory: "解密历史",
    clearHistory: "清空历史",
    noRewardHandle: "还没有 reward handle",
    noBalanceHandle: "还没有余额 handle",
    noHistory: "还没有记录余额历史。",
    demoTape: "Demo 记录",
    latestEvents: "最新事件",
    running: "执行中",
    initialLog: "请使用 NEXT_PUBLIC_* 环境变量中的部署地址打开应用。",
    errors: {
      noWallet: "没有检测到浏览器钱包。",
      installWallet: "请安装钱包以运行 live demo。",
      requestDecrypt: "请先请求 reward 解密授权。",
      insufficientMockUSDC: "Mock USDC 余额不足。请铸造更多 demo USDC，或降低金额。",
      wrongNetwork: "请先把钱包切换到 Ethereum Sepolia，再执行加密配置。",
      commitmentRegistration: "Demo registry 无法登记这个 proof commitment。请重新生成 proof 后再试。"
    },
    progress: {
      preparingRelayer: "准备 Zama relayer",
      encryptingDeposit: "正在加密存款",
      submittingDeposit: "提交加密存款",
      waitingDeposit: "等待存款确认"
    },
    logs: {
      connected: (address: string) => `已连接 ${address}`,
      proofGenerated: "Arkworks Groth16 资产门槛 proof 已生成。",
      commitmentRegistered: "资产 commitment 已由发行方登记。",
      proofAccepted: "Groth16 资产门槛证明已被 registry 接受。",
      demoProofAccepted: "Demo ZK 资产门槛证明已被 registry 接受。",
      minted: (amount: string) => `已铸造并授权 ${amount} mock USDC。`,
      existingUsdcReady: "现有 mock USDC 已有足够授权，可以包装。",
      existingUsdcApproved: (amount: string) => `已授权 ${amount} 现有 mock USDC 用于包装。`,
      wrapped: "已将公开 USDC 包装为 confidential cUSDC。",
      deposited: (product: string) => `加密存款已路由到 ${product}。`,
      accrued: (apr: string) => `已发布 ${apr} APR，并完成加密收益结算。`,
      accruedOnly: (apr: string) => `已按当前 ${apr} APR 完成加密收益结算。`,
      decryptAllowed: "Reward handle 已授权给用户解密。",
      userDecryptDone: "用户已通过 Zama relayer SDK 完成解密。",
      claimed: "加密 reward 已作为 cUSDC 提取。",
      balanceDecrypted: "Confidential cUSDC 余额已解密。",
      historySnapshot: (label: string) => `已记录历史快照：${label}。`,
      historyDecrypted: (count: number) => `已用一次钱包签名解密 ${count} 条历史记录。`,
      productIssued: (name: string) => `产品已发行：${name}。`
    },
    historyLabels: {
      afterWrap: "钱包余额：Wrap 后",
      afterAllocation: "钱包余额：Deposit 后",
      reward: "收益金额",
      afterClaim: "钱包余额：Claim 后"
    }
  }
} as const;

const formatApr = (bps: number) => `${(bps / 100).toFixed(2)}%`;
const shorten = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;
const configured = [CONTRACTS.mockUSDC, CONTRACTS.cUSDC, CONTRACTS.market, CONTRACTS.vault, CONTRACTS.registry].every(Boolean);
const normalizeAddress = (address: string) => getAddress(address.trim());

function stringifyResult(value: unknown) {
  return JSON.stringify(value, (_key, inner) => (typeof inner === "bigint" ? inner.toString() : inner)) ?? String(value);
}

function formatDecryptionResult(result: unknown, handle: string) {
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    const value = record[handle] ?? record[handle.toLowerCase()] ?? Object.values(record)[0];

    if (typeof value === "bigint") return `${formatUnits(value, 6)} cUSDC`;
    if (typeof value === "number" && Number.isInteger(value)) return `${formatUnits(BigInt(value), 6)} cUSDC`;
    if (typeof value === "string" && /^\d+$/.test(value)) return `${formatUnits(BigInt(value), 6)} cUSDC`;
    if (value !== undefined) return stringifyResult(value);
  }

  return stringifyResult(result);
}

function statusClass(active: boolean) {
  return active ? "status statusActive" : "status";
}

function localizeProduct(product: Product, locale: Locale) {
  if (locale === "en") return product;
  return {...product, ...(PRODUCT_ZH[Number(product.id)] ?? {})};
}

function toBigInt(value: unknown, fallback = 0n) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return fallback;
}

function normalizeProduct(product: unknown): Product {
  const record = product as Record<string, unknown>;
  const tuple = product as readonly unknown[];

  return {
    id: toBigInt(record.id ?? tuple[0]),
    name: String(record.name ?? tuple[1] ?? ""),
    category: String(record.category ?? tuple[2] ?? ""),
    issuer: String(record.issuer ?? tuple[3] ?? ""),
    currentAprBps: Number(record.currentAprBps ?? tuple[4] ?? 0),
    lastRateUpdate: toBigInt(record.lastRateUpdate ?? tuple[5]),
    active: Boolean(record.active ?? tuple[6] ?? true)
  };
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [wizardStage, setWizardStage] = useState<WizardStage>("intro");
  const [account, setAccount] = useState("");
  const [qualified, setQualified] = useState(false);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [mintAmount, setMintAmount] = useState("1000000");
  const [depositAmount, setDepositAmount] = useState("250000");
  const [aprBps, setAprBps] = useState(650);
  const [periods, setPeriods] = useState(1);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [encryptedRewardHandle, setEncryptedRewardHandle] = useState("");
  const [decryptedReward, setDecryptedReward] = useState("");
  const [encryptedCUSDCBalanceHandle, setEncryptedCUSDCBalanceHandle] = useState("");
  const [decryptedCUSDCBalance, setDecryptedCUSDCBalance] = useState("");
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryEntry[]>([]);
  const [zkAssetBalance, setZkAssetBalance] = useState("1500000");
  const [zkSalt, setZkSalt] = useState("123456789");
  const [zkProof, setZkProof] = useState<Groth16ProofPayload | null>(null);
  const [showIssueProduct, setShowIssueProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductIssuer, setNewProductIssuer] = useState("");
  const [newProductAprBps, setNewProductAprBps] = useState(500);
  const [hasMinted, setHasMinted] = useState(false);
  const [hasWrapped, setHasWrapped] = useState(false);
  const [hasDeposited, setHasDeposited] = useState(false);
  const [hasAccrued, setHasAccrued] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [log, setLog] = useState<DemoLog[]>([{id: 0, message: COPY.en.initialLog}]);
  const [busy, setBusy] = useState("");
  const [actionNote, setActionNote] = useState("");
  const logIdRef = useRef(1);
  const providerRef = useRef<{ethereum: EthereumProvider; provider: BrowserProvider} | null>(null);
  const relayerRef = useRef<{account: string; chainId: string; instance: RelayerInstance} | null>(null);
  const t = COPY[locale];

  const currentProduct = useMemo(
    () => products.find((product) => Number(product.id) === selectedProduct) ?? products[0],
    [products, selectedProduct]
  );
  const currentProductView = localizeProduct(currentProduct, locale);
  const canUseExistingUSDC = useMemo(() => {
    try {
      return parseUnits(usdcBalance || "0", 6) >= parseUnits(mintAmount || "0", 6);
    } catch {
      return false;
    }
  }, [mintAmount, usdcBalance]);
  const historyStorageKey = useMemo(
    () => (account && CONTRACTS.cUSDC ? `privyields:history:${normalizeAddress(account)}:${normalizeAddress(CONTRACTS.cUSDC)}` : ""),
    [account]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale, theme]);

  useEffect(() => {
    if (!historyStorageKey) {
      setBalanceHistory([]);
      return;
    }

    try {
      const stored = window.localStorage.getItem(historyStorageKey);
      setBalanceHistory(stored ? (JSON.parse(stored) as BalanceHistoryEntry[]) : []);
    } catch {
      setBalanceHistory([]);
    }
  }, [historyStorageKey]);

  const provider = async () => {
    if (!window.ethereum) throw new Error(t.errors.noWallet);
    if (providerRef.current?.ethereum === window.ethereum) {
      return providerRef.current.provider;
    }

    const nextProvider = new BrowserProvider(window.ethereum);
    providerRef.current = {ethereum: window.ethereum, provider: nextProvider};
    return nextProvider;
  };

  const signer = async () => (await provider()).getSigner();

  const pushLog = (line: string) => {
    setLog((items) => [{id: logIdRef.current++, message: line}, ...items].slice(0, 8));
  };

  const persistBalanceHistory = (next: BalanceHistoryEntry[]) => {
    setBalanceHistory(next);
    if (historyStorageKey) {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
    }
  };

  const appendBalanceHistory = (entry: BalanceHistoryEntry) => {
    setBalanceHistory((items) => {
      const next = [entry, ...items.filter((item) => item.handle !== entry.handle)].slice(0, 20);
      if (historyStorageKey) {
        window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
      }
      return next;
    });
    pushLog(t.logs.historySnapshot(entry.label));
  };

  const clearBalanceHistory = () => {
    persistBalanceHistory([]);
    if (historyStorageKey) {
      window.localStorage.removeItem(historyStorageKey);
    }
  };

  const displayHistoryLabel = (label: string) => {
    const legacyRewardPrefix = locale === "zh" ? "Reward handle:" : "Reward handle:";
    if (label === "包装后" || label === "After wrap") return t.historyLabels.afterWrap;
    if (label === "配置后" || label === "After allocation") return t.historyLabels.afterAllocation;
    if (label === "Claim 后" || label === "After claim") return t.historyLabels.afterClaim;
    if (label.startsWith(legacyRewardPrefix)) return label.replace(legacyRewardPrefix, `${t.historyLabels.reward}:`);
    return label;
  };

  const run = async (label: string, action: () => Promise<void>) => {
    try {
      setBusy(label);
      setActionNote("");
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setActionNote(message);
      pushLog(message);
    } finally {
      setBusy("");
    }
  };

  const readContracts = async (address = account) => {
    if (!configured || !address) return;
    const readProvider = await provider();
    const mockUSDC = new Contract(CONTRACTS.mockUSDC, MOCK_USDC_ABI, readProvider);
    const market = new Contract(CONTRACTS.market, MARKET_ABI, readProvider);
    const registry = new Contract(CONTRACTS.registry, REGISTRY_ABI, readProvider);

    const [balance, remoteProducts, isQualified] = await Promise.all([
      mockUSDC.balanceOf(address),
      market.getProducts(),
      registry.isQualified(address)
    ]);

    setUsdcBalance(formatUnits(balance, 6));
    setProducts(remoteProducts.map(normalizeProduct));
    setQualified(isQualified);
  };

  const recordCUSDCBalanceSnapshot = async (label: string, txHash?: string) => {
    if (!configured || !account) return;
    const userAddress = normalizeAddress(account);
    const cUSDCAddress = normalizeAddress(CONTRACTS.cUSDC);
    const cUSDC = new Contract(cUSDCAddress, CUSDC_ABI, await provider());
    const handle = await cUSDC.confidentialBalanceOf(userAddress);
    if (!handle || /^0x0+$/.test(handle)) return;

    appendBalanceHistory({
      id: `${Date.now()}-${label}`,
      label,
      handle,
      contractAddress: cUSDCAddress,
      createdAt: Date.now(),
      txHash
    });
  };

  const issueProduct = () =>
    run("issue product", async () => {
      const name = newProductName.trim();
      const category = newProductCategory.trim();
      const issuer = newProductIssuer.trim() || (account ? shorten(account) : "Community issuer");

      if (!name) throw new Error(t.productName);
      if (!category) throw new Error(t.productCategory);

      const market = new Contract(CONTRACTS.market, MARKET_ABI, await signer());
      const tx = await market.listProduct(name, category, issuer, newProductAprBps);
      await tx.wait();
      await readContracts();
      setSelectedProduct(products.length);
      setNewProductName("");
      setNewProductCategory("");
      setNewProductIssuer("");
      setNewProductAprBps(500);
      setShowIssueProduct(false);
      pushLog(t.logs.productIssued(name));
    });

  const getRelayerInstance = async () => {
    if (!window.ethereum) throw new Error(t.errors.noWallet);
    let chainId = (await window.ethereum.request({method: "eth_chainId"})) as string;

    if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID_HEX) {
      try {
        await window.ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: SEPOLIA_CHAIN_ID_HEX}]});
        chainId = (await window.ethereum.request({method: "eth_chainId"})) as string;
      } catch {
        throw new Error(t.errors.wrongNetwork);
      }
    }

    if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID_HEX) throw new Error(t.errors.wrongNetwork);

    if (relayerRef.current?.account === account && relayerRef.current.chainId === chainId) {
      return relayerRef.current.instance;
    }

    const relayer = await import("@zama-fhe/relayer-sdk/web");
    await relayer.initSDK();
    const instance = await relayer.createInstance({...relayer.SepoliaConfig, network: window.ethereum as never});
    relayerRef.current = {account, chainId, instance};
    return instance;
  };

  const connectWallet = () =>
    run("wallet", async () => {
      if (!window.ethereum) throw new Error(t.errors.installWallet);
      const accounts = (await window.ethereum.request({method: "eth_requestAccounts"})) as string[];
      const connectedAccount = normalizeAddress(accounts[0] ?? "");
      setAccount(connectedAccount);
      setZkProof(null);
      setQualified(false);
      setHasMinted(false);
      setHasWrapped(false);
      setHasDeposited(false);
      setHasAccrued(false);
      setHasClaimed(false);
      setEncryptedRewardHandle("");
      setDecryptedReward("");
      setEncryptedCUSDCBalanceHandle("");
      setDecryptedCUSDCBalance("");
      relayerRef.current = null;
      pushLog(t.logs.connected(shorten(connectedAccount)));
      await readContracts(connectedAccount);
      setWizardStage("qualify");
    });

  const generateQualificationProof = () =>
    run("zk prove", async () => {
      if (!account) throw new Error(t.errors.noWallet);
      const response = await fetch("/api/zk/prove", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          user: account,
          balance: parseUnits(zkAssetBalance || "0", 6).toString(),
          threshold: ZK_ASSET_THRESHOLD,
          salt: zkSalt || "0"
        })
      });
      const proof = (await response.json()) as Groth16ProofPayload & {error?: string};
      if (!response.ok || proof.error) {
        throw new Error(proof.error || "proof generation failed");
      }
      setZkProof(proof);
      pushLog(t.logs.proofGenerated);
    });

  const ensureCommitmentRegistered = async (registry: Contract, commitment: string) => {
    const isRegistered = await registry.validCommitments(commitment);
    if (isRegistered) return;

    try {
      const tx = await registry.registerCommitment(commitment);
      await tx.wait();
      pushLog(t.logs.commitmentRegistered);
    } catch (error) {
      throw new Error(error instanceof Error ? `${t.errors.commitmentRegistration} ${error.message}` : t.errors.commitmentRegistration);
    }
  };

  const submitQualification = () =>
    run("qualification", async () => {
      const registry = new Contract(CONTRACTS.registry, REGISTRY_ABI, await signer());

      if (REGISTRY_MODE !== "groth16") {
        const proofCommitment = id(`${account}:assets>=1000000:${Date.now()}`);
        const tx = await registry.submitDemoProof(proofCommitment);
        await tx.wait();
        setQualified(true);
        setWizardStage("products");
        pushLog(t.logs.demoProofAccepted);
        return;
      }

      if (!zkProof) throw new Error(t.noProof);
      await ensureCommitmentRegistered(registry, zkProof.commitment);
      const tx = await registry.proveQualified(
        zkProof.proof.a,
        zkProof.proof.b,
        zkProof.proof.c,
        zkProof.public_inputs
      );
      await tx.wait();
      setQualified(true);
      setWizardStage("products");
      pushLog(t.logs.proofAccepted);
    });

  const mintAndApprove = () =>
    run("mint", async () => {
      const amount = parseUnits(mintAmount || "0", 6);
      const mockUSDC = new Contract(CONTRACTS.mockUSDC, MOCK_USDC_ABI, await signer());
      const mintTx = await mockUSDC.mint(account, amount);
      await mintTx.wait();
      const approveTx = await mockUSDC.approve(CONTRACTS.cUSDC, amount);
      await approveTx.wait();
      setHasMinted(true);
      await readContracts();
      setWizardStage("wrap");
      pushLog(t.logs.minted(mintAmount));
    });

  const useExistingUSDC = () =>
    run("approve existing", async () => {
      const amount = parseUnits(mintAmount || "0", 6);
      const mockUSDC = new Contract(CONTRACTS.mockUSDC, MOCK_USDC_ABI, await signer());
      const [balance, allowance] = await Promise.all([mockUSDC.balanceOf(account), mockUSDC.allowance(account, CONTRACTS.cUSDC)]);

      if (balance < amount) throw new Error(t.errors.insufficientMockUSDC);

      if (allowance < amount) {
        const approveTx = await mockUSDC.approve(CONTRACTS.cUSDC, amount);
        await approveTx.wait();
        pushLog(t.logs.existingUsdcApproved(mintAmount));
      } else {
        pushLog(t.logs.existingUsdcReady);
      }

      setHasMinted(true);
      await readContracts();
      setWizardStage("wrap");
    });

  const wrapUSDC = () =>
    run("wrap", async () => {
      const amount = parseUnits(mintAmount || "0", 6);
      const cUSDC = new Contract(CONTRACTS.cUSDC, CUSDC_ABI, await signer());
      const tx = await cUSDC.wrap(account, amount);
      await tx.wait();
      setHasWrapped(true);
      await readContracts();
      await recordCUSDCBalanceSnapshot(t.historyLabels.afterWrap, tx.hash);
      setWizardStage("deposit");
      pushLog(t.logs.wrapped);
    });

  const createEncryptedAmount = async (amount: bigint, userAddress: string, tokenAddress: string) => {
    const instance = await getRelayerInstance();
    const input = instance.createEncryptedInput(tokenAddress, userAddress).add64(amount);
    const encrypted = await input.encrypt();
    return {
      handle: hexlify(encrypted.handles[0]),
      inputProof: hexlify(encrypted.inputProof),
      instance
    };
  };

  const depositEncrypted = () =>
    run("deposit", async () => {
      setActionNote(t.progress.preparingRelayer);
      setBusy(t.progress.preparingRelayer);
      const userAddress = normalizeAddress(account);
      const cUSDCAddress = normalizeAddress(CONTRACTS.cUSDC);
      const vaultAddress = normalizeAddress(CONTRACTS.vault);
      const chainId = window.ethereum ? ((await window.ethereum.request({method: "eth_chainId"})) as string) : "";
      const amount = parseUnits(depositAmount || "0", 6);
      pushLog(`[debug] account=${userAddress}, chainId=${chainId}`);
      pushLog(`[debug] cUSDC=${shorten(cUSDCAddress)}, vault=${shorten(vaultAddress)}, product=${selectedProduct}, amount=${amount.toString()}`);
      setActionNote(t.progress.encryptingDeposit);
      setBusy(t.progress.encryptingDeposit);
      const encrypted = await createEncryptedAmount(amount, userAddress, cUSDCAddress);
      pushLog(`[debug] encrypted handle=${shorten(encrypted.handle)}, proofBytes=${Math.floor((encrypted.inputProof.length - 2) / 2)}`);
      const data = AbiCoder.defaultAbiCoder().encode(["uint256"], [selectedProduct]);
      const cUSDC = new Contract(cUSDCAddress, CUSDC_ABI, await signer());
      setActionNote(t.progress.submittingDeposit);
      setBusy(t.progress.submittingDeposit);
      const tx = await cUSDC["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        vaultAddress,
        encrypted.handle,
        encrypted.inputProof,
        data
      );
      pushLog(`[debug] deposit tx=${tx.hash}`);
      setActionNote(t.progress.waitingDeposit);
      setBusy(t.progress.waitingDeposit);
      await tx.wait();
      setHasDeposited(true);
      await readContracts();
      await recordCUSDCBalanceSnapshot(t.historyLabels.afterAllocation, tx.hash);
      setWizardStage("yield");
      pushLog(t.logs.deposited(currentProductView.name));
    });

  const recordRewardHandle = (handle: string, txHash?: string) => {
    if (!handle || /^0x0+$/.test(handle)) return;
    setEncryptedRewardHandle(handle);
    appendBalanceHistory({
      id: `${Date.now()}-${t.historyLabels.reward}`,
      label: `${t.historyLabels.reward}: ${currentProductView.name}`,
      handle,
      contractAddress: normalizeAddress(CONTRACTS.vault),
      createdAt: Date.now(),
      txHash
    });
  };

  const publishYieldAndAccrue = () =>
    run("yield", async () => {
      const writeSigner = await signer();
      const market = new Contract(CONTRACTS.market, MARKET_ABI, writeSigner);
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, writeSigner);
      const shouldPublishApr = Number(currentProduct.currentAprBps) !== Number(aprBps);

      if (shouldPublishApr) {
        const publishTx = await market.publishYieldRate(selectedProduct, aprBps);
        await publishTx.wait();
      }

      const accrueTx = await vault.accrueReward(account, selectedProduct, periods);
      await accrueTx.wait();
      const handle = await vault.getEncryptedReward(account, selectedProduct);
      recordRewardHandle(handle, accrueTx.hash);
      setHasAccrued(true);
      await readContracts();
      setWizardStage("claim");
      pushLog(shouldPublishApr ? t.logs.accrued(formatApr(aprBps)) : t.logs.accruedOnly(formatApr(currentProduct.currentAprBps)));
    });

  const refreshRewardHandle = () =>
    run("reward handle", async () => {
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, await provider());
      const handle = await vault.getEncryptedReward(account, selectedProduct);
      recordRewardHandle(handle);
      pushLog(t.logs.decryptAllowed);
    });

  const userDecryptEntries = async (entries: {id: string; handle: string; contractAddress: string}[]) => {
    const normalized = entries.map((entry) => ({
      ...entry,
      contractAddress: normalizeAddress(entry.contractAddress)
    }));
    const contractAddresses = Array.from(new Set(normalized.map((entry) => entry.contractAddress)));
    const userAddress = normalizeAddress(account);
    const instance = await getRelayerInstance();
    const keypair = instance.generateKeypair();
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 7;
    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
    const walletSigner = await signer();
    const signature = await walletSigner.signTypedData(
      eip712.domain as never,
      {UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification} as never,
      eip712.message as never
    );
    const result = await instance.userDecrypt(
      normalized.map(({handle, contractAddress}) => ({handle, contractAddress})),
      keypair.privateKey,
      keypair.publicKey,
      signature,
      contractAddresses,
      userAddress,
      startTimestamp,
      durationDays
    );
    return Object.fromEntries(normalized.map((entry) => [entry.id, formatDecryptionResult(result, entry.handle)]));
  };

  const userDecryptHandle = async (handle: string, contractAddress: string) => {
    const decrypted = await userDecryptEntries([{id: handle, handle, contractAddress}]);
    return decrypted[handle] ?? "";
  };

  const decryptReward = () =>
    run("user decrypt", async () => {
      if (!encryptedRewardHandle) throw new Error(t.errors.requestDecrypt);
      setDecryptedReward(await userDecryptHandle(encryptedRewardHandle, CONTRACTS.vault));
      pushLog(t.logs.userDecryptDone);
    });

  const decryptBalanceHistory = () =>
    run("history decrypt", async () => {
      const pending = balanceHistory.filter((entry) => !entry.plain);
      if (pending.length === 0) return;

      const decrypted = await userDecryptEntries(pending);
      const next = balanceHistory.map((entry) => (decrypted[entry.id] ? {...entry, plain: decrypted[entry.id]} : entry));
      persistBalanceHistory(next);
      pushLog(t.logs.historyDecrypted(pending.length));
    });

  const decryptCUSDCBalance = () =>
    run("cUSDC balance", async () => {
      const userAddress = normalizeAddress(account);
      const cUSDCAddress = normalizeAddress(CONTRACTS.cUSDC);
      const cUSDC = new Contract(cUSDCAddress, CUSDC_ABI, await provider());
      const handle = await cUSDC.confidentialBalanceOf(userAddress);
      setEncryptedCUSDCBalanceHandle(handle);
      setDecryptedCUSDCBalance(await userDecryptHandle(handle, cUSDCAddress));
      pushLog(t.logs.balanceDecrypted);
    });

  const claimReward = () =>
    run("claim", async () => {
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, await signer());
      const tx = await vault.claimReward(selectedProduct);
      await tx.wait();
      setHasClaimed(true);
      setEncryptedRewardHandle("");
      setEncryptedCUSDCBalanceHandle("");
      setDecryptedCUSDCBalance("");
      await recordCUSDCBalanceSnapshot(t.historyLabels.afterClaim, tx.hash);
      setWizardStage("complete");
      pushLog(t.logs.claimed);
    });

  const wizardFlow: {stage: WizardStage; label: string; done: boolean}[] = [
    {stage: "wallet", label: t.wizard.progress.wallet, done: Boolean(account)},
    {stage: "qualify", label: t.wizard.progress.qualify, done: qualified},
    {stage: "products", label: t.wizard.progress.products, done: !["wallet", "qualify", "products"].includes(wizardStage) && Boolean(account) && qualified},
    {stage: "mint", label: t.wizard.progress.mint, done: hasMinted},
    {stage: "wrap", label: t.wizard.progress.wrap, done: hasWrapped},
    {stage: "deposit", label: t.wizard.progress.deposit, done: hasDeposited},
    {stage: "yield", label: t.wizard.progress.yield, done: hasAccrued || Boolean(encryptedRewardHandle)},
    {stage: "claim", label: t.wizard.progress.claim, done: hasClaimed}
  ];
  const activeFlowIndex = wizardFlow.findIndex((step) => step.stage === wizardStage);
  const latestLog = log[0]?.message ?? t.initialLog;
  const canOpenWizardStep = (index: number, done: boolean) => wizardStage === "complete" || index <= activeFlowIndex || done;

  const goBack = () => {
    const flow: WizardStage[] = ["wallet", "qualify", "products", "mint", "wrap", "deposit", "yield", "claim", "complete"];
    const index = flow.indexOf(wizardStage);
    setWizardStage(index <= 0 ? "intro" : flow[index - 1]);
  };

  const productGrid = (
    <div className="productGrid wizardProductGrid">
      {products.map((product) => {
        const productView = localizeProduct(product, locale);
        return (
          <button
            aria-pressed={Number(product.id) === selectedProduct}
            className={Number(product.id) === selectedProduct ? "productCard selected" : "productCard"}
            key={String(product.id)}
            onClick={() => setSelectedProduct(Number(product.id))}
          >
            <span className={statusClass(product.active)}>{productView.category}</span>
            <strong>{productView.name}</strong>
            <small>{productView.issuer}</small>
            <span className="apr">{formatApr(product.currentAprBps)}</span>
          </button>
        );
      })}
    </div>
  );

  const selectedSummary = (
    <div className="selectedSummary">
      <span>{t.wizard.selected}</span>
      <strong>{currentProductView.name}</strong>
      <small>
        {currentProductView.category} · {formatApr(currentProduct.currentAprBps)}
      </small>
    </div>
  );

  const issuerForm = showIssueProduct ? (
    <div className="issuerForm">
      <div>
        <p className="eyebrow">{t.issueProductTitle}</p>
        <p>{t.issueProductHint}</p>
      </div>
      <div className="issuerGrid">
        <label>
          {t.productName}
          <input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} />
        </label>
        <label>
          {t.productCategory}
          <input value={newProductCategory} onChange={(event) => setNewProductCategory(event.target.value)} />
        </label>
        <label>
          {t.issuerName}
          <input value={newProductIssuer} onChange={(event) => setNewProductIssuer(event.target.value)} />
        </label>
        <label>
          {t.initialAprBps}
          <input
            type="number"
            min="0"
            max="10000"
            value={newProductAprBps}
            onChange={(event) => setNewProductAprBps(Number(event.target.value))}
          />
        </label>
      </div>
      <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={issueProduct}>
        {t.createProduct}
      </button>
    </div>
  ) : null;

  const wizardLog = wizardStage !== "intro" ? (
    <div className="wizardLog">
      <span>{busy ? `${t.running}: ${busy}` : t.latestEvents}</span>
      <p>{actionNote || latestLog}</p>
    </div>
  ) : null;

  const renderWizardStage = () => {
    if (wizardStage === "intro") {
      return (
        <section className="wizardHero">
          <div className="heroIntro">
            <img src="/priv.png" alt="Privyields logo" />
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>Privyields</h1>
            <h2>{t.wizard.introTitle}</h2>
            <p>{t.wizard.introBody}</p>
          </div>
          <div className="wizardActions">
            <button className="primaryButton" onClick={() => setWizardStage("wallet")}>
              {t.wizard.start}
            </button>
            <Link className="ghostButton" href="/slides">
              {t.nav.slides}
            </Link>
            <Link className="ghostButton" href="/docs">
              {t.wizard.viewDocs}
            </Link>
            <Link className="ghostButton" href="/config">
              {t.wizard.reviewConfig}
            </Link>
          </div>
        </section>
      );
    }

    if (wizardStage === "wallet") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.wizard.progress.wallet}</p>
          <h2>{t.wizard.walletTitle}</h2>
          <p>{t.wizard.walletBody}</p>
          <button className="primaryButton bigAction" onClick={connectWallet} disabled={busy === "wallet"}>
            {account ? shorten(account) : t.connectWallet}
          </button>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "products") {
      return (
        <section className="wizardPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.market}</p>
              <h2>{t.wizard.productsTitle}</h2>
            </div>
            <div className="headerActions">
              <button className="ghostButton" onClick={() => setShowIssueProduct((open) => !open)}>
                {showIssueProduct ? t.hideIssuer : t.issueProduct}
              </button>
              <button className="ghostButton" onClick={() => readContracts()} disabled={!account || busy !== ""}>
                {t.refresh}
              </button>
            </div>
          </div>
          <p className="wizardBody">{t.wizard.productsBody}</p>
          {issuerForm}
          {productGrid}
          <div className="wizardFooter">
            {selectedSummary}
            <button
              className="primaryButton"
              onClick={() => setWizardStage(hasMinted ? "wrap" : "mint")}
              disabled={!account || !qualified}
            >
              {t.wizard.chooseProduct}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "qualify") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.gate}</p>
          <h2>{t.wizard.qualifyTitle}</h2>
          <p>{t.wizard.qualifyBody}</p>
          <span className={qualified ? "pill good" : "pill"}>{qualified ? t.passed : t.required}</span>
          {qualified && <p className="wizardBody">{t.wizard.alreadyQualified}</p>}
          {REGISTRY_MODE === "groth16" && !qualified && (
            <>
              <div className="splitInputs">
                <label>
                  {t.zkAssetBalance}
                  <input value={zkAssetBalance} onChange={(event) => setZkAssetBalance(event.target.value)} />
                </label>
                <label>
                  {t.zkSalt}
                  <input value={zkSalt} onChange={(event) => setZkSalt(event.target.value)} />
                </label>
              </div>
              <div className="buttonRow">
                <button className="ghostButton" disabled={!configured || !account || busy !== ""} onClick={generateQualificationProof}>
                  {t.generateProof}
                </button>
              </div>
              <code className="handle">{zkProof ? `${t.proofReady}: ${shorten(zkProof.commitment)}` : t.noProof}</code>
            </>
          )}
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
            {qualified ? (
              <button className="primaryButton" onClick={() => setWizardStage("products")}>
                {t.wizard.continue}
              </button>
            ) : (
              <button
                className="primaryButton"
                disabled={!configured || !account || busy !== "" || (REGISTRY_MODE === "groth16" && !zkProof)}
                onClick={submitQualification}
              >
                {REGISTRY_MODE === "groth16" ? t.submitProof : t.submitDemoProof}
              </button>
            )}
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "wrap") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.assetRail}</p>
          <h2>{t.wizard.wrapTitle}</h2>
          <p>{t.wizard.wrapBody}</p>
          <label>
            {t.amount}
            <input value={mintAmount} onChange={(event) => setMintAmount(event.target.value)} />
          </label>
          <div className="buttonRow">
            <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={wrapUSDC}>
              {t.wrapCusdc}
            </button>
          </div>
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
            <button className="ghostButton" onClick={() => setWizardStage("deposit")} disabled={!hasWrapped}>
              {t.wizard.continue}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "mint") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.assetRail}</p>
          <h2>{t.wizard.mintTitle}</h2>
          <p>{t.wizard.mintBody}</p>
          <div className="wizardMetaGrid compactMeta">
            <div>
              <span>{t.metrics.publicUsdc}</span>
              <strong>{Number(usdcBalance).toLocaleString()}</strong>
            </div>
            <div>
              <span>{t.amount}</span>
              <strong>{Number(mintAmount || "0").toLocaleString()}</strong>
            </div>
          </div>
          <label>
            {t.amount}
            <input value={mintAmount} onChange={(event) => setMintAmount(event.target.value)} />
          </label>
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
            <button className="ghostButton" disabled={!configured || !account || !canUseExistingUSDC || busy !== ""} onClick={useExistingUSDC}>
              {t.useExistingUsdc}
            </button>
            <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={mintAndApprove}>
              {t.mintApprove}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "deposit") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.allocation}</p>
          <h2>{t.wizard.depositTitle}</h2>
          <p>{t.wizard.depositBody}</p>
          {selectedSummary}
          <label>
            {t.depositAmount}
            <input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} />
          </label>
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
            <button className="primaryButton" disabled={!configured || !account || !qualified || !hasWrapped || busy !== ""} onClick={depositEncrypted}>
              {busy || t.encryptDeposit}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "yield") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.publisher}</p>
          <h2>{t.wizard.yieldTitle}</h2>
          <p>{t.wizard.yieldBody}</p>
          {selectedSummary}
          <div className="splitInputs">
            <label>
              {t.aprBps}
              <input type="number" value={aprBps} onChange={(event) => setAprBps(Number(event.target.value))} />
            </label>
            <label>
              {t.periods}
              <input type="number" value={periods} onChange={(event) => setPeriods(Number(event.target.value))} />
            </label>
          </div>
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
            <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={publishYieldAndAccrue}>
              {t.publishAccrue}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    if (wizardStage === "claim") {
      return (
        <section className="wizardPanel focusedPanel">
          <p className="eyebrow">{t.reward}</p>
          <h2>{t.wizard.claimTitle}</h2>
          <p>{t.wizard.claimBody}</p>
          {selectedSummary}
          <div className="buttonRow">
            <button className="ghostButton" disabled={!configured || !account || busy !== ""} onClick={refreshRewardHandle}>
              {t.refreshReward}
            </button>
            <button className="ghostButton" disabled={!configured || !encryptedRewardHandle || busy !== ""} onClick={decryptReward}>
              {t.userDecrypt}
            </button>
            <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={claimReward}>
              {t.claimCusdc}
            </button>
          </div>
          <code className="handle">{decryptedReward || encryptedRewardHandle || t.noRewardHandle}</code>
          <div className="wizardActions">
            <button className="ghostButton" onClick={goBack}>
              {t.wizard.back}
            </button>
          </div>
          {wizardLog}
        </section>
      );
    }

    return (
      <section className="wizardPanel focusedPanel">
        <p className="eyebrow">{t.wizard.progress.claim}</p>
        <h2>{t.wizard.completeTitle}</h2>
        <p>{t.wizard.completeBody}</p>
        <div className="wizardMetaGrid">
          <div>
            <span>{t.wizard.connected}</span>
            <strong>{account ? shorten(account) : t.wizard.notConnected}</strong>
          </div>
          <div>
            <span>{t.wizard.selected}</span>
            <strong>{currentProductView.name}</strong>
          </div>
          <div>
            <span>{t.reward}</span>
            <strong>{decryptedReward || encryptedRewardHandle || t.noRewardHandle}</strong>
          </div>
          <div>
            <span>{t.cusdcBalance}</span>
            <strong>{decryptedCUSDCBalance || encryptedCUSDCBalanceHandle || t.noBalanceHandle}</strong>
          </div>
        </div>
        <section className="historyPanel" aria-label={t.balanceHistory}>
          <div className="historyHeader">
            <div>
              <p className="eyebrow">{t.balanceHistory}</p>
              <h3>{t.balanceHistory}</h3>
              <p>{t.balanceHistoryBody}</p>
            </div>
            <div className="historyActions">
              <button className="ghostButton" disabled={!configured || !account || busy !== "" || balanceHistory.length === 0} onClick={decryptBalanceHistory}>
                {t.decryptHistory}
              </button>
              <button className="ghostButton" disabled={balanceHistory.length === 0 || busy !== ""} onClick={clearBalanceHistory}>
                {t.clearHistory}
              </button>
            </div>
          </div>
          {balanceHistory.length > 0 ? (
            <div className="historyList">
              {balanceHistory.map((entry) => (
                <div className="historyRow" key={entry.id}>
                  <div>
                    <strong>{displayHistoryLabel(entry.label)}</strong>
                    <span>{new Date(entry.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</span>
                  </div>
                  <div className="historyValue">
                    <code>{entry.plain || shorten(entry.handle)}</code>
                    {entry.txHash ? (
                      <a href={txExplorerUrl(entry.txHash)} rel="noreferrer" target="_blank">
                        Etherscan
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyHistory">{t.noHistory}</p>
          )}
        </section>
        <div className="wizardActions">
          <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={decryptCUSDCBalance}>
            {t.decryptCusdcBalance}
          </button>
          <button className="ghostButton" onClick={() => setWizardStage("products")}>
            {t.wizard.startOver}
          </button>
          <Link className="ghostButton" href="/config">
            {t.wizard.reviewConfig}
          </Link>
        </div>
        {wizardLog}
      </section>
    );
  };

  return (
    <main className="shell wizardShell">
      {wizardStage !== "intro" && (
        <section className="topbar wizardTopbar">
          <div className="brandLockup">
            <img src="/priv.png" alt="Privyields logo" />
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1>Privyields</h1>
            </div>
          </div>
          <div className="topControls">
            <Link className="ghostButton navButton" href="/slides">
              {t.nav.slides}
            </Link>
            <Link className="ghostButton navButton" href="/docs">
              {t.nav.docs}
            </Link>
            <Link className="ghostButton navButton" href="/config">
              {t.nav.config}
            </Link>
            {account && <span className="accountPill">{shorten(account)}</span>}
            <div className="segmented" aria-label="Theme">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
                {t.controls.light}
              </button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
                {t.controls.dark}
              </button>
            </div>
            <div className="segmented" aria-label="Language">
              <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>
                {t.controls.english}
              </button>
              <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")}>
                {t.controls.chinese}
              </button>
            </div>
          </div>
        </section>
      )}

      {wizardStage !== "intro" && (
        <section className="wizardProgress" aria-label="Demo progress">
          {wizardFlow.map((step, index) => (
            <button
              className={index === activeFlowIndex ? "wizardProgressItem active" : step.done ? "wizardProgressItem done" : "wizardProgressItem"}
              disabled={(!account && step.stage !== "wallet") || !canOpenWizardStep(index, step.done)}
              key={step.stage}
              onClick={() => setWizardStage(step.stage)}
            >
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </section>
      )}

      <section className="wizardStage">{renderWizardStage()}</section>

      {wizardStage !== "intro" && (
        <section className="wizardMetaGrid">
          <div>
            <span>{t.metrics.qualification}</span>
            <strong>{qualified ? t.metrics.verified : t.metrics.notVerified}</strong>
          </div>
          <div>
            <span>{t.metrics.publicUsdc}</span>
            <strong>{Number(usdcBalance).toLocaleString()}</strong>
          </div>
          <div>
            <span>{t.metrics.contractMode}</span>
            <strong>{configured ? t.metrics.live : t.metrics.preview}</strong>
          </div>
        </section>
      )}
    </main>
  );
}
