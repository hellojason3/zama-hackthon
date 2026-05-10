import Link from "next/link";

const slides = [
  {
    kicker: "Privyields",
    title: "Confidential Qualified Yield Market",
    body: "A Zama-powered demo for private access control, encrypted allocation, encrypted reward accounting, and user-controlled disclosure.",
    points: ["ZK proves qualification", "FHE protects allocation amounts", "cUSDC carries encrypted value"]
  },
  {
    kicker: "Problem",
    title: "Qualified yield access leaks too much",
    body: "Traditional qualified-investor workflows reveal identity, wealth signals, allocation sizes, and portfolio movement across many operational systems.",
    points: ["Qualification and allocation are usually coupled", "Sensitive balances become operational data", "Users lose control over what is disclosed"]
  },
  {
    kicker: "Solution",
    title: "Separate eligibility from private capital movement",
    body: "Privyields keeps eligibility as a proof, then routes allocation and reward flows through confidential token handles.",
    points: ["Asset threshold proof without publishing asset amount", "Encrypted deposit into selected yield products", "Encrypted rewards that only the user can decrypt"]
  },
  {
    kicker: "Architecture",
    title: "Five on-chain building blocks",
    body: "The demo composes a mock USDC rail, a confidential cUSDC wrapper, a qualification registry, a yield product market, and a confidential vault.",
    points: ["MockUSDC for demo funding", "ConfidentialUSDC for encrypted balances", "ConfidentialYieldVault for private principal and reward state"]
  },
  {
    kicker: "User Flow",
    title: "From proof to encrypted claim",
    body: "A user proves qualification, wraps public demo USDC into cUSDC, encrypts a deposit amount, routes it to a product, decrypts their own reward, and claims cUSDC.",
    points: ["Submit demo ZK commitment", "Encrypt deposit with Zama Relayer SDK", "Request and perform user decrypt for reward"]
  },
  {
    kicker: "Market",
    title: "Ten yield product lanes",
    body: "The app presents a multi-product marketplace: T-bills, tokenized real estate, staking, mining cashflow, private credit, basis strategies, DeFi credit, compute revenue, equities, and money markets.",
    points: ["Product metadata is public", "User amount remains confidential", "APR updates can be published by the strategy operator"]
  },
  {
    kicker: "Demo Scope",
    title: "Built for a live hackathon demo",
    body: "The current deployment runs a production Next.js frontend behind Caddy, with demo contracts and local-server mode for fast iteration.",
    points: ["Next production server on privyields.xyz", "Server-local Hardhat demo chain", "Sepolia path documented for live FHE flow"]
  },
  {
    kicker: "Next Steps",
    title: "Move from demo to production architecture",
    body: "The roadmap is to replace the demo registry with a real verifier, deploy to Sepolia or mainnet-compatible environments, and harden strategy custody and publishing permissions.",
    points: ["Wire production ZK verifier", "Use live Zama Sepolia coprocessor contracts", "Add operational monitoring and permissioning"]
  }
];

export default function SlidesPage() {
  return (
    <main className="docShell slideShell">
      <nav className="docNav">
        <Link href="/">App</Link>
        <Link href="/docs">Docs</Link>
      </nav>

      <section className="slideHero">
        <div className="brandLockup heroBrand">
          <img src="/priv.png" alt="Privyields logo" />
          <div>
            <p className="eyebrow">Project Slides / 项目介绍</p>
            <h1>Privyields</h1>
            <p>
              Confidential Qualified Yield Market built with Zama. Scroll through the deck directly in the browser.
            </p>
          </div>
        </div>
      </section>

      <section className="slideDeck" aria-label="Privyields slide deck">
        {slides.map((slide, index) => (
          <article className="slideCard" key={slide.title}>
            <div className="slideNumber">{String(index + 1).padStart(2, "0")}</div>
            <p className="eyebrow">{slide.kicker}</p>
            <h2>{slide.title}</h2>
            <p>{slide.body}</p>
            <ul>
              {slide.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
