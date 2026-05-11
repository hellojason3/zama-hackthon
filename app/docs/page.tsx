import Link from "next/link";

const englishSections = [
  {
    title: "Overview",
    body: [
      "Privyields is a confidential qualified-yield marketplace demo. It shows how a user can prove eligibility, choose or issue a yield product, allocate encrypted cUSDC, receive encrypted reward accounting, claim confidential cUSDC, and decrypt their own final balance.",
      "The product promise is simple: prove eligibility without revealing wealth, then keep allocation size and reward amounts private by default."
    ]
  },
  {
    title: "Privacy Model",
    body: [
      "The project intentionally separates two privacy problems. ZK handles the qualification gate: the user proves that their private asset amount is above the threshold without publishing the amount.",
      "Zama FHE handles the asset flow after qualification. Deposits, principal, rewards, and cUSDC balances are represented as encrypted handles. The dApp only reveals a reward or balance after the wallet signs a user-decrypt request."
    ]
  },
  {
    title: "Core Contracts",
    body: [
      "MockUSDC is the public demo asset used for funding and approvals.",
      "ConfidentialUSDC wraps public USDC into an ERC-7984 confidential token rail using the Zama Ethereum configuration.",
      "QualifiedInvestorGroth16Verifier is generated from the Arkworks BN254 Groth16 circuit.",
      "Groth16QualifiedInvestorRegistry verifies the asset-threshold proof and stores qualified wallet state.",
      "YieldProductMarket holds the product list, APR data, and vault relationship. Product listing is permissionless: any connected wallet can create a public product entry.",
      "ConfidentialYieldVault receives encrypted deposits through cUSDC transfer-and-call, stores encrypted principal and encrypted rewards, and pays encrypted cUSDC claims. Its transfer callback explicitly grants the cUSDC contract transient access to the encrypted accept flag so ERC-7984 can complete the callback flow."
    ]
  },
  {
    title: "Guided Demo Flow",
    body: [
      "The frontend is a wizard rather than a dense dashboard. The user starts on a product explanation page, connects a Sepolia wallet, selects a product, proves qualification, mints mock USDC, wraps cUSDC, encrypts and deposits, publishes/accrues demo yield, decrypts the reward, claims cUSDC, and finally decrypts the wallet's cUSDC balance.",
      "The allocation step uses the Zama Relayer SDK to create an encrypted input for the cUSDC contract and the connected wallet. Addresses are normalized to EIP-55 checksum form before encryption because the SDK validates addresses strictly.",
      "The final balance decrypt reads cUSDC.confidentialBalanceOf(account), asks the wallet to sign a Zama user-decrypt message, and displays the user's own confidential balance."
    ]
  },
  {
    title: "Product Marketplace",
    body: [
      "The default marketplace includes ten demo yield products across T-bills, real estate, staking, mining cashflow, private credit, basis strategies, DeFi credit, compute revenue, equity dividends, and money markets.",
      "Any wallet can issue a new product from the frontend. Product metadata and APR are public so the marketplace can be discovered and compared, while each user's allocation amount remains encrypted."
    ]
  },
  {
    title: "Frontend",
    body: [
      "The web app is a Next.js 16 production application with EN/ZH copy, light/dark theme controls, a guided wizard, a slides page, a bilingual docs page, and a config page that exposes the deployed contract addresses.",
      "The allocation page includes visible execution notes and debug events for relayer preparation, encrypted handle generation, proof size, contract addresses, and deposit transaction hash. This is useful for live demo troubleshooting.",
      "The deployed production app runs behind Caddy at https://privyields.xyz/ and proxies to a Next production server on 127.0.0.1:3000."
    ]
  },
  {
    title: "cUSDC Balance Semantics",
    body: [
      "MetaMask cannot display the true cUSDC balance because cUSDC is a confidential token. MetaMask can show ETH and public MockUSDC, but cUSDC balance is an encrypted handle.",
      "The final page's Decrypt cUSDC Balance button decrypts the wallet's total cUSDC balance. That number is cumulative across all demo runs with the same wallet.",
      "The frontend also records balance and reward handles in browser localStorage after wrap, allocation, reward settlement, and claim. The Decrypt History button batch decrypts all currently hidden history rows with a single wallet signature.",
      "For the default demo values, one clean run mints and wraps 1,000,000 cUSDC, deposits 250,000 cUSDC, and claims a reward computed from APR bps and periods. With APR bps 650 and periods 1, the reward is 16,250 cUSDC, so a fresh wallet ends near 766,250 cUSDC after claim."
    ]
  },
  {
    title: "Deployment Model",
    body: [
      "The production deployment path compiles Rust Arkworks assets, deploys contracts from the local machine, syncs the repository and prover binary to zama-hackthon, runs npm ci, writes .env.local and public/deployment-config.json from deployment artifacts, builds Next.js, and starts next start.",
      "Use npm run deploy:sepolia:production for a full Sepolia contract and frontend deploy. Use scripts/deploy-sepolia-production.sh --frontend-only when contracts are current and only UI/docs need to be republished.",
      "No Rust backend is required for product issuance. The Rust component is the local Arkworks Groth16 prover and verifier generator. A separate backend would only be useful later for moderation, metadata hosting, indexing, or issuer reputation."
    ]
  },
  {
    title: "Environment Variables",
    body: [
      "NEXT_PUBLIC_MOCK_USDC, NEXT_PUBLIC_CUSDC, NEXT_PUBLIC_MARKET, NEXT_PUBLIC_VAULT, NEXT_PUBLIC_QUALIFICATION_REGISTRY, NEXT_PUBLIC_GROTH16_VERIFIER, NEXT_PUBLIC_REGISTRY_MODE, NEXT_PUBLIC_ZK_ASSET_THRESHOLD, and NEXT_PUBLIC_CHAIN_NAME are written after contract deployment and embedded into the Next build.",
      "For Sepolia deployments, the local machine needs DEPLOYER_PRIVATE_KEY or MNEMONIC, plus SEPOLIA_RPC_URL. ALCHEMY_API_KEY and INFURA_API_KEY are also supported as shortcuts for building the RPC URL."
    ]
  },
  {
    title: "Known Demo Boundaries",
    body: [
      "The Groth16 verifier is real demo code, but issuer commitment registration is still a demo attestation model rather than a bank-grade credential process.",
      "The Arkworks setup is deterministic for repeatable demo builds. It is not a production trusted setup ceremony.",
      "The circuits directory is a legacy Circom design sketch; the connected verifier path is the Rust Arkworks implementation under zk/qualified-investor.",
      "MockUSDC is an intentionally open demo token. It is not real USDC, and the demo yield strategy does not model real-world custody, cashflow, or issuer risk.",
      "The cUSDC balance shown after user decrypt is the wallet's cumulative confidential balance, not the reward for one run. To show a clean balance, use a fresh demo wallet.",
      "The production-ready path should use audited circuits, real issuer attestations, stronger role management, monitoring, a clear custody model for yield strategies, and a security review of the confidential token integration."
    ]
  }
];

