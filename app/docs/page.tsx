import Link from "next/link";

const englishSections = [
  {
    title: "Overview",
    body: [
      "Privyields is a confidential qualified-yield marketplace demo. It shows how a user can prove eligibility, allocate encrypted capital to a yield product, receive encrypted reward accounting, decrypt their own reward locally, and claim confidential cUSDC.",
      "The project is intentionally split into two privacy layers: ZK is used for qualification, while Zama FHE is used for allocation and reward state."
    ]
  },
  {
    title: "Core Contracts",
    body: [
      "MockUSDC is the public demo asset used for funding and approvals.",
      "ConfidentialUSDC wraps public USDC into a confidential fungible token rail.",
      "QualifiedInvestorGroth16Verifier is generated from the Arkworks BN254 Groth16 circuit.",
      "Groth16QualifiedInvestorRegistry verifies the asset-threshold proof and stores qualified wallet state.",
      "YieldProductMarket holds the product list, APR data, and vault relationship.",
      "ConfidentialYieldVault receives encrypted deposits, tracks encrypted principal and rewards, and pays encrypted cUSDC claims."
    ]
  },
  {
    title: "End-to-End Flow",
    body: [
      "The user generates an Arkworks Groth16 asset-threshold proof for assets greater than or equal to 1,000,000 USDC.",
      "The issuer/deployer registers the generated commitment, then the user submits the proof to the on-chain Groth16 registry.",
      "The user mints mock USDC, approves the wrapper, and wraps public USDC into cUSDC.",
      "The frontend encrypts the deposit amount with the Zama Relayer SDK and calls confidentialTransferAndCall on cUSDC.",
      "The vault receives the encrypted amount through the callback, records encrypted principal, accrues encrypted rewards from the published APR, and lets the user request decrypt access.",
      "The user decrypts their own reward handle through the relayer SDK and claims encrypted cUSDC."
    ]
  },
  {
    title: "Frontend",
    body: [
      "The web app is a Next.js operating console. It exposes wallet connection, qualification, market selection, mint and wrap controls, encrypted deposit, APR publishing, reward decrypt, and reward claim actions.",
      "The deployed production app runs behind Caddy at https://privyields.xyz/ and proxies to a Next production server on 127.0.0.1:3000."
    ]
  },
  {
    title: "Deployment Model",
    body: [
      "The deployment script syncs the repository to the server, prepares Arkworks verifier assets, installs dependencies with npm ci, compiles contracts, deploys contracts, writes .env.local, builds Next.js, and starts next start.",
      "The default mode starts a local Hardhat demo chain. Running DEPLOY_NETWORK=sepolia ./deploy-server.sh deploys Sepolia contracts and starts a frontend wired to those Sepolia addresses."
    ]
  },
  {
    title: "Environment Variables",
    body: [
      "NEXT_PUBLIC_MOCK_USDC, NEXT_PUBLIC_CUSDC, NEXT_PUBLIC_MARKET, NEXT_PUBLIC_VAULT, NEXT_PUBLIC_QUALIFICATION_REGISTRY, NEXT_PUBLIC_GROTH16_VERIFIER, NEXT_PUBLIC_REGISTRY_MODE, and NEXT_PUBLIC_ZK_ASSET_THRESHOLD are written after contract deployment and embedded into the Next build.",
      "For Sepolia deployments, the local machine needs DEPLOYER_PRIVATE_KEY or MNEMONIC, plus INFURA_API_KEY or a full SEPOLIA_RPC_URL."
    ]
  },
  {
    title: "Known Demo Boundaries",
    body: [
      "The Groth16 verifier is real demo code, but the issuer commitment registration is still a demo attestation model rather than a bank-grade credential process.",
      "The Arkworks setup is deterministic for repeatable demo builds. It is not a production trusted setup ceremony.",
      "The circuits directory is a legacy Circom design sketch; the connected verifier path is the Rust Arkworks implementation under zk/qualified-investor.",
      "The local-server deployment is useful for a controlled demo, but browser wallets cannot reach a private 127.0.0.1 RPC unless the user uses an SSH tunnel or the RPC is intentionally exposed for a short demo.",
      "The production-ready path should use audited circuits, real issuer attestations, live Zama-compatible network configuration, stronger role management, monitoring, and a clear custody model for yield strategies."
    ]
  }
];

