import {expect} from "chai";
import {ethers} from "hardhat";
import type {ConfidentialYieldVault, MockQualifiedInvestorRegistry, YieldProductMarket} from "../types";

describe("Privyields market and qualification registry", function () {
  it("lists the ten default product markets", async function () {
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;

    expect(await market.productCount()).to.equal(10n);

    const products = await market.getProducts();
    expect(products).to.have.length(10);
    expect(products[0].name).to.equal("US Treasury Bills");
    expect(products[7].category).to.equal("Compute");
  });

  it("keeps deposit recording restricted to the vault", async function () {
    const [owner, vault, alice] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;

    await expect(market.recordDeposit(alice.address, 0)).to.be.revertedWith("market: only vault");

    await market.connect(owner).setVault(vault.address);
    await expect(market.connect(vault).recordDeposit(alice.address, 0))
      .to.emit(market, "DepositRecorded")
      .withArgs(alice.address, 0, 1);

    expect(await market.depositCountByProduct(0)).to.equal(1n);
    expect(await market.userDepositCount(alice.address, 0)).to.equal(1n);
  });

  it("allows any wallet to list a yield product", async function () {
    const [, alice] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;

    await expect(market.connect(alice).listProduct("Community Credit Pool", "Private Credit", "Alice Capital", 825))
      .to.emit(market, "ProductListed")
      .withArgs(10, "Community Credit Pool", "Private Credit", "Alice Capital");

    expect(await market.productCount()).to.equal(11n);
    const product = await market.getProduct(10);
    expect(product.name).to.equal("Community Credit Pool");
    expect(product.currentAprBps).to.equal(825);
  });

  it("rejects listed products above the APR cap", async function () {
    const [, alice] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;

    await expect(market.connect(alice).listProduct("Invalid Pool", "Credit", "Alice", 10_001)).to.be.revertedWith(
      "market: apr too high"
    );
  });

  it("allows any wallet to publish demo APR updates", async function () {
    const [, alice] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;

    await expect(market.connect(alice).publishYieldRate(3, 650)).to.emit(market, "YieldRatePublished");

    const product = await market.getProduct(3);
    expect(product.currentAprBps).to.equal(650);
  });

  it("stores demo proof qualification without publishing the private asset amount", async function () {
    const [, alice] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("MockQualifiedInvestorRegistry");
    const registry = (await Registry.deploy()) as unknown as MockQualifiedInvestorRegistry;

    expect(await registry.isQualified(alice.address)).to.equal(false);

    const proofCommitment = ethers.id("alice assets over 1m");
    await expect(registry.connect(alice).submitDemoProof(proofCommitment))
      .to.emit(registry, "DemoProofAccepted")
      .withArgs(alice.address, proofCommitment, 1_000_000_000_000n);

    expect(await registry.isQualified(alice.address)).to.equal(true);
  });

  it("rejects reward accrual periods above the demo cap", async function () {
    const [owner, alice] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;
    const Registry = await ethers.getContractFactory("MockQualifiedInvestorRegistry");
    const registry = (await Registry.deploy()) as unknown as MockQualifiedInvestorRegistry;
    const Vault = await ethers.getContractFactory("ConfidentialYieldVault");
    const vault = (await Vault.deploy(
      owner.address,
      await market.getAddress(),
      await registry.getAddress()
    )) as unknown as ConfidentialYieldVault;

    expect(await vault.MAX_REWARD_PERIODS()).to.equal(365n);
    await expect(vault.accrueReward(alice.address, 0, 366)).to.be.revertedWith("vault: periods too high");
  });

  it("keeps demo reward accrual restricted to the user or owner", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("YieldProductMarket");
    const market = (await Market.deploy()) as unknown as YieldProductMarket;
    const Registry = await ethers.getContractFactory("MockQualifiedInvestorRegistry");
    const registry = (await Registry.deploy()) as unknown as MockQualifiedInvestorRegistry;
    const Vault = await ethers.getContractFactory("ConfidentialYieldVault");
    const vault = (await Vault.deploy(
      owner.address,
      await market.getAddress(),
      await registry.getAddress()
    )) as unknown as ConfidentialYieldVault;

    await expect(vault.connect(bob).accrueReward(alice.address, 0, 1)).to.be.revertedWith("vault: only user or owner");
  });
});