const chineseSections = [
  {
    title: "项目概览",
    body: [
      "Privyields 是一个隐私合格投资收益市场 demo。它展示用户如何证明自己满足准入门槛，选择或发行收益产品，配置加密 cUSDC，获得加密收益记账，提取 confidential cUSDC，并在最后解密自己的 cUSDC 余额。",
      "产品的一句话目标是：用户可以证明自己有资格参与，但不暴露资产规模、配置金额和收益金额。"
    ]
  },
  {
    title: "隐私模型",
    body: [
      "项目把两个隐私问题拆开处理。ZK 负责准入资格：用户证明自己的私有资产金额超过门槛，但不公开具体金额。",
      "Zama FHE 负责资格通过后的资产流。存款、本金、收益和 cUSDC 余额都以加密 handle 表示。只有当用户用钱包签署 user-decrypt 请求后，dApp 才显示用户自己的 reward 或 balance。"
    ]
  },
  {
    title: "核心合约",
    body: [
      "MockUSDC 是 demo 里的公开资产，用于铸造、授权和包装。",
      "ConfidentialUSDC 使用 Zama Ethereum 配置，把公开 USDC 包装成 ERC-7984 confidential token，也就是 cUSDC。",
      "QualifiedInvestorGroth16Verifier 是从 Arkworks BN254 Groth16 circuit 导出的链上 verifier。",
      "Groth16QualifiedInvestorRegistry 验证资产门槛 proof，并记录钱包是否通过资格验证。",
      "YieldProductMarket 管理收益产品列表、APR 数据和 vault 关系。产品发行是 permissionless 的：任意已连接钱包都可以创建公开产品条目。",
      "ConfidentialYieldVault 通过 cUSDC transfer-and-call 接收加密存款，记录加密本金和加密收益，并支持用户提取加密 cUSDC。Vault 回调返回加密 accept flag 前，会给 cUSDC 合约临时授权，保证 ERC-7984 callback 流程可以完成。"
    ]
  },
  {
    title: "向导式 Demo 流程",
    body: [
      "前端现在是向导式流程，而不是密集控制台。用户从产品说明页开始，连接 Sepolia 钱包，选择产品，证明资格，铸造 mock USDC，包装 cUSDC，加密并存入，发布/结算 demo 收益，解密 reward，提取 cUSDC，最后解密钱包的 cUSDC 余额。",
      "Allocation 步骤会用 Zama Relayer SDK 为 cUSDC 合约和当前钱包生成 encrypted input。由于 SDK 对地址格式校验很严格，前端会先把地址规范化为 EIP-55 checksum 地址。",
      "最后的余额解密会读取 cUSDC.confidentialBalanceOf(account)，让钱包签署 Zama user-decrypt 消息，然后显示用户自己的 confidential balance。"
    ]
  },
  {
    title: "收益产品市场",
    body: [
      "默认市场包含 10 个 demo 收益产品，包括短期国债、代币化房地产、ETH staking、挖矿现金流、private credit、basis 策略、DeFi lending、GPU compute、股息组合和货币市场。",
      "任意钱包都可以在前端发行新产品。产品名称、分类、发行方和 APR 是公开的，方便市场发现和比较；每个用户实际配置了多少资金仍然是加密的。"
    ]
  },
  {
    title: "前端应用",
    body: [
      "前端是一个 Next.js 16 production 应用，包含英文/中文文案、Light/Dark 主题、向导式 demo、Slides 页面、双语 Docs 页面和展示部署地址的 Config 页面。",
      "Allocation 页面包含可见执行状态和 debug 事件，包括 relayer 准备、encrypted handle 生成、proof 字节长度、合约地址和 deposit transaction hash，方便 live demo 排查。",
      "线上访问地址是 https://privyields.xyz/。Caddy 负责 HTTPS 入口，并反向代理到服务器上的 Next production server：127.0.0.1:3000。"
    ]
  },
  {
    title: "cUSDC 余额语义",
    body: [
      "MetaMask 不能直接显示真实 cUSDC 余额，因为 cUSDC 是 confidential token。MetaMask 可以显示 ETH 和公开 MockUSDC，但 cUSDC 余额是一个加密 handle。",
      "最后页面的 Decrypt cUSDC Balance 按钮显示的是这个钱包的 cUSDC 总余额。这个数字会随着同一个钱包多次 demo 累计。",
      "前端也会在 wrap、allocation、收益结算和 claim 之后，把余额或 reward handle 记录到浏览器 localStorage。Decrypt History 按钮会用一次钱包签名批量解密当前还没显示明文的历史记录。",
      "按默认参数，一次干净流程会 mint/wrap 1,000,000 cUSDC，deposit 250,000 cUSDC，并按 APR bps 和 periods 计算 reward。如果 APR bps 是 650、periods 是 1，reward 是 16,250 cUSDC，所以新钱包 claim 后大约是 766,250 cUSDC。"
    ]
  },
  {
    title: "部署模型",
    body: [
      "生产部署路径会编译 Rust Arkworks 资产，从本机部署合约，把仓库和 prover binary 同步到 zama-hackthon，执行 npm ci，根据部署产物写入 .env.local 和 public/deployment-config.json，构建 Next.js，然后用 next start 启动。",
      "完整 Sepolia 部署使用 npm run deploy:sepolia:production。如果合约已经是最新，只需要重新发布 UI 或文档，可以使用 scripts/deploy-sepolia-production.sh --frontend-only。",
      "产品发行不需要 Rust 后端。Rust 组件是本地 Arkworks Groth16 prover 和 verifier generator。未来如果需要审核、metadata 托管、索引或发行方信誉系统，才需要额外后端服务。"
    ]
  },
  {
    title: "环境变量",
    body: [
      "NEXT_PUBLIC_MOCK_USDC、NEXT_PUBLIC_CUSDC、NEXT_PUBLIC_MARKET、NEXT_PUBLIC_VAULT、NEXT_PUBLIC_QUALIFICATION_REGISTRY、NEXT_PUBLIC_GROTH16_VERIFIER、NEXT_PUBLIC_REGISTRY_MODE、NEXT_PUBLIC_ZK_ASSET_THRESHOLD 和 NEXT_PUBLIC_CHAIN_NAME 会在合约部署后写入，并在 Next build 时嵌入前端。",
      "如果部署到 Sepolia，本机需要 DEPLOYER_PRIVATE_KEY 或 MNEMONIC，并配置 SEPOLIA_RPC_URL。也可以用 ALCHEMY_API_KEY 或 INFURA_API_KEY 快速生成 RPC URL。"
    ]
  },
  {
    title: "Demo 边界",
    body: [
      "Groth16 verifier 已经是真实 demo 代码，但 issuer commitment registration 仍是 demo attestation model，不是银行级凭证流程。",
      "Arkworks setup 为了可重复 demo 构建使用确定性脚本生成，不是生产级 trusted setup ceremony。",
      "circuits 目录是早期 Circom 设计草案；当前真正接入的 verifier 路径是 zk/qualified-investor 下的 Rust Arkworks 实现。",
      "MockUSDC 是有意开放的 demo token，不是真实 USDC；demo yield strategy 也没有模拟真实世界的托管、现金流和发行方风险。",
      "用户解密后的 cUSDC balance 是钱包的累计 confidential balance，不是单次收益。想展示干净余额，建议使用新的 demo 钱包。",
      "生产化路线需要审计 circuit、接入真实发行方 attestations、更严格的角色权限、监控告警、清晰的收益策略资金托管模型，以及对 confidential token 集成做安全审查。"
    ]
  }
];

