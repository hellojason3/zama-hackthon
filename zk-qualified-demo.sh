#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

OUT_DIR="${OUT_DIR:-zk/qualified-investor/out}"
USER_ADDRESS="${USER_ADDRESS:-0x70997970C51812dc3A010C7d01b50e0d17dc79C8}"
BALANCE="${BALANCE:-1500000000000}"
THRESHOLD="${THRESHOLD:-1000000000000}"
SALT="${SALT:-123456789}"

cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out "$OUT_DIR"

cargo run --manifest-path zk/qualified-investor/Cargo.toml -- prove \
  --keys "$OUT_DIR" \
  --user "$USER_ADDRESS" \
  --balance "$BALANCE" \
  --threshold "$THRESHOLD" \
  --salt "$SALT" \
  --out "$OUT_DIR/alice-proof.json"

cargo run --manifest-path zk/qualified-investor/Cargo.toml -- verify \
  --keys "$OUT_DIR" \
  --proof "$OUT_DIR/alice-proof.json"

mkdir -p contracts/zk/generated
cp "$OUT_DIR/QualifiedInvestorGroth16Verifier.sol" contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol
npx hardhat compile

cat <<EOF

Arkworks Groth16 demo completed.

Proof:
  $OUT_DIR/alice-proof.json

Generated Solidity verifier:
  contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol

To test on-chain verification:
  npm test -- --grep "Groth16"
EOF
