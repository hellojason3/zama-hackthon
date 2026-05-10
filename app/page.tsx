"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {AbiCoder, BrowserProvider, Contract, formatUnits, hexlify, id, parseUnits} from "ethers";
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

type StepKey = "qualify" | "wrap" | "deposit" | "yield" | "claim";
type Locale = "en" | "zh";
type Theme = "light" | "dark";
type RelayerModule = typeof import("@zama-fhe/relayer-sdk/web");
type RelayerInstance = Awaited<ReturnType<RelayerModule["createInstance"]>>;
type DemoLog = {id: number; message: string};

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
    nav: {slides: "Slides", docs: "Docs"},
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
      qualify: "ZK asset gate",
      wrap: "Wrap to cUSDC",
      deposit: "Encrypted allocation",
      yield: "Published yield",
      claim: "Encrypted claim"
    },
    notice:
      "ZK is scoped to asset qualification only. Allocation and reward accounting use FHE encrypted cUSDC handles.",
    market: "Marketplace",
    yieldProducts: "Yield products",
    refresh: "Refresh",
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
    wrapCusdc: "Wrap cUSDC",
    allocation: "Allocation",
    encryptedDeposit: "Encrypted deposit",
    depositAmount: "Deposit amount",
    encryptDeposit: "Encrypt + Deposit",
    publisher: "Publisher",
    yieldUpdate: "Yield update",
    aprBps: "APR bps",
    periods: "Periods",
    publishAccrue: "Publish + Accrue",
    reward: "Reward",
    decryptClaim: "Decrypt and claim",
    allowDecrypt: "Allow Decrypt",
    userDecrypt: "User Decrypt",
    claimCusdc: "Claim cUSDC",
    noRewardHandle: "No reward handle yet",
    demoTape: "Demo tape",
    latestEvents: "Latest events",
    running: "Running",
    initialLog: "Open the app with deployed contract addresses in NEXT_PUBLIC_* env variables.",
    errors: {
      noWallet: "No injected wallet found.",
      installWallet: "Install a wallet to run the live demo.",
      requestDecrypt: "Request reward decryption first."
    },
    logs: {
      connected: (address: string) => `Connected ${address}`,
      proofGenerated: "Arkworks Groth16 asset-threshold proof generated.",
      commitmentRegistered: "Asset commitment registered by issuer.",
      proofAccepted: "Groth16 asset-threshold proof accepted by registry.",
      demoProofAccepted: "Demo ZK asset-threshold proof accepted by registry.",
      minted: (amount: string) => `Minted and approved ${amount} mock USDC.`,
      wrapped: "Wrapped public USDC into confidential cUSDC.",
      deposited: (product: string) => `Encrypted deposit routed to ${product}.`,
      accrued: (apr: string) => `Published ${apr} APR and accrued encrypted reward.`,
      decryptAllowed: "Reward handle is authorized for user decryption.",
      userDecryptDone: "User decrypt completed through the Zama relayer SDK.",
      claimed: "Encrypted reward claimed as cUSDC."
    }
  },
  zh: {
    eyebrow: "隐私合格投资收益市场",
    connectWallet: "连接钱包",
    controls: {light: "日间", dark: "夜间", english: "EN", chinese: "中文"},
    nav: {slides: "介绍 Slide", docs: "工程文档"},
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
      qualify: "ZK 资产门槛",
      wrap: "包装为 cUSDC",
      deposit: "加密配置",
      yield: "收益发布",
      claim: "加密提款"
    },
    notice: "ZK 只用于资产资格证明。配置和收益记账使用 FHE 加密 cUSDC handle。",
    market: "市场",
    yieldProducts: "收益产品",
    refresh: "刷新",
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
    wrapCusdc: "包装 cUSDC",
    allocation: "配置",
    encryptedDeposit: "加密存款",
    depositAmount: "存款金额",
    encryptDeposit: "加密 + 存入",
    publisher: "发布方",
    yieldUpdate: "收益更新",
    aprBps: "APR bps",
    periods: "周期",
    publishAccrue: "发布 + 计提",
    reward: "收益",
    decryptClaim: "解密和提款",
    allowDecrypt: "授权解密",
    userDecrypt: "用户解密",
    claimCusdc: "提取 cUSDC",
    noRewardHandle: "还没有 reward handle",
    demoTape: "Demo 记录",
    latestEvents: "最新事件",
    running: "执行中",
    initialLog: "请使用 NEXT_PUBLIC_* 环境变量中的部署地址打开应用。",
    errors: {
      noWallet: "没有检测到浏览器钱包。",
      installWallet: "请安装钱包以运行 live demo。",
      requestDecrypt: "请先请求 reward 解密授权。"
    },
    logs: {
      connected: (address: string) => `已连接 ${address}`,
      proofGenerated: "Arkworks Groth16 资产门槛 proof 已生成。",
      commitmentRegistered: "资产 commitment 已由发行方登记。",
      proofAccepted: "Groth16 资产门槛证明已被 registry 接受。",
      demoProofAccepted: "Demo ZK 资产门槛证明已被 registry 接受。",
      minted: (amount: string) => `已铸造并授权 ${amount} mock USDC。`,
      wrapped: "已将公开 USDC 包装为 confidential cUSDC。",
      deposited: (product: string) => `加密存款已路由到 ${product}。`,
      accrued: (apr: string) => `已发布 ${apr} APR，并计提加密收益。`,
      decryptAllowed: "Reward handle 已授权给用户解密。",
      userDecryptDone: "用户已通过 Zama relayer SDK 完成解密。",
      claimed: "加密 reward 已作为 cUSDC 提取。"
    }
  }
} as const;