function SectionList({title, sections}: {title: string; sections: typeof englishSections}) {
  return (
    <section className="docColumn">
      <h2>{title}</h2>
      {sections.map((section) => (
        <article className="docBlock" key={section.title}>
          <h3>{section.title}</h3>
          {section.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </article>
      ))}
    </section>
  );
}

export default function DocsPage() {
  return (
    <main className="docShell">
      <nav className="docNav">
        <Link href="/">App</Link>
        <Link href="/slides">Slides</Link>
        <Link href="/config">Config</Link>
      </nav>

      <header className="docHero">
        <div className="brandLockup heroBrand">
          <img src="/priv.png" alt="Privyields logo" />
          <div>
            <p className="eyebrow">Project Documentation / 工程文档</p>
            <h1>Privyields Technical Notes</h1>
            <p>
              A bilingual engineering document for the deployed Sepolia confidential qualified-yield marketplace demo.
            </p>
          </div>
        </div>
      </header>

      <section className="docQuickFacts">
        <div>
          <span>Live Site</span>
          <strong>https://privyields.xyz/</strong>
        </div>
        <div>
          <span>Frontend</span>
          <strong>Next.js production server</strong>
        </div>
        <div>
          <span>Privacy Stack</span>
          <strong>ZK qualification + Zama FHE accounting</strong>
        </div>
      </section>

      <section className="docGrid">
        <SectionList title="English" sections={englishSections} />
        <SectionList title="中文" sections={chineseSections} />
      </section>
    </main>
  );
}
