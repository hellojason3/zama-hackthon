import type {HardhatRuntimeEnvironment} from "hardhat/types";
import type {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, get} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("MockUSDC", {
    from: deployer,
    args: [],
    log: true
  });

  const mockUSDC = await get("MockUSDC");

  await deploy("ConfidentialUSDC", {
    from: deployer,
    args: [mockUSDC.address],
    log: true
  });

  await deploy("MockQualifiedInvestorRegistry", {
    from: deployer,
    args: [],
    log: true
  });

  await deploy("QualifiedInvestorGroth16Verifier", {
    from: deployer,
    args: [],
    log: true
  });

  const verifier = await get("QualifiedInvestorGroth16Verifier");

  await deploy("Groth16QualifiedInvestorRegistry", {
    from: deployer,
    args: [verifier.address],
    log: true
  });

  await deploy("YieldProductMarket", {
    from: deployer,
    args: [],
    log: true
  });

  const cUSDC = await get("ConfidentialUSDC");
  const registry = await get("Groth16QualifiedInvestorRegistry");
  const market = await get("YieldProductMarket");

  await deploy("ConfidentialYieldVault", {
    from: deployer,
    args: [cUSDC.address, market.address, registry.address],
    log: true
  });

  const vault = await get("ConfidentialYieldVault");

  await execute("YieldProductMarket", {from: deployer, log: true}, "setVault", vault.address);
};

export default func;
func.tags = ["Privyields"];
