#!/bin/bash

# Audit log sanitization checker
# Scans codebase for potential security leaks in logging statements

echo "🔍 Auditing log statements for potential secrets disclosure..."
echo ""

FOUND_ISSUES=0

# 1. Check for full error object logging (may contain tokens)
echo "📋 Checking for unsafe error logging patterns..."
if grep -rn "\.log\.[a-z]*({ error }" packages/*/src services/*/src 2>/dev/null; then
  echo "⚠️  Found unsafe error logging: { error } may contain tokens/secrets"
  echo "   Use: { errorCode: error.code, errorMessage: error.message }"
  ((FOUND_ISSUES++))
else
  echo "✅ No unsafe error logging found"
fi
echo ""

# 2. Check for token/password in log statements
echo "📋 Checking for token/password in log statements..."
if grep -rn "\.log\.[a-z]*.*\(token\|password\|secret\|accessToken\|refreshToken\)" packages/*/src services/*/src 2>/dev/null | grep -v "// " | grep -v "/\*"; then
  echo "⚠️  Found potential token/password in logs"
  echo "   Ensure sensitive data is redacted before logging"
  ((FOUND_ISSUES++))
else
  echo "✅ No token/password references in logs"
fi
echo ""

# 3. Check for console.log (should use app.log instead)
echo "📋 Checking for console.log usage (should use structured logging)..."
if grep -rn "console\.\(log\|error\|warn\|info\)" packages/*/src services/*/src 2>/dev/null; then
  echo "⚠️  Found console.log usage - use app.log for structured logging"
  ((FOUND_ISSUES++))
else
  echo "✅ No console.log usage found"
fi
echo ""

# 4. Check for full request/response logging
echo "📋 Checking for full request/response object logging..."
if grep -rn "\.log\.[a-z]*({ request }\|{ response })" packages/*/src services/*/src 2>/dev/null; then
  echo "⚠️  Found full request/response logging - may expose headers/cookies"
  echo "   Use: { method: request.method, url: request.url, statusCode: response.statusCode }"
  ((FOUND_ISSUES++))
else
  echo "✅ No unsafe request/response logging"
fi
echo ""

# Summary
if [ $FOUND_ISSUES -eq 0 ]; then
  echo "✅ Audit passed - no logging security issues found"
  exit 0
else
  echo "❌ Audit found $FOUND_ISSUES issue(s) - review and fix before deployment"
  exit 1
fi
