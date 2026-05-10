import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";

import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

const MNEMONIC = process.env.MNEMONIC ?? vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY = process.env.INFURA_API_KEY ?? vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
const DEPLOYER_PRIVATE_KEY_RAW = process.env.DEPLOYER_PRIVATE_KEY ?? vars.get("DEPLOYER_PRIVATE_KEY", "");
const LOCALHOST_RPC_URL = process.env.LOCALHOST_RPC_URL ?? "http://127.0.0.1:8545";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ?? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`;

const DEPLOYER_PRIVATE_KEY =
  DEPLOYER_PRIVATE_KEY_RAW && DEPLOYER_PRIVATE_KEY_RAW.startsWith("0x")
    ? DEPLOYER_PRIVATE_KEY_RAW
    : DEPLOYER_PRIVATE_KEY_RAW
      ? `0x${DEPLOYER_PRIVATE_KEY_RAW}`
      : "";

if (DEPLOYER_PRIVATE_KEY && !/^0x[0-9a-fA-F]{64}$/.test(DEPLOYER_PRIVATE_KEY)) {
  throw new Error("DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key");
}

const sepoliaAccounts = DEPLOYER_PRIVATE_KEY
  ? [DEPLOYER_PRIVATE_KEY]
  : {
      mnemonic: MNEMONIC,
      path: "m/44'/60'/0'/0/",
      count: 10,
    };

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    localhost: {
      url: LOCALHOST_RPC_URL,
      chainId: 31337,
    },
    sepolia: {
      accounts: sepoliaAccounts,
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