const chineseSections = [
  {
    title: "项目概览",
    body: [
      "Privyields 是一个隐私合格投资收益市场 demo。它展示用户如何证明自己满足准入门槛，在不公开配置金额的情况下把资金投向收益产品，并在本地解密自己的收益结果。",
      "项目把隐私拆成两层：ZK 用于资格证明，Zama FHE 用于加密配置金额、加密本金和加密收益记账。"
    ]
  },
  {
    title: "核心合约",
    body: [
      "MockUSDC 是 demo 里的公开资产，用于铸造、授权和包装。",
      "ConfidentialUSDC 把公开 USDC 包装成 confidential fungible token，也就是 cUSDC。",
      "QualifiedInvestorGroth16Verifier 是从 Arkworks BN254 Groth16 circuit 导出的链上 verifier。",
      "Groth16QualifiedInvestorRegistry 验证资产门槛 proof，并记录钱包是否通过资格验证。",
      "YieldProductMarket 管理收益产品列表、APR 数据和 vault 关系。",
      "ConfidentialYieldVault 接收加密存款，记录加密本金和加密收益，并支持用户提取加密 cUSDC。"
    ]
  },
  {
    title: "完整流程",
    body: [
      "用户生成 Arkworks Groth16 资产门槛 proof，证明资产大于等于 1,000,000 USDC，但不披露具体资产数额。",
      "发行方/部署者登记 commitment 后，用户把 proof 提交到链上 Groth16 registry。",
      "用户铸造 mock USDC，授权 wrapper，然后把公开 USDC 包装为 cUSDC。",
      "前端使用 Zama Relayer SDK 加密存款金额，并调用 cUSDC 的 confidentialTransferAndCall。",
      "Vault 在 callback 中收到加密金额，记录加密本金，根据产品 APR 计提加密收益，并允许用户请求 reward decrypt 权限。",
      "用户通过 relayer SDK 解密自己的 reward handle，并提取加密 cUSDC。"
    ]
  },
  {
    title: "前端应用",
    body: [
      "前端是一个 Next.js 控制台，包含钱包连接、资格证明、产品选择、mint/approve/wrap、加密存款、APR 发布、收益解密和收益提取。",
      "线上访问地址是 https://privyields.xyz/。Caddy 负责 HTTPS 入口，并反向代理到服务器上的 Next production server：127.0.0.1:3000。"
    ]
  },
  {
    title: "部署模型",
    body: [
      "部署脚本会把仓库同步到服务器，准备 Arkworks verifier 资产，执行 npm ci、编译合约、部署合约、写入 .env.local、构建 Next.js，然后用 next start 启动生产服务。",
      "默认模式启动本地 Hardhat demo 链。运行 DEPLOY_NETWORK=sepolia ./deploy-server.sh 会部署 Sepolia 合约，并启动连接 Sepolia 地址的前端。"
    ]
  },
  {
    title: "环境变量",
    body: [
      "NEXT_PUBLIC_MOCK_USDC、NEXT_PUBLIC_CUSDC、NEXT_PUBLIC_MARKET、NEXT_PUBLIC_VAULT、NEXT_PUBLIC_QUALIFICATION_REGISTRY、NEXT_PUBLIC_GROTH16_VERIFIER、NEXT_PUBLIC_REGISTRY_MODE、NEXT_PUBLIC_ZK_ASSET_THRESHOLD 会在合约部署后写入，并在 Next build 时嵌入前端。",
      "如果部署到 Sepolia，本机需要 DEPLOYER_PRIVATE_KEY 或 MNEMONIC，并配置 INFURA_API_KEY 或完整的 SEPOLIA_RPC_URL。"
    ]
  },
  {
    title: "Demo 边界",
    body: [
      "Groth16 verifier 已经是真实 demo 代码，但 issuer commitment registration 仍是 demo attestation model，不是银行级凭证流程。",
      "Arkworks setup 为了可重复 demo 构建使用确定性脚本生成，不是生产级 trusted setup ceremony。",
      "circuits 目录是早期 Circom 设计草案；当前真正接入的 verifier 路径是 zk/qualified-investor 下的 Rust Arkworks 实现。",
      "server-local 部署适合可控 demo，但浏览器钱包无法直接访问服务器本机的 127.0.0.1 RPC，除非用户使用 SSH tunnel，或短时间有意暴露 RPC。",
      "生产化路线需要审计 circuit、接入真实发行方 attestations、真实 Zama 兼容网络配置、更严格的角色权限、监控告警，以及清晰的收益策略资金托管模型。"
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
      </nav>

      <header className="docHero">
        <div className="brandLockup heroBrand">
          <img src="/priv.png" alt="Privyields logo" />
          <div>
            <p className="eyebrow">Project Documentation / 工程文档</p>
            <h1>Privyields Technical Notes</h1>
            <p>
              A bilingual engineering document for the deployed confidential qualified-yield marketplace demo.
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
