#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE_HOST="${REMOTE_HOST:-zama-hackthon}"
REMOTE_IDENTITY="${REMOTE_IDENTITY:-$HOME/.ssh/id_bridge_google}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
REMOTE_DIR="${REMOTE_DIR:-~/privyields}"
VIDEO_NAME="${VIDEO_NAME:-privyields-demo.mp4}"
PUBLIC_DIR="public"
LOCAL_TARGET="${PUBLIC_DIR}/${VIDEO_NAME}"

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-demo-video.sh /path/to/demo.mp4
  npm run deploy:video -- /path/to/demo.mp4

Environment:
  REMOTE_HOST=zama-hackthon
  REMOTE_IDENTITY=$HOME/.ssh/id_bridge_google
  SSH_CONFIG=$HOME/.ssh/config
  REMOTE_DIR=~/privyields
  VIDEO_NAME=privyields-demo.mp4

Publishes:
  https://privyields.xyz/privyields-demo.mp4
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ] || [ -z "${1:-}" ]; then
  usage
  exit 0
fi

SOURCE="$1"

if [ ! -f "$SOURCE" ]; then
  echo "Video file not found: ${SOURCE}" >&2
  exit 1
fi

case "$SOURCE" in
  *.mp4) ;;
  *) echo "Warning: source file does not end with .mp4; deploying it as ${VIDEO_NAME}" >&2 ;;
esac

mkdir -p "$PUBLIC_DIR"

SOURCE_DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
SOURCE_ABS="${SOURCE_DIR}/$(basename "$SOURCE")"
TARGET_ABS="$(pwd)/${LOCAL_TARGET}"

if [ "$SOURCE_ABS" != "$TARGET_ABS" ]; then
  cp "$SOURCE_ABS" "$LOCAL_TARGET"
fi

chmod 0644 "$LOCAL_TARGET"

SSH_BASE=(ssh -F "$SSH_CONFIG" -i "$REMOTE_IDENTITY" -o IdentitiesOnly=yes)
SCP_BASE=(scp -F "$SSH_CONFIG" -i "$REMOTE_IDENTITY" -o IdentitiesOnly=yes)

echo "Deploying demo video"
echo "Local:  ${LOCAL_TARGET}"
echo "Remote: ${REMOTE_HOST}:${REMOTE_DIR}/public/${VIDEO_NAME}"

"${SSH_BASE[@]}" "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}/public"
"${SCP_BASE[@]}" "$LOCAL_TARGET" "${REMOTE_HOST}:${REMOTE_DIR}/public/${VIDEO_NAME}"

URL="https://privyields.xyz/${VIDEO_NAME}"
echo "Published URL: ${URL}"

if command -v curl >/dev/null 2>&1; then
  if curl -fsSI "$URL" >/dev/null; then
    echo "Verified: ${URL} is reachable."
  else
    echo "Uploaded, but ${URL} did not pass the HTTP HEAD check yet. Retry in a few seconds." >&2
  fi
fi