const formatApr = (bps: number) => `${(bps / 100).toFixed(2)}%`;
const shorten = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;
const configured = [CONTRACTS.mockUSDC, CONTRACTS.cUSDC, CONTRACTS.market, CONTRACTS.vault, CONTRACTS.registry].every(Boolean);

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

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("light");
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
  const [zkAssetBalance, setZkAssetBalance] = useState("1500000");
  const [zkSalt, setZkSalt] = useState("123456789");
  const [zkProof, setZkProof] = useState<Groth16ProofPayload | null>(null);
  const [hasWrapped, setHasWrapped] = useState(false);
  const [hasDeposited, setHasDeposited] = useState(false);
  const [hasAccrued, setHasAccrued] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [log, setLog] = useState<DemoLog[]>([{id: 0, message: COPY.en.initialLog}]);
  const [busy, setBusy] = useState("");
  const logIdRef = useRef(1);
  const relayerRef = useRef<{account: string; chainId: string; instance: RelayerInstance} | null>(null);
  const t = COPY[locale];

  const currentProduct = useMemo(
    () => products.find((product) => Number(product.id) === selectedProduct) ?? products[0],
    [products, selectedProduct]
  );
  const currentProductView = localizeProduct(currentProduct, locale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale, theme]);

  const provider = async () => {
    if (!window.ethereum) throw new Error(t.errors.noWallet);
    return new BrowserProvider(window.ethereum);
  };

  const signer = async () => (await provider()).getSigner();

  const pushLog = (line: string) => {
    setLog((items) => [{id: logIdRef.current++, message: line}, ...items].slice(0, 8));
  };

  const run = async (label: string, action: () => Promise<void>) => {
    try {
      setBusy(label);
      await action();
    } catch (error) {
      pushLog(error instanceof Error ? error.message : String(error));
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
    setProducts(
      remoteProducts.map((product: Product) => ({
        ...product,
        currentAprBps: Number(product.currentAprBps)
      }))
    );
    setQualified(isQualified);
  };

  const getRelayerInstance = async () => {
    if (!window.ethereum) throw new Error(t.errors.noWallet);
    const chainId = (await window.ethereum.request({method: "eth_chainId"})) as string;

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
      setAccount(accounts[0]);
      setZkProof(null);
      setHasWrapped(false);
      setHasDeposited(false);
      setHasAccrued(false);
      setHasClaimed(false);
      setEncryptedRewardHandle("");
      setDecryptedReward("");
      relayerRef.current = null;
      pushLog(t.logs.connected(shorten(accounts[0])));
      await readContracts(accounts[0]);
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

  const registerCommitment = () =>
    run("register commitment", async () => {
      if (!zkProof) throw new Error(t.noProof);
      const registry = new Contract(CONTRACTS.registry, REGISTRY_ABI, await signer());
      const tx = await registry.registerCommitment(zkProof.commitment);
      await tx.wait();
      pushLog(t.logs.commitmentRegistered);
    });

  const submitQualification = () =>
    run("qualification", async () => {
      const registry = new Contract(CONTRACTS.registry, REGISTRY_ABI, await signer());

      if (REGISTRY_MODE !== "groth16") {
        const proofCommitment = id(`${account}:assets>=1000000:${Date.now()}`);
        const tx = await registry.submitDemoProof(proofCommitment);
        await tx.wait();
        setQualified(true);
        pushLog(t.logs.demoProofAccepted);
        return;
      }

      if (!zkProof) throw new Error(t.noProof);
      const tx = await registry.proveQualified(
        zkProof.proof.a,
        zkProof.proof.b,
        zkProof.proof.c,
        zkProof.public_inputs
      );
      await tx.wait();
      setQualified(true);
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
      await readContracts();
      pushLog(t.logs.minted(mintAmount));
    });

  const wrapUSDC = () =>
    run("wrap", async () => {
      const amount = parseUnits(mintAmount || "0", 6);
      const cUSDC = new Contract(CONTRACTS.cUSDC, CUSDC_ABI, await signer());
      const tx = await cUSDC.wrap(account, amount);
      await tx.wait();
      setHasWrapped(true);
      await readContracts();
      pushLog(t.logs.wrapped);
    });

  const createEncryptedAmount = async (amount: bigint) => {
    const instance = await getRelayerInstance();
    const input = instance.createEncryptedInput(CONTRACTS.cUSDC, account).add64(amount);
    const encrypted = await input.encrypt();
    return {
      handle: hexlify(encrypted.handles[0]),
      inputProof: hexlify(encrypted.inputProof),
      instance
    };
  };

  const depositEncrypted = () =>
    run("deposit", async () => {
      const amount = parseUnits(depositAmount || "0", 6);
      const encrypted = await createEncryptedAmount(amount);
      const data = AbiCoder.defaultAbiCoder().encode(["uint256"], [selectedProduct]);
      const cUSDC = new Contract(CONTRACTS.cUSDC, CUSDC_ABI, await signer());
      const tx = await cUSDC["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        CONTRACTS.vault,
        encrypted.handle,
        encrypted.inputProof,
        data
      );
      await tx.wait();
      setHasDeposited(true);
      await readContracts();
      pushLog(t.logs.deposited(currentProductView.name));
    });

  const publishYieldAndAccrue = () =>
    run("yield", async () => {
      const writeSigner = await signer();
      const market = new Contract(CONTRACTS.market, MARKET_ABI, writeSigner);
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, writeSigner);
      const publishTx = await market.publishYieldRate(selectedProduct, aprBps);
      await publishTx.wait();
      const accrueTx = await vault.accrueReward(account, selectedProduct, periods);
      await accrueTx.wait();
      setHasAccrued(true);
      await readContracts();
      pushLog(t.logs.accrued(formatApr(aprBps)));
    });

  const requestRewardDecrypt = () =>
    run("decrypt", async () => {
      const writeSigner = await signer();
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, writeSigner);
      const tx = await vault.requestDecryptReward(selectedProduct);
      await tx.wait();
      const handle = await vault.getEncryptedReward(account, selectedProduct);
      setEncryptedRewardHandle(handle);
      pushLog(t.logs.decryptAllowed);
    });

  const decryptReward = () =>
    run("user decrypt", async () => {
      if (!encryptedRewardHandle) throw new Error(t.errors.requestDecrypt);
      const instance = await getRelayerInstance();
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 7;
      const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACTS.vault], startTimestamp, durationDays);
      const walletSigner = await signer();
      const signature = await walletSigner.signTypedData(
        eip712.domain as never,
        {UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification} as never,
        eip712.message as never
      );
      const result = await instance.userDecrypt(
        [{handle: encryptedRewardHandle, contractAddress: CONTRACTS.vault}],
        keypair.privateKey,
        keypair.publicKey,
        signature,
        [CONTRACTS.vault],
        account,
        startTimestamp,
        durationDays
      );
      setDecryptedReward(formatDecryptionResult(result, encryptedRewardHandle));
      pushLog(t.logs.userDecryptDone);
    });

  const claimReward = () =>
    run("claim", async () => {
      const vault = new Contract(CONTRACTS.vault, VAULT_ABI, await signer());
      const tx = await vault.claimReward(selectedProduct);
      await tx.wait();
      setHasClaimed(true);
      setEncryptedRewardHandle("");
      pushLog(t.logs.claimed);
    });

  const steps: {key: StepKey; label: string; done: boolean}[] = [
    {key: "qualify", label: t.steps.qualify, done: qualified},
    {key: "wrap", label: t.steps.wrap, done: hasWrapped},
    {key: "deposit", label: t.steps.deposit, done: hasDeposited},
    {key: "yield", label: t.steps.yield, done: hasAccrued || Boolean(encryptedRewardHandle)},
    {key: "claim", label: t.steps.claim, done: hasClaimed}
  ];

  return (
    <main className="shell">
      <section className="topbar">
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
          <button className="primaryButton" onClick={connectWallet} disabled={busy === "wallet"}>
            {account ? shorten(account) : t.connectWallet}
          </button>
        </div>
      </section>

      <section className="summaryGrid">
        <div className="metricPanel">
          <span>{t.metrics.qualification}</span>
          <strong>{qualified ? t.metrics.verified : t.metrics.notVerified}</strong>
          <small>{t.metrics.threshold}</small>
        </div>
        <div className="metricPanel">
          <span>{t.metrics.publicUsdc}</span>
          <strong>{Number(usdcBalance).toLocaleString()}</strong>
          <small>{t.metrics.publicUsdcHint}</small>
        </div>
        <div className="metricPanel">
          <span>{t.metrics.selectedProduct}</span>
          <strong>{currentProductView.name}</strong>
          <small>{currentProductView.category}</small>
        </div>
        <div className="metricPanel">
          <span>{t.metrics.contractMode}</span>
          <strong>{configured ? t.metrics.live : t.metrics.preview}</strong>
          <small>{configured ? t.metrics.liveHint : t.metrics.previewHint}</small>
        </div>
      </section>

      <section className="workspace">
        <aside className="rail">
          {steps.map((step, index) => (
            <div className="step" key={step.key}>
              <span className={step.done ? "stepDot done" : "stepDot"}>{index + 1}</span>
              <span>{step.label}</span>
            </div>
          ))}
          <div className="notice">{t.notice}</div>
        </aside>

        <section className="market">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.market}</p>
              <h2>{t.yieldProducts}</h2>
            </div>
            <button className="ghostButton" onClick={() => readContracts()} disabled={!account || busy !== ""}>
              {t.refresh}
            </button>
          </div>

          <div className="productGrid">
            {products.map((product) => {
              const productView = localizeProduct(product, locale);
              return (
                <button
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
        </section>

        <section className="actions">
          <div className="panel">
            <div className="sectionHeader tight">
              <div>
                <p className="eyebrow">{t.gate}</p>
                <h2>{t.qualificationProof}</h2>
              </div>
              <span className={qualified ? "pill good" : "pill"}>{qualified ? t.passed : t.required}</span>
            </div>
            {REGISTRY_MODE === "groth16" && (
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
                  <button className="ghostButton" disabled={!configured || !zkProof || busy !== ""} onClick={registerCommitment}>
                    {t.registerCommitment}
                  </button>
                </div>
                <code className="handle">{zkProof ? `${t.proofReady}: ${shorten(zkProof.commitment)}` : t.noProof}</code>
              </>
            )}
            <button
              className="primaryButton wide"
              disabled={!configured || !account || busy !== "" || (REGISTRY_MODE === "groth16" && !zkProof)}
              onClick={submitQualification}
            >
              {REGISTRY_MODE === "groth16" ? t.submitProof : t.submitDemoProof}
            </button>
          </div>

          <div className="panel">
            <div className="sectionHeader tight">
              <div>
                <p className="eyebrow">{t.assetRail}</p>
                <h2>{t.mintApproveWrap}</h2>
              </div>
            </div>
            <label>
              {t.amount}
              <input value={mintAmount} onChange={(event) => setMintAmount(event.target.value)} />
            </label>
            <div className="buttonRow">
              <button className="ghostButton" disabled={!configured || !account || busy !== ""} onClick={mintAndApprove}>
                {t.mintApprove}
              </button>
              <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={wrapUSDC}>
                {t.wrapCusdc}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="sectionHeader tight">
              <div>
                <p className="eyebrow">{t.allocation}</p>
                <h2>{t.encryptedDeposit}</h2>
              </div>
            </div>
            <label>
              {t.depositAmount}
              <input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} />
            </label>
            <button className="primaryButton wide" disabled={!configured || !account || !qualified || busy !== ""} onClick={depositEncrypted}>
              {t.encryptDeposit}
            </button>
          </div>

          <div className="panel">
            <div className="sectionHeader tight">
              <div>
                <p className="eyebrow">{t.publisher}</p>
                <h2>{t.yieldUpdate}</h2>
              </div>
            </div>
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
            <button className="primaryButton wide" disabled={!configured || !account || busy !== ""} onClick={publishYieldAndAccrue}>
              {t.publishAccrue}
            </button>
          </div>

          <div className="panel">
            <div className="sectionHeader tight">
              <div>
                <p className="eyebrow">{t.reward}</p>
                <h2>{t.decryptClaim}</h2>
              </div>
            </div>
            <div className="buttonRow">
              <button className="ghostButton" disabled={!configured || !account || busy !== ""} onClick={requestRewardDecrypt}>
                {t.allowDecrypt}
              </button>
              <button className="ghostButton" disabled={!configured || !encryptedRewardHandle || busy !== ""} onClick={decryptReward}>
                {t.userDecrypt}
              </button>
              <button className="primaryButton" disabled={!configured || !account || busy !== ""} onClick={claimReward}>
                {t.claimCusdc}
              </button>
            </div>
            <code className="handle">{decryptedReward || encryptedRewardHandle || t.noRewardHandle}</code>
          </div>
        </section>
      </section>

      <section className="logPanel">
        <div className="sectionHeader tight">
          <div>
            <p className="eyebrow">{t.demoTape}</p>
            <h2>{busy ? `${t.running}: ${busy}` : t.latestEvents}</h2>
          </div>
        </div>
        {log.map((item) => (
          <p key={item.id}>{item.message}</p>
        ))}
      </section>
    </main>
  );
}
