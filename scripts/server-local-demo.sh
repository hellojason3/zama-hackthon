#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RPC_HOST="${RPC_HOST:-127.0.0.1}"
RPC_PORT="${RPC_PORT:-8545}"
WEB_HOST="${WEB_HOST:-0.0.0.0}"
WEB_PORT="${WEB_PORT:-3000}"
NEXT_MODE="${NEXT_MODE:-dev}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.demo-logs}"
RPC_URL="http://127.0.0.1:${RPC_PORT}"

mkdir -p "$LOG_DIR"

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  npm ci
fi

if command -v cargo >/dev/null 2>&1; then
  cargo run --manifest-path zk/qualified-investor/Cargo.toml -- setup --out zk/qualified-investor/out
  mkdir -p contracts/zk/generated
  cp zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol contracts/zk/generated/QualifiedInvestorGroth16Verifier.sol
  cargo build --manifest-path zk/qualified-investor/Cargo.toml --release
else
  echo "WARNING: cargo is missing; frontend proof generation API will fail until Rust is installed."
fi

if [ -f "$LOG_DIR/hardhat.pid" ] && kill -0 "$(cat "$LOG_DIR/hardhat.pid")" 2>/dev/null; then
  echo "Hardhat node already running with pid $(cat "$LOG_DIR/hardhat.pid")"
else
  echo "Starting Hardhat node on ${RPC_HOST}:${RPC_PORT}"
  npx hardhat node --network hardhat --no-deploy --hostname "$RPC_HOST" --port "$RPC_PORT" \
    >"$LOG_DIR/hardhat.log" 2>&1 &
  echo "$!" > "$LOG_DIR/hardhat.pid"
fi

echo "Waiting for RPC at ${RPC_URL}"
for _ in $(seq 1 60); do
  if curl -sS -o /dev/null \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    "$RPC_URL"; then
    break
  fi
  sleep 1
done

LOCALHOST_RPC_URL="$RPC_URL" npx hardhat deploy --network localhost
node scripts/write-local-env.cjs

if [ -f "$LOG_DIR/next.pid" ] && kill -0 "$(cat "$LOG_DIR/next.pid")" 2>/dev/null; then
  echo "Next server already running with pid $(cat "$LOG_DIR/next.pid")"
else
  if [ "$NEXT_MODE" = "prod" ]; then
    npx next build --webpack
    echo "Starting Next production server on ${WEB_HOST}:${WEB_PORT}"
    npx next start --hostname "$WEB_HOST" --port "$WEB_PORT" \
      >"$LOG_DIR/next.log" 2>&1 &
  else
    echo "Starting Next dev server on ${WEB_HOST}:${WEB_PORT}"
    npx next dev --hostname "$WEB_HOST" --port "$WEB_PORT" \
      >"$LOG_DIR/next.log" 2>&1 &
  fi
  echo "$!" > "$LOG_DIR/next.pid"
fi

cat <<EOF

Privyields local demo is running.

Frontend:
  http://localhost:${WEB_PORT}

Wallet network:
  RPC URL: http://127.0.0.1:${RPC_PORT}
  Chain ID: 31337

For a remote server, prefer an SSH tunnel:
  ssh -L ${WEB_PORT}:127.0.0.1:${WEB_PORT} -L ${RPC_PORT}:127.0.0.1:${RPC_PORT} user@server

If you intentionally expose RPC directly, run with:
  RPC_HOST=0.0.0.0 npm run server:local

Logs:
  $LOG_DIR/hardhat.log
  $LOG_DIR/next.log

Stop:
  bash scripts/stop-server-local-demo.sh
EOF
