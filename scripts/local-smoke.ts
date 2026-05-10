import {deployments, ethers} from "hardhat";
import type {
  ConfidentialUSDC,
  MockQualifiedInvestorRegistry,
  MockUSDC,
  YieldProductMarket
} from "../types";

const USDC = 10n ** 6n;

async function main() {
  const [owner, alice] = await ethers.getSigners();

  const mockUSDCDeployment = await deployments.get("MockUSDC");
  const cUSDCDeployment = await deployments.get("ConfidentialUSDC");
  const registryDeployment = await deployments.get("MockQualifiedInvestorRegistry");
  const marketDeployment = await deployments.get("YieldProductMarket");
  const vaultDeployment = await deployments.get("ConfidentialYieldVault");

  const mockUSDC = (await ethers.getContractAt(
    "MockUSDC",
    mockUSDCDeployment.address
  )) as unknown as MockUSDC;
  const cUSDC = (await ethers.getContractAt(
    "ConfidentialUSDC",
    cUSDCDeployment.address
  )) as unknown as ConfidentialUSDC;
  const registry = (await ethers.getContractAt(
    "MockQualifiedInvestorRegistry",
    registryDeployment.address
  )) as unknown as MockQualifiedInvestorRegistry;
  const market = (await ethers.getContractAt(
    "YieldProductMarket",
    marketDeployment.address
  )) as unknown as YieldProductMarket;

  console.log("Privyields local smoke");
  console.log("owner", owner.address);
  console.log("alice", alice.address);
  console.log("MockUSDC", mockUSDCDeployment.address);
  console.log("ConfidentialUSDC", cUSDCDeployment.address);
  console.log("Registry", registryDeployment.address);
  console.log("Market", marketDeployment.address);
  console.log("Vault", vaultDeployment.address);

  const productCount = await market.productCount();
  const firstProduct = await market.getProduct(0);
  console.log("productCount", productCount.toString());
  console.log("product[0]", firstProduct.name, firstProduct.currentAprBps.toString());

  const proofCommitment = ethers.id(`alice-local-assets>=1000000:${Date.now()}`);
  await (await registry.connect(alice).submitDemoProof(proofCommitment)).wait();
  console.log("alice qualified", await registry.isQualified(alice.address));

  const mintAmount = 1_000_000n * USDC;
  await (await mockUSDC.mint(alice.address, mintAmount)).wait();
  await (await mockUSDC.connect(alice).approve(cUSDCDeployment.address, mintAmount)).wait();
  console.log("alice mock USDC", (await mockUSDC.balanceOf(alice.address)).toString());

  await (await market.publishYieldRate(0, 777)).wait();
  console.log("product[0] APR bps", (await market.getProduct(0)).currentAprBps.toString());

  try {
    await (await cUSDC.connect(alice).wrap(alice.address, 1_000n * USDC)).wait();
    console.log("local cUSDC wrap succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("local cUSDC wrap skipped/failed");
    console.log(message.split("\n")[0]);
    console.log("Expected on a plain Hardhat chain without Zama fhEVM local coprocessor contracts.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
