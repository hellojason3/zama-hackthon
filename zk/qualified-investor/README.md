# Privyields Qualified Investor Proof

Rust + arkworks Groth16 proof for the Privyields asset gate.

Statement:

```text
private:
  balance
  salt
  diff = balance - threshold

public:
  commitment
  threshold
  userAddressAsField
  nullifierHash

constraints:
  balance = threshold + diff
  balance and diff are u64
  commitment = MiMC(balance, salt, userAddressAsField)
  nullifierHash = MiMC(salt, userAddressAsField)
```

This is a hackathon-friendly Arkworks path. The MiMC constants are deterministic demo constants and should be reviewed before production use.

## Commands

```bash
cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out zk/qualified-investor/out

cargo run --manifest-path zk/qualified-investor/Cargo.toml -- prove \
  --keys zk/qualified-investor/out \
  --user 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --balance 1500000000000 \
  --threshold 1000000000000 \
  --salt 123456789 \
  --out zk/qualified-investor/out/alice-proof.json

cargo run --manifest-path zk/qualified-investor/Cargo.toml -- verify \
  --keys zk/qualified-investor/out \
  --proof zk/qualified-investor/out/alice-proof.json
```

`setup` also writes a Solidity verifier to:

```text
zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol
```
