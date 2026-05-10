import {expect} from "chai";
import {ethers} from "hardhat";
import type {MockQualifiedInvestorRegistry, YieldProductMarket} from "../types";

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
});
