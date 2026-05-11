import fs from "fs";
import path from "path";
import {expect} from "chai";
import {ethers} from "hardhat";
import type {Groth16QualifiedInvestorRegistry} from "../types";

type ProofFixture = {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  public_inputs: [string, string, string, string];
  commitment: string;
};

const toBigIntArray = (values: readonly string[]) => values.map((value) => BigInt(value));

describe("Groth16 qualified investor registry", function () {
  it("accepts an arkworks BN254 proof fixture on-chain", async function () {
    const proofPath = path.join(__dirname, "..", "zk", "qualified-investor", "out", "alice-proof.json");
    if (!fs.existsSync(proofPath)) {
      this.skip();
    }

    const [, alice] = await ethers.getSigners();
    const fixture = JSON.parse(fs.readFileSync(proofPath, "utf8")) as ProofFixture;

    const Verifier = await ethers.getContractFactory("QualifiedInvestorGroth16Verifier");
    const verifier = await Verifier.deploy();

    const Registry = await ethers.getContractFactory("Groth16QualifiedInvestorRegistry");
    const registry = (await Registry.deploy(
      await verifier.getAddress()
    )) as unknown as Groth16QualifiedInvestorRegistry;

    await registry.connect(alice).registerCommitment(BigInt(fixture.commitment));

    await expect(
      registry.connect(alice).proveQualified(
        toBigIntArray(fixture.proof.a) as [bigint, bigint],
        fixture.proof.b.map((row) => toBigIntArray(row)) as [[bigint, bigint], [bigint, bigint]],
        toBigIntArray(fixture.proof.c) as [bigint, bigint],
        toBigIntArray(fixture.public_inputs) as [bigint, bigint, bigint, bigint]
      )
    ).to.emit(registry, "QualificationProved");

    expect(await registry.isQualified(alice.address)).to.equal(true);
  });
});
