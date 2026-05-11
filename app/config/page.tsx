import Link from "next/link";
import deploymentConfig from "@/public/deployment-config.json";

type ContractConfig = {
  label: string;
  envKey: string;
  artifact: string;
  address: string;
  transactionHash: string;
  explorerUrl: string;
};

const contractRows = Object.entries(deploymentConfig.contracts) as [string, ContractConfig][];

function formatThreshold(value: string) {
  if (!/^\d+$/.test(value)) return value;
  const raw = BigInt(value);
  const whole = raw / 1_000_000n;
  const remainder = raw % 1_000_000n;
  if (remainder === 0n) return `${whole.toLocaleString()} USDC`;
  return `${whole.toLocaleString()}.${remainder.toString().padStart(6, "0")} USDC`;
}

function AddressValue({contract}: {contract: ContractConfig}) {
  if (!contract.address) return <span className="configMissing">Not configured</span>;
  if (!contract.explorerUrl) return <code>{contract.address}</code>;

  return (
    <a href={contract.explorerUrl} rel="noreferrer" target="_blank">
      <code>{contract.address}</code>
    </a>
  );
}

export default function ConfigPage() {
  return (
    <main className="docShell">
      <nav className="docNav">
        <Link href="/">App</Link>
        <Link href="/docs">Docs</Link>
        <Link href="/slides">Slides</Link>
      </nav>

      <header className="docHero">
        <div className="brandLockup heroBrand">
          <img src="/priv.png" alt="Privyields logo" />
          <div>
            <p className="eyebrow">Deployment Config / 部署配置</p>
            <h1>Privyields Contract Addresses</h1>
            <p>
              Public frontend configuration embedded at build time. This page intentionally shows contract addresses only; deployer keys and RPC credentials are never exposed.
            </p>
          </div>
        </div>
      </header>

      <section className="docQuickFacts">
        <div>
          <span>Network</span>
          <strong>{deploymentConfig.network}</strong>
        </div>
        <div>
          <span>Chain ID</span>
          <strong>{deploymentConfig.chainId || "unknown"}</strong>
        </div>
        <div>
          <span>Registry / Threshold</span>
          <strong>
            {deploymentConfig.registryMode} / {formatThreshold(deploymentConfig.zkAssetThreshold)}
          </strong>
        </div>
      </section>

      <section className="configTable" aria-label="Contract address configuration">
        {contractRows.map(([key, contract]) => (
          <article className="configRow" key={key}>
            <div>
              <strong>{contract.label}</strong>
              <span>{contract.envKey}</span>
              <span>{contract.artifact}</span>
            </div>
            <div className="configValue">
              <AddressValue contract={contract} />
              {contract.transactionHash && <span>tx {contract.transactionHash}</span>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
