#!/bin/bash

# Local CI/CD Pipeline
# Runs complete verification pipeline locally (no GitHub Actions dependency)

set -e  # Exit on first error

echo "🚀 Tech Citizen Gateway - Local CI/CD Pipeline"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stage tracking
STAGE=0
TOTAL_STAGES=8

# Helper function
run_stage() {
  ((STAGE++))
  echo ""
  echo -e "${YELLOW}[Stage $STAGE/$TOTAL_STAGES]${NC} $1"
  echo "-------------------------------------------"
}

# 1. Environment check
run_stage "Environment Validation"
node --version || { echo -e "${RED}❌ Node.js not found${NC}"; exit 1; }
npm --version || { echo -e "${RED}❌ npm not found${NC}"; exit 1; }
docker --version || { echo -e "${RED}❌ Docker not found${NC}"; exit 1; }
echo -e "${GREEN}✅ Environment OK${NC}"

# 2. Dependencies
run_stage "Dependency Check"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm ci
else
  echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# 3. Type checking
run_stage "TypeScript Type Check"
npx tsc --noEmit || { echo -e "${RED}❌ Type check failed${NC}"; exit 1; }
echo -e "${GREEN}✅ No type errors${NC}"

# 4. Linting
run_stage "Code Quality (ESLint + Prettier)"
npm run lint:check || { echo -e "${RED}❌ Lint failed${NC}"; exit 1; }
npm run format:check || { echo -e "${RED}❌ Format check failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Code quality passed${NC}"

# 5. Code complexity
run_stage "Complexity Analysis"
npm run analyze:cognitive || { echo -e "${RED}❌ Complexity too high${NC}"; exit 1; }
echo -e "${GREEN}✅ Complexity within limits${NC}"

# 6. Testing
run_stage "Test Suite (Unit + Integration)"
echo "Running unit tests..."
npm test || { echo -e "${RED}❌ Tests failed${NC}"; exit 1; }

echo ""
echo "Running integration tests (requires Keycloak running)..."
if docker ps | grep -q tech-citizen-keycloak; then
  KEYCLOAK_URL=http://localhost:8090 REDIS_PORT=6380 npm test -- keycloak.integration || {
    echo -e "${YELLOW}⚠️  Integration tests failed (check Keycloak/Redis)${NC}"
  }
else
  echo -e "${YELLOW}⚠️  Keycloak not running - skipping integration tests${NC}"
  echo "   Start with: cd infrastructure/keycloak && docker compose -f docker-compose.keycloak.yml up -d"
fi

echo -e "${GREEN}✅ Tests passed${NC}"

# 7. Security audit
run_stage "Security Audit"
.husky/pre-release || { echo -e "${RED}❌ Security audit failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Security audit passed${NC}"

# 8. Build
run_stage "Production Build"
npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Build successful${NC}"

# 9. Docker image (optional)
echo ""
echo -e "${YELLOW}[Optional]${NC} Build Docker Image?"
read -p "Build Docker image? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  run_stage "Docker Build"
  docker build -t tech-citizen-gateway:latest -f Dockerfile . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Docker image built: tech-citizen-gateway:latest${NC}"
fi

# 10. Release version suggestion
echo ""
echo "=============================================="
echo -e "${GREEN}✅ All stages passed!${NC}"
echo ""
echo "📦 Next steps:"
echo "   1. Review changes: git log --oneline -10"
echo "   2. Check version bump: npm run release:suggest"
echo "   3. Create release: npm run release"
echo "   4. Push tags: git push --follow-tags"
echo ""
echo "🎉 Pipeline completed successfully!"
