# Qualified Investor ZK Circuit Sketch

This directory keeps the early Circom sketch for Privyields' qualification gate:

```text
private input: assetAmount
public input: threshold
statement: assetAmount >= threshold
```

The connected hackathon verifier path is now the Rust Arkworks implementation under `zk/qualified-investor`, exported to `contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol` and verified by `Groth16QualifiedInvestorRegistry`.

This Circom file is not wired into the deployed app. Keep it only as design history unless the project later chooses a Circom/snarkjs prover pipeline.
