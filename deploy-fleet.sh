#!/bin/bash
#
# YEDAN Cloud Army - Fleet Deployment Script
# Deploys ALL 6 fleet workers to Cloudflare in sequence
#
# Prerequisites: Run `npx wrangler login` first (one-time)
#
# Usage: bash deploy-fleet.sh [--all | --worker-name]
#   bash deploy-fleet.sh --all          # Deploy all 6 workers
#   bash deploy-fleet.sh orchestrator   # Deploy only orchestrator
#

set -e

FLEET_DIR="$(cd "$(dirname "$0")" && pwd)"

# Fleet worker directories in deployment order
WORKERS=(
  "yedan-health-commander"
  "yedan-revenue-sentinel"
  "yedan-intel-ops"
  "yedan-content-engine"
  "yedan-cloud-executor"
  "yedan-orchestrator"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║          YEDAN CLOUD ARMY FLEET DEPLOY           ║"
echo "║        National-Level Infrastructure v1.0        ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

deploy_worker() {
  local worker_dir="$1"
  local worker_name=$(basename "$worker_dir")

  echo -e "${YELLOW}━━━ Deploying: ${worker_name} ━━━${NC}"

  if [ ! -d "${FLEET_DIR}/${worker_dir}" ]; then
    echo -e "${RED}  ERROR: Directory not found: ${FLEET_DIR}/${worker_dir}${NC}"
    return 1
  fi

  cd "${FLEET_DIR}/${worker_dir}"

  if npx wrangler deploy 2>&1; then
    echo -e "${GREEN}  ✓ ${worker_name} deployed successfully${NC}"
    return 0
  else
    echo -e "${RED}  ✗ ${worker_name} deployment FAILED${NC}"
    return 1
  fi
}

# Parse arguments
TARGET="${1:---all}"
DEPLOYED=0
FAILED=0

if [ "$TARGET" = "--all" ]; then
  echo -e "${CYAN}Deploying ALL ${#WORKERS[@]} fleet workers...${NC}"
  echo ""

  for worker in "${WORKERS[@]}"; do
    if deploy_worker "$worker"; then
      ((DEPLOYED++))
    else
      ((FAILED++))
    fi
    echo ""
  done
else
  # Deploy single worker
  MATCH=""
  for worker in "${WORKERS[@]}"; do
    if [[ "$worker" == *"$TARGET"* ]]; then
      MATCH="$worker"
      break
    fi
  done

  if [ -z "$MATCH" ]; then
    echo -e "${RED}Unknown worker: $TARGET${NC}"
    echo "Available workers:"
    for w in "${WORKERS[@]}"; do
      echo "  - $w"
    done
    exit 1
  fi

  if deploy_worker "$MATCH"; then
    ((DEPLOYED++))
  else
    ((FAILED++))
  fi
fi

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║              FLEET DEPLOYMENT REPORT              ║"
echo "╠══════════════════════════════════════════════════╣"
echo -e "║  Deployed: ${GREEN}${DEPLOYED}${CYAN}  |  Failed: ${RED}${FAILED}${CYAN}  |  Total: $((DEPLOYED+FAILED))          ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Fleet Endpoints:                                ║"
echo "║  ┌─ Orchestrator  */2m  (Master Brain)           ║"
echo "║  ├─ Health Cmd    */3m  (20+ endpoint monitor)   ║"
echo "║  ├─ Revenue       */10m (Money sentinel)         ║"
echo "║  ├─ Cloud Exec    */5m  (Task executor)          ║"
echo "║  ├─ Content       */30m (AI content factory)     ║"
echo "║  └─ Intel Ops     1h    (Market intelligence)    ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Dashboard: /status on any worker                ║"
echo "║  Fleet:     yedan-orchestrator.../fleet           ║"
echo "║  Revenue:   yedan-orchestrator.../revenue         ║"
echo "║  Health:    yedan-health-commander.../status       ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
