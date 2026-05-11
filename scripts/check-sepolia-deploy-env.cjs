const {JsonRpcProvider, Wallet, formatEther, parseEther} = require("ethers");

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const minEth = process.env.MIN_DEPLOYER_ETH || "0.02";

if (!rpcUrl) {
  fail("SEPOLIA_RPC_URL is required. Set SEPOLIA_RPC_URL, ALCHEMY_API_KEY, or INFURA_API_KEY.");
}

if (!rawPrivateKey) {
  fail("DEPLOYER_PRIVATE_KEY is required. This script intentionally avoids falling back to the default mnemonic.");
}

const privateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  fail("DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key.");
}

const main = async () => {
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    fail(`RPC endpoint is chain ${network.chainId.toString()}, expected Sepolia chain 11155111.`);
  }

  const wallet = new Wallet(privateKey);
  const balance = await provider.getBalance(wallet.address);
  const minBalance = parseEther(minEth);

  console.log(`Sepolia deployer: ${wallet.address}`);
  console.log(`Sepolia balance:  ${formatEther(balance)} ETH`);
  console.log(`Minimum needed:   ${minEth} ETH`);

  if (balance < minBalance) {
    fail(`insufficient Sepolia ETH for deployment. Fund ${wallet.address} and retry.`);
  }
};

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
