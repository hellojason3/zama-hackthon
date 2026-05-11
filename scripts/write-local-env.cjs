const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const network = process.argv[2] || process.env.DEPLOY_NETWORK || "localhost";
const deploymentDir = path.join(root, "deployments", network);

const deploymentItems = [
  {key: "mockUSDC", label: "Mock USDC", envKey: "NEXT_PUBLIC_MOCK_USDC", files: ["MockUSDC.json"]},
  {key: "cUSDC", label: "Confidential USDC", envKey: "NEXT_PUBLIC_CUSDC", files: ["ConfidentialUSDC.json"]},
  {
    key: "registry",
    label: "Qualification Registry",
    envKey: "NEXT_PUBLIC_QUALIFICATION_REGISTRY",
    files: ["Groth16QualifiedInvestorRegistry.json", "MockQualifiedInvestorRegistry.json"]
  },
  {
    key: "groth16Verifier",
    label: "Groth16 Verifier",
    envKey: "NEXT_PUBLIC_GROTH16_VERIFIER",
    files: ["QualifiedInvestorGroth16Verifier.json"],
    optional: true
  },
  {key: "market", label: "Yield Product Market", envKey: "NEXT_PUBLIC_MARKET", files: ["YieldProductMarket.json"]},
  {key: "vault", label: "Confidential Yield Vault", envKey: "NEXT_PUBLIC_VAULT", files: ["ConfidentialYieldVault.json"]}
];

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

const chainIdPath = path.join(deploymentDir, ".chainId");
const chainId = fs.existsSync(chainIdPath) ? fs.readFileSync(chainIdPath, "utf8").trim() : "";
const explorerBase = network === "sepolia" ? "https://sepolia.etherscan.io/address/" : "";
const contracts = {};

const lines = deploymentItems.flatMap((item) => {
  const {envKey, files} = item;
  let {artifact, file} = resolveArtifact(files);

  if (!artifact && envKey === "NEXT_PUBLIC_MOCK_USDC") {
    const cUSDC = readArtifact("ConfidentialUSDC.json");
    const mockUSDC = cUSDC?.args?.[0];
    if (mockUSDC) {
      contracts[item.key] = {
        label: item.label,
        envKey,
        artifact: "ConfidentialUSDC.json args[0]",
        address: mockUSDC,
        transactionHash: "",
        explorerUrl: explorerBase ? `${explorerBase}${mockUSDC}` : ""
      };
      return [`${envKey}=${mockUSDC}`];
    }
  }

  if (!artifact) {
    if (item.optional) {
      contracts[item.key] = {
        label: item.label,
        envKey,
        artifact: file,
        address: "",
        transactionHash: "",
        explorerUrl: ""
      };
      return [];
    }

    throw new Error(`Missing deployment artifact: ${path.join(deploymentDir, file)}`);
  }

  if (!artifact.address) {
    throw new Error(`Deployment artifact has no address: ${path.join(deploymentDir, file)}`);
  }

  contracts[item.key] = {
    label: item.label,
    envKey,
    artifact: file,
    address: artifact.address,
    transactionHash: artifact.transactionHash || artifact.receipt?.transactionHash || "",
    explorerUrl: explorerBase ? `${explorerBase}${artifact.address}` : ""
  };

  return [`${envKey}=${artifact.address}`];
});

const registryMode = readArtifact("Groth16QualifiedInvestorRegistry.json") ? "groth16" : "mock";
lines.push(`NEXT_PUBLIC_REGISTRY_MODE=${registryMode}`);
lines.push("NEXT_PUBLIC_ZK_ASSET_THRESHOLD=1000000000000");
lines.push(`NEXT_PUBLIC_CHAIN_NAME=${network}`);

const output = `${lines.join("\n")}\n`;
fs.writeFileSync(path.join(root, ".env.local"), output);
const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, {recursive: true});
fs.writeFileSync(
  path.join(publicDir, "deployment-config.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      network,
      chainId,
      registryMode,
      zkAssetThreshold: "1000000000000",
      contracts
    },
    null,
    2
  )}\n`
);
console.log(output);
