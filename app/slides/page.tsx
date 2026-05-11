import Link from "next/link";

const slides = [
  {
    kicker: "Privyields",
    title: "Confidential Qualified Yield Market",
    body: "A Zama-powered yield marketplace where a user proves they are qualified, allocates confidential cUSDC, receives encrypted rewards, and decrypts only their own results.",
    points: ["ZK proves eligibility", "FHE protects allocation and reward amounts", "User-controlled disclosure at the end of the flow"]
  },
  {
    kicker: "Problem",
    title: "Qualified yield access exposes too much",
    body: "Private-market and qualified-investor workflows often expose wealth signals, position sizes, and portfolio movements to every operational system in the path.",
    points: ["Eligibility checks reveal more than they need", "Allocation size becomes public operational data", "Reward history can expose strategy behavior"]
  },
  {
    kicker: "Solution",
    title: "Separate eligibility from private capital movement",
    body: "Privyields keeps qualification as a one-time proof and then routes deposits, principal, rewards, and final balance checks through encrypted cUSDC handles.",
    points: ["Asset-threshold proof without publishing the asset amount", "Encrypted deposit into a selected product vault", "Reward and balance decrypt only after user signature"]
  },
  {
    kicker: "Experience",
    title: "A guided demo instead of a dense dashboard",
    body: "The frontend is now a step-by-step wizard: intro, wallet, qualification, product selection, mint, wrap, allocation, yield, claim, and final cUSDC balance decrypt.",
    points: ["One task per screen", "Visible progress and debug events", "Final proof that the claimed reward reached the confidential balance"]
  },
  {
    kicker: "Architecture",
    title: "Five on-chain building blocks",
    body: "The demo composes a public mock USDC, a Zama ERC-7984 cUSDC wrapper, a Groth16 qualification registry, a permissionless product market, and a confidential yield vault.",
    points: ["MockUSDC funds fresh demo wallets", "ConfidentialUSDC stores encrypted balances", "ConfidentialYieldVault stores encrypted principal and rewards"]
  },
  {
    kicker: "Market",
    title: "Public products, private allocation",
    body: "Any connected wallet can issue a product entry. Qualified users then browse public product metadata, while each user's allocation amount remains encrypted.",
    points: ["Permissionless product issuance", "Qualification before product selection", "Ready for tier-gated product sets"]
  },
  {
    kicker: "Live Flow",
    title: "From proof to confidential claim",
    body: "A user generates a Groth16 asset-threshold proof, mints mock USDC, wraps it into cUSDC, encrypts a deposit, accrues a reward, decrypts the reward handle, and claims cUSDC.",
    points: ["Sepolia wallet signs every live step", "Zama Relayer SDK encrypts deposit input", "User decrypt reveals only the user's own reward"]
  },
  {
    kicker: "Balance",
    title: "MetaMask cannot show confidential cUSDC",
    body: "cUSDC balances are encrypted handles, not public ERC-20 balanceOf values. The final page decrypts the user's own cUSDC balance and browser-recorded history after wallet signatures.",
    points: ["MetaMask shows ETH and mock USDC", "The dApp decrypts current balance with Zama user decrypt", "History handles can be batch decrypted with one signature"]
  },
  {
    kicker: "Demo Scope",
    title: "Built for Sepolia and recorded demos",
    body: "The current deployment runs a production Next.js app behind Caddy at privyields.xyz, wired to Sepolia contracts and Zama's Sepolia FHE configuration.",
    points: ["Production Next.js build, not npm dev", "Config page shows deployed contract addresses", "Frontend-only redeploy is available for UI updates"]
  },
  {
    kicker: "Boundaries",
    title: "Clear demo assumptions",
    body: "The proof system, confidential token flow, and encrypted accounting are real demo code. The credential process, mock USDC funding, and yield strategy custody remain intentionally simplified.",
    points: ["Deterministic Arkworks setup for repeatable builds", "Issuer commitment registration is a demo attestation layer", "Production needs audited circuits, custody controls, and monitoring"]
  }
];

export default function SlidesPage() {
  return (
    <main className="docShell slideShell">
      <nav className="docNav">
        <Link href="/">App</Link>
        <Link href="/docs">Docs</Link>
        <Link href="/config">Config</Link>
      </nav>

      <section className="slideHero">
        <div className="brandLockup heroBrand">
          <img src="/priv.png" alt="Privyields logo" />
          <div>
            <p className="eyebrow">Project Slides / 项目介绍</p>
            <h1>Privyields</h1>
            <p>
              Confidential qualified-yield marketplace built with Zama. Scroll through the browser deck for the live demo story.
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
