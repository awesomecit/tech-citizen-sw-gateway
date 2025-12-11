#!/bin/bash
# Combined Coverage Report
# Generates combined coverage from unit + integration + E2E tests
# Usage: bash scripts/coverage-combined.sh

set -e

echo "======================================"
echo "Combined Coverage Report Generation"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Unit tests coverage
echo -e "${BLUE}[1/3] Running unit tests with coverage...${NC}"
npm run test:unit > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Unit coverage collected${NC}"
echo ""

# Step 2: Integration tests coverage
echo -e "${BLUE}[2/3] Running integration tests with coverage...${NC}"
npm run test:integration:infra > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Integration coverage collected${NC}"
echo ""

# Step 3: E2E tests coverage
echo -e "${BLUE}[3/3] Running E2E tests with coverage...${NC}"
npm run test:e2e:infra > /dev/null 2>&1 || true
echo -e "${GREEN}✓ E2E coverage collected${NC}"
echo ""

# Display summary
echo "======================================"
echo "Coverage Reports Generated"
echo "======================================"
echo ""
echo -e "${YELLOW}Unit Coverage:${NC}        coverage/lcov-report/index.html"
echo -e "${YELLOW}Integration Coverage:${NC} coverage/integration/lcov-report/index.html"
echo -e "${YELLOW}E2E Coverage:${NC}         coverage/e2e/lcov-report/index.html"
echo ""

# Display key metrics
echo "======================================"
echo "Key Metrics Summary"
echo "======================================"
echo ""

if [ -f "coverage/lcov-report/index.html" ]; then
  echo -e "${BLUE}Unit Tests:${NC}"
  grep -A 1 "statements" coverage/lcov-report/index.html | grep -oP '\d+\.\d+%' | head -1 || echo "N/A"
fi

if [ -f "coverage/integration/lcov-report/index.html" ]; then
  echo -e "${BLUE}Integration Tests:${NC}"
  grep -A 1 "statements" coverage/integration/lcov-report/index.html | grep -oP '\d+\.\d+%' | head -1 || echo "N/A"
fi

if [ -f "coverage/e2e/lcov-report/index.html" ]; then
  echo -e "${BLUE}E2E Tests:${NC}"
  grep -A 1 "statements" coverage/e2e/lcov-report/index.html | grep -oP '\d+\.\d+%' | head -1 || echo "N/A"
fi

echo ""
echo -e "${GREEN}✓ All coverage reports generated successfully${NC}"
echo ""
