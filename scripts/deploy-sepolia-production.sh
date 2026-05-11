#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-sepolia-production.sh
  scripts/deploy-sepolia-production.sh --frontend-only

Environment:
  DEPLOYER_PRIVATE_KEY=0x...      Required for full contract deploy.
  SEPOLIA_RPC_URL=https://...     Preferred RPC setting.
  ALCHEMY_API_KEY=...             Used when SEPOLIA_RPC_URL is unset.
  INFURA_API_KEY=...              Used when SEPOLIA_RPC_URL and ALCHEMY_API_KEY are unset.
  MIN_DEPLOYER_ETH=0.02           Optional balance guard.

Optional local env file:
  .env.sepolia.local              Sourced automatically and ignored by git.
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ -f ".env.sepolia.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.sepolia.local"
  set +a
fi

if [ -z "${SEPOLIA_RPC_URL:-}" ]; then
  if [ -n "${ALCHEMY_API_KEY:-}" ]; then
    export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
  elif [ -n "${INFURA_API_KEY:-}" ]; then
    export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/${INFURA_API_KEY}"
  fi
fi

case "${1:-}" in
  "")
    export SKIP_CONTRACT_DEPLOY=0
    ;;
  "--frontend-only")
    export SKIP_CONTRACT_DEPLOY=1
    ;;
  *)
    usage
    exit 1
    ;;
esac

export DEPLOY_NETWORK=sepolia

if [ "$SKIP_CONTRACT_DEPLOY" != "1" ]; then
  node scripts/check-sepolia-deploy-env.cjs
else
  echo "Skipping contract deployment; existing deployments/sepolia artifacts will be used."
fi

exec ./deploy-server.sh
