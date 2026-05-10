import {deployments, ethers} from "hardhat";
import type {MockUSDC} from "../types";

async function main() {
  const [deployer] = await ethers.getSigners();
  const target = process.env.DEMO_WALLET ?? deployer.address;
  const amount = process.env.DEMO_USDC_AMOUNT ?? "1000000";

  const mockUSDCDeployment = await deployments.get("MockUSDC");
  const mockUSDC = (await ethers.getContractAt(
    "MockUSDC",
    mockUSDCDeployment.address
  )) as unknown as MockUSDC;
  const parsedAmount = ethers.parseUnits(amount, 6);

  console.log(`Minting ${amount} MockUSDC to ${target}`);
  console.log(`MockUSDC: ${mockUSDCDeployment.address}`);

  const tx = await mockUSDC.mint(target, parsedAmount);
  await tx.wait();

  const balance = await mockUSDC.balanceOf(target);
  console.log(`Balance: ${ethers.formatUnits(balance, 6)} MockUSDC`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
