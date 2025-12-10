#!/bin/bash
set -e

LOG_FILE="/tmp/gateway-startup-test.log"
PID_FILE="/tmp/gateway.pid"
TEST_RESULTS="/tmp/gateway-test-results.txt"

echo "🚀 Gateway Startup Test" | tee "$TEST_RESULTS"
echo "======================" | tee -a "$TEST_RESULTS"

# Cleanup previous runs
pkill -9 -f "wattpm" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true
rm -f "$LOG_FILE" "$PID_FILE"
sleep 2

# Start gateway in background
echo "📦 Starting gateway..." | tee -a "$TEST_RESULTS"
cd "$(dirname "$0")/.."
nohup npm run dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
GW_PID=$(cat "$PID_FILE")
echo "   PID: $GW_PID" | tee -a "$TEST_RESULTS"

# Wait for startup (max 20s)
echo "⏳ Waiting for startup (max 20s)..." | tee -a "$TEST_RESULTS"
READY=0
for i in {1..20}; do
  if grep -q "Platformatic is now listening" "$LOG_FILE" 2>/dev/null; then
    READY=1
    echo "   ✅ Gateway ready after ${i}s" | tee -a "$TEST_RESULTS"
    break
  fi
  sleep 1
done

if [ $READY -eq 0 ]; then
  echo "   ❌ Gateway failed to start in 20s" | tee -a "$TEST_RESULTS"
  echo "" | tee -a "$TEST_RESULTS"
  echo "📋 Last 30 lines of log:" | tee -a "$TEST_RESULTS"
  tail -30 "$LOG_FILE" | tee -a "$TEST_RESULTS"
  kill -9 "$GW_PID" 2>/dev/null || true
  exit 1
fi

# Check for crash loop
sleep 3
if grep -q "Graceful shutdown timeout" "$LOG_FILE"; then
  echo "   ❌ CRASH LOOP DETECTED!" | tee -a "$TEST_RESULTS"
  grep "Graceful shutdown timeout" "$LOG_FILE" | head -3 | tee -a "$TEST_RESULTS"
  kill -9 "$GW_PID" 2>/dev/null || true
  exit 1
fi

if grep -q "unexpectedly exited" "$LOG_FILE"; then
  echo "   ❌ UNEXPECTED EXIT DETECTED!" | tee -a "$TEST_RESULTS"
  grep "unexpectedly exited" "$LOG_FILE" | head -3 | tee -a "$TEST_RESULTS"
  kill -9 "$GW_PID" 2>/dev/null || true
  exit 1
fi

echo "   ✅ No crash loop detected" | tee -a "$TEST_RESULTS"

# Test endpoints
echo "" | tee -a "$TEST_RESULTS"
echo "🔍 Testing endpoints..." | tee -a "$TEST_RESULTS"

# Health check
HTTP_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" http://localhost:3042/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ /health: 200 OK" | tee -a "$TEST_RESULTS"
  jq -c . /tmp/health.json | tee -a "$TEST_RESULTS"
else
  echo "   ❌ /health: $HTTP_CODE" | tee -a "$TEST_RESULTS"
fi

# Login redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3042/auth/login)
if [ "$HTTP_CODE" = "302" ]; then
  echo "   ✅ /auth/login: 302 Redirect" | tee -a "$TEST_RESULTS"
  LOCATION=$(curl -sI http://localhost:3042/auth/login | grep -i "^location:" | head -1)
  echo "      $LOCATION" | tee -a "$TEST_RESULTS"
else
  echo "   ⚠️  /auth/login: $HTTP_CODE (expected 302)" | tee -a "$TEST_RESULTS"
fi

# Protected route (should be 401)
HTTP_CODE=$(curl -s -o /tmp/protected.json -w "%{http_code}" http://localhost:3042/api/protected)
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ /api/protected: 401 Unauthorized (correct)" | tee -a "$TEST_RESULTS"
  jq -c . /tmp/protected.json | tee -a "$TEST_RESULTS"
else
  echo "   ❌ /api/protected: $HTTP_CODE (expected 401)" | tee -a "$TEST_RESULTS"
fi

# Metrics
HTTP_CODE=$(curl -s -o /tmp/metrics.txt -w "%{http_code}" http://localhost:3042/metrics)
if [ "$HTTP_CODE" = "200" ]; then
  METRIC_COUNT=$(grep -c "^gateway_" /tmp/metrics.txt || echo 0)
  echo "   ✅ /metrics: 200 OK ($METRIC_COUNT metrics)" | tee -a "$TEST_RESULTS"
else
  echo "   ❌ /metrics: $HTTP_CODE" | tee -a "$TEST_RESULTS"
fi

# Check auth plugin registration
echo "" | tee -a "$TEST_RESULTS"
echo "🔐 Auth plugin check..." | tee -a "$TEST_RESULTS"
if grep -q "Auth plugin registered" "$LOG_FILE"; then
  echo "   ✅ Auth plugin registered" | tee -a "$TEST_RESULTS"
  grep "Auth plugin registered" "$LOG_FILE" | head -1 | jq -c '{realm, clientId, enableRoutes}' | tee -a "$TEST_RESULTS"
else
  echo "   ❌ Auth plugin NOT registered" | tee -a "$TEST_RESULTS"
fi

# Cleanup
echo "" | tee -a "$TEST_RESULTS"
echo "🧹 Cleanup..." | tee -a "$TEST_RESULTS"
kill "$GW_PID" 2>/dev/null || true
sleep 2
if ps -p "$GW_PID" > /dev/null 2>&1; then
  echo "   Forcing kill..." | tee -a "$TEST_RESULTS"
  kill -9 "$GW_PID" 2>/dev/null || true
fi
rm -f "$PID_FILE"

echo "" | tee -a "$TEST_RESULTS"
echo "✅ Test completed!" | tee -a "$TEST_RESULTS"
echo "📋 Full log: $LOG_FILE" | tee -a "$TEST_RESULTS"
echo "📊 Results: $TEST_RESULTS" | tee -a "$TEST_RESULTS"
