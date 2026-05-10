const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const network = process.argv[2] || process.env.DEPLOY_NETWORK || "localhost";
const deploymentDir = path.join(root, "deployments", network);

const deployments = {
  NEXT_PUBLIC_MOCK_USDC: ["MockUSDC.json"],
  NEXT_PUBLIC_CUSDC: ["ConfidentialUSDC.json"],
  NEXT_PUBLIC_QUALIFICATION_REGISTRY: ["Groth16QualifiedInvestorRegistry.json", "MockQualifiedInvestorRegistry.json"],
  NEXT_PUBLIC_GROTH16_VERIFIER: ["QualifiedInvestorGroth16Verifier.json"],
  NEXT_PUBLIC_MARKET: ["YieldProductMarket.json"],
  NEXT_PUBLIC_VAULT: ["ConfidentialYieldVault.json"]
};

const readArtifact = (file) => {
  const filePath = path.join(deploymentDir, file);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const resolveArtifact = (files) => {
  for (const file of files) {
    const artifact = readArtifact(file);
    if (artifact) {
      return {artifact, file};
    }
  }

  return {artifact: null, file: files[0]};
};

const lines = Object.entries(deployments).flatMap(([key, files]) => {
  let {artifact, file} = resolveArtifact(files);

  if (!artifact && key === "NEXT_PUBLIC_MOCK_USDC") {
    const cUSDC = readArtifact("ConfidentialUSDC.json");
    const mockUSDC = cUSDC?.args?.[0];
    if (mockUSDC) {
      return [`${key}=${mockUSDC}`];
    }
  }

  if (!artifact) {
    if (key === "NEXT_PUBLIC_GROTH16_VERIFIER") {
      return [];
    }

    throw new Error(`Missing deployment artifact: ${path.join(deploymentDir, file)}`);
  }

  if (!artifact.address) {
    throw new Error(`Deployment artifact has no address: ${path.join(deploymentDir, file)}`);
  }

  return [`${key}=${artifact.address}`];
});

const registryMode = readArtifact("Groth16QualifiedInvestorRegistry.json") ? "groth16" : "mock";
lines.push(`NEXT_PUBLIC_REGISTRY_MODE=${registryMode}`);
lines.push("NEXT_PUBLIC_ZK_ASSET_THRESHOLD=1000000000000");
lines.push(`NEXT_PUBLIC_CHAIN_NAME=${network}`);

const output = `${lines.join("\n")}\n`;
fs.writeFileSync(path.join(root, ".env.local"), output);
console.log(output);
