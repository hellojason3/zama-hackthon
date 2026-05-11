#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-zama-hackthon}"
REMOTE_HOSTNAME="${REMOTE_HOSTNAME:-136.110.23.143}"
REMOTE_IDENTITY="${REMOTE_IDENTITY:-$HOME/.ssh/id_bridge_google}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
REMOTE_DIR="${REMOTE_DIR:-~/privyields}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-3000}"
RPC_HOST="${RPC_HOST:-127.0.0.1}"
RPC_PORT="${RPC_PORT:-8545}"
DEPLOY_NETWORK="${DEPLOY_NETWORK:-${1:-localhost}}"
SKIP_CONTRACT_DEPLOY="${SKIP_CONTRACT_DEPLOY:-0}"
PROVER_BIN="zk/qualified-investor/target/release/privyields-qualified-investor"

SSH_BASE=(ssh -F "$SSH_CONFIG" -i "$REMOTE_IDENTITY" -o IdentitiesOnly=yes)
RSYNC_SSH="ssh -F $SSH_CONFIG -i $REMOTE_IDENTITY -o IdentitiesOnly=yes"

echo "Preparing Arkworks Groth16 assets"
if command -v cargo >/dev/null 2>&1; then
  cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out zk/qualified-investor/out
  mkdir -p contracts/zk/generated
  cp zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol
  cargo build --manifest-path zk/qualified-investor/Cargo.toml --release
else
  echo "cargo is not installed locally; using the checked-in/generated Solidity verifier if present."
fi

if [ "$DEPLOY_NETWORK" != "localhost" ] && [ "$SKIP_CONTRACT_DEPLOY" != "1" ]; then
  echo "Deploying contracts to ${DEPLOY_NETWORK} from local machine"
  npx hardhat compile
  npx hardhat deploy --network "$DEPLOY_NETWORK"
elif [ "$DEPLOY_NETWORK" != "localhost" ]; then
  if [ ! -d "deployments/${DEPLOY_NETWORK}" ]; then
    echo "Missing deployments/${DEPLOY_NETWORK}; cannot skip contract deployment."
    exit 1
  fi
  echo "Skipping contract deployment; using existing deployments/${DEPLOY_NETWORK} artifacts"
fi

echo "Deploying Privyields to ${REMOTE_HOST} (${REMOTE_HOSTNAME})"
echo "Remote dir: ${REMOTE_DIR}"
echo "Network: ${DEPLOY_NETWORK}"

"${SSH_BASE[@]}" "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}"

rsync -az --delete \
  -e "$RSYNC_SSH" \
  --exclude ".git/" \
  --exclude ".next/" \
  --exclude ".demo-logs/" \
  --exclude "artifacts/" \
  --exclude "cache/" \
  --exclude "coverage/" \
  --exclude "deployments/localhost/" \
  --exclude "dist/" \
  --exclude "node_modules/" \
  --exclude "types/" \
  --exclude "zk/qualified-investor/target/" \
  --exclude ".env" \
  --exclude ".env.local" \
  --exclude ".env.*.local" \
  --exclude "tsconfig.tsbuildinfo" \
  ./ "${REMOTE_HOST}:${REMOTE_DIR}/"

if [ -x "$PROVER_BIN" ]; then
  "${SSH_BASE[@]}" "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}/zk/qualified-investor/target/release"
  rsync -az \
    -e "$RSYNC_SSH" \
    "$PROVER_BIN" \
    "${REMOTE_HOST}:${REMOTE_DIR}/zk/qualified-investor/target/release/"
fi

if [ "$DEPLOY_NETWORK" = "localhost" ]; then
  "${SSH_BASE[@]}" "$REMOTE_HOST" "\
    set -euo pipefail; \
    cd ${REMOTE_DIR}; \
    npm ci; \
    if command -v cargo >/dev/null 2>&1; then \
      cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out zk/qualified-investor/out; \
      mkdir -p contracts/zk/generated; \
      cp zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol; \
      cargo build --manifest-path zk/qualified-investor/Cargo.toml --release; \
    elif [ -x zk/qualified-investor/target/release/privyields-qualified-investor ]; then \
      echo 'Using synced Arkworks prover binary.'; \
    else \
      echo 'WARNING: cargo is missing; frontend proof generation API will fail until Rust is installed.'; \
    fi; \
    npx hardhat compile; \
    bash scripts/stop-server-local-demo.sh || true; \
    NEXT_MODE=prod WEB_HOST=${WEB_HOST} WEB_PORT=${WEB_PORT} RPC_HOST=${RPC_HOST} RPC_PORT=${RPC_PORT} bash scripts/server-local-demo.sh \
  "
else
  "${SSH_BASE[@]}" "$REMOTE_HOST" "\
    set -euo pipefail; \
    cd ${REMOTE_DIR}; \
    npm ci; \
    if command -v cargo >/dev/null 2>&1; then \
      cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out zk/qualified-investor/out; \
      mkdir -p contracts/zk/generated; \
      cp zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol; \
      cargo build --manifest-path zk/qualified-investor/Cargo.toml --release; \
    elif [ -x zk/qualified-investor/target/release/privyields-qualified-investor ]; then \
      echo 'Using synced Arkworks prover binary.'; \
    else \
      echo 'cargo or synced Arkworks prover binary is required for proof generation'; \
      exit 1; \
    fi; \
    npx hardhat compile; \
    node scripts/write-local-env.cjs ${DEPLOY_NETWORK}; \
    bash scripts/stop-server-local-demo.sh || true; \
    mkdir -p .demo-logs; \
    npx next build --webpack; \
    npx next start --hostname ${WEB_HOST} --port ${WEB_PORT} >.demo-logs/next.log 2>&1 & \
    echo \$! > .demo-logs/next.pid \
  "
fi

cat <<EOF

Deploy finished.

Server:
  Host alias: ${REMOTE_HOST}
  Hostname:   ${REMOTE_HOSTNAME}
  App dir:    ${REMOTE_DIR}
  Network:    ${DEPLOY_NETWORK}

Frontend upstream:
  http://${WEB_HOST}:${WEB_PORT}

$(if [ "$DEPLOY_NETWORK" = "localhost" ]; then cat <<LOCAL
Hardhat RPC upstream:
  http://${RPC_HOST}:${RPC_PORT}

If Caddy already proxies your HTTPS domain to port ${WEB_PORT}, open that HTTPS URL.

For wallet access to the server-local RPC, use:
  ssh -F ${SSH_CONFIG} -i ${REMOTE_IDENTITY} -L ${WEB_PORT}:127.0.0.1:${WEB_PORT} -L ${RPC_PORT}:127.0.0.1:${RPC_PORT} ${REMOTE_HOST}
LOCAL
else cat <<REMOTE
Sepolia frontend is using deployments/${DEPLOY_NETWORK} addresses.
Sepolia contracts are deployed from the local machine before syncing artifacts to the server.
Make sure the local machine has Hardhat vars or environment variables configured:
  DEPLOYER_PRIVATE_KEY or MNEMONIC
  SEPOLIA_RPC_URL, ALCHEMY_API_KEY, or INFURA_API_KEY
If contracts are already deployed and deployments/${DEPLOY_NETWORK} is current, use:
  SKIP_CONTRACT_DEPLOY=1 DEPLOY_NETWORK=${DEPLOY_NETWORK} ./deploy-server.sh
REMOTE
fi)

Stop remote app:
  ssh -F ${SSH_CONFIG} -i ${REMOTE_IDENTITY} ${REMOTE_HOST} "cd ${REMOTE_DIR} && bash scripts/stop-server-local-demo.sh"
EOF
