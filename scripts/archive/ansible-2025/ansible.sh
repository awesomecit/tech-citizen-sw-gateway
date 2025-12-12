#!/usr/bin/env bash
# Ansible Wrapper Script
# Semplifica l'esecuzione dei playbook Ansible

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INVENTORY="$PROJECT_ROOT/ansible/inventory/hosts.ini"
PLAYBOOKS_DIR="$PROJECT_ROOT/ansible/playbooks"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
  cat <<EOF
Usage: $0 <environment> <action> [options]

ENVIRONMENTS:
  staging     - Docker simulation (hetzner-sim container)
  production  - Real Hetzner server

ACTIONS:
  ping        - Test Ansible connectivity
  discover    - Analyze installed software (run before cleanup!)
  security    - Apply security baseline (SSH, UFW, Fail2Ban, etc.)
  audit       - Verify security settings (CIS Benchmark)
  deploy      - Deploy gateway application
  cleanup     - Remove unused packages/containers (DRY RUN by default)
  docker      - Install Docker Engine + Compose

OPTIONS:
  --dry-run   - Simulate cleanup without making changes (default for cleanup)
  --real      - Execute real cleanup (removes data!)
  --tags      - Ansible tags to run (comma-separated)
  --verbose   - Ansible verbose mode (-vvv)

EXAMPLES:
  # Test connectivity
  $0 staging ping
  $0 production ping

  # Discovery (before any changes!)
  $0 production discover

  # Security hardening
  $0 staging security
  $0 production security

  # Audit
  $0 staging audit
  $0 production audit

  # Deploy
  $0 staging deploy
  $0 production deploy

  # Cleanup (dry-run first)
  $0 staging cleanup
  $0 staging cleanup --real

  # Cleanup production (CAREFUL!)
  $0 production discover  # ALWAYS check first
  $0 production cleanup   # Dry-run
  $0 production cleanup --real  # Real cleanup

EOF
  exit 1
}

# Parse arguments
[[ $# -lt 2 ]] && usage

ENVIRONMENT="$1"
ACTION="$2"
shift 2

# Validate environment
case "$ENVIRONMENT" in
  staging|production)
    ;;
  *)
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    usage
    ;;
esac

# Default options
DRY_RUN=""
TAGS=""
VERBOSE=""

# Parse additional options
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="--extra-vars dry_run=true"
      shift
      ;;
    --real)
      DRY_RUN="--extra-vars dry_run=false"
      shift
      ;;
    --tags)
      TAGS="--tags $2"
      shift 2
      ;;
    --verbose)
      VERBOSE="-vvv"
      shift
      ;;
    *)
      echo -e "${RED}Error: Unknown option '$1'${NC}"
      usage
      ;;
  esac
done

# Execute action
case "$ACTION" in
  ping)
    echo -e "${GREEN}Testing Ansible connectivity to $ENVIRONMENT...${NC}"
    ansible "$ENVIRONMENT" -i "$INVENTORY" -m ping $VERBOSE
    ;;

  discover)
    echo -e "${GREEN}Running server discovery on $ENVIRONMENT...${NC}"
    echo -e "${YELLOW}This will analyze installed software, services, and disk usage.${NC}"
    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/server-discovery.yml" \
      --limit="$ENVIRONMENT" \
      $TAGS $VERBOSE
    
    echo -e "${GREEN}Discovery complete! Check server-discovery-reports/ for details.${NC}"
    ;;

  security)
    echo -e "${GREEN}Applying security baseline to $ENVIRONMENT...${NC}"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
      TAGS="--tags staging"
    fi
    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/security-baseline.yml" \
      --limit="$ENVIRONMENT" \
      $TAGS $VERBOSE
    ;;

  audit)
    echo -e "${GREEN}Running security audit on $ENVIRONMENT...${NC}"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
      TAGS="--tags staging"
    fi
    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/security-audit.yml" \
      --limit="$ENVIRONMENT" \
      $TAGS $VERBOSE
    
    echo -e "${GREEN}Audit complete! Check security-audit-reports/ for details.${NC}"
    ;;

  deploy)
    echo -e "${GREEN}Deploying gateway to $ENVIRONMENT...${NC}"
    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/deploy-gateway.yml" \
      --limit="$ENVIRONMENT" \
      $TAGS $VERBOSE
    ;;

  cleanup)
    # Default to dry-run for safety
    if [[ -z "$DRY_RUN" ]]; then
      DRY_RUN="--extra-vars dry_run=true"
      echo -e "${YELLOW}Running in DRY RUN mode (no changes). Use --real to execute cleanup.${NC}"
    fi

    if [[ "$DRY_RUN" == *"dry_run=false"* ]]; then
      echo -e "${RED}⚠️  WARNING: This will REMOVE unused packages and data!${NC}"
      echo -e "${YELLOW}Run 'discover' action first to see what will be removed.${NC}"
      read -p "Continue with real cleanup? [y/N] " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Cleanup cancelled.${NC}"
        exit 0
      fi
    fi

    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/server-cleanup.yml" \
      --limit="$ENVIRONMENT" \
      $DRY_RUN $TAGS $VERBOSE
    
    if [[ "$DRY_RUN" == *"dry_run=true"* ]]; then
      echo -e "${GREEN}Dry-run complete! Review output, then use --real to execute.${NC}"
    else
      echo -e "${GREEN}Cleanup complete! Check server-cleanup-reports/ for details.${NC}"
    fi
    ;;

  docker)
    echo -e "${GREEN}Installing Docker on $ENVIRONMENT...${NC}"
    ansible-playbook -i "$INVENTORY" \
      "$PLAYBOOKS_DIR/docker-install.yml" \
      --limit="$ENVIRONMENT" \
      $TAGS $VERBOSE
    ;;

  *)
    echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
    usage
    ;;
esac

echo -e "${GREEN}✅ Done!${NC}"
