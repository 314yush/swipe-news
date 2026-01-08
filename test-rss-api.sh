#!/bin/bash

# Quick test script for RSS Feed API
# Usage: ./test-rss-api.sh

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25"

echo "🧪 Testing RSS Feed API..."
echo "=================================="
echo ""

# Check if server is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "❌ Error: Server not running or not accessible"
    echo "   Make sure you've started the dev server: npm run dev"
    exit 1
fi

echo "1️⃣ Fetching items..."
RESPONSE=$(curl -s "$API_URL")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo "❌ Error: Invalid JSON response"
    echo "$RESPONSE"
    exit 1
fi

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
    echo "❌ Error: API returned success=false"
    echo "$RESPONSE" | jq '.error'
    exit 1
fi

echo "✅ API is responding"
echo ""

# Item Count
COUNT=$(echo "$RESPONSE" | jq '.count')
echo "2️⃣ Item Count: $COUNT"
if [ "$COUNT" -lt 10 ]; then
    echo "   ⚠️  Warning: Expected 10-20 items, got $COUNT"
    echo "   This might be normal during low-news periods"
else
    echo "   ✅ Good: $COUNT items (target: 10-20)"
fi
echo ""

# Tier Distribution
TIER_A=$(echo "$RESPONSE" | jq '.tierACount // 0')
TIER_B=$(echo "$RESPONSE" | jq '.tierBCount // 0')
echo "3️⃣ Tier Distribution:"
echo "   Tier A (breaking): $TIER_A (target: 2-5)"
echo "   Tier B (actionable): $TIER_B (target: 6-15)"
if [ "$TIER_A" -eq 0 ] && [ "$TIER_B" -eq 0 ]; then
    echo "   ⚠️  Warning: No items assigned to tiers"
else
    echo "   ✅ Tiers are working"
fi
echo ""

# Proxy Assets
PROXY_COUNT=$(echo "$RESPONSE" | jq '.items | map(select(.isProxyAsset == true)) | length')
echo "4️⃣ Proxy Assets: $PROXY_COUNT items"
if [ "$PROXY_COUNT" -eq 0 ]; then
    echo "   ⚠️  Warning: No proxy assets found"
    echo "   Proxy assets should match general market news"
else
    echo "   ✅ Proxy assets are matching"
fi
echo ""

# Confidence Range
CONF_MIN=$(echo "$RESPONSE" | jq '.items | map(.assetConfidence) | min')
CONF_MAX=$(echo "$RESPONSE" | jq '.items | map(.assetConfidence) | max')
CONF_AVG=$(echo "$RESPONSE" | jq '.items | map(.assetConfidence) | add / length | floor')
echo "5️⃣ Confidence Scores:"
echo "   Min: $CONF_MIN (should be >= 70)"
echo "   Max: $CONF_MAX"
echo "   Avg: $CONF_AVG"
if [ "$CONF_MIN" -lt 70 ]; then
    echo "   ❌ Error: Some items have confidence < 70"
else
    echo "   ✅ All items meet confidence threshold"
fi
echo ""

# Sample Items
echo "6️⃣ Sample Items (first 3):"
echo "$RESPONSE" | jq -r '.items[0:3] | .[] | "   - [\(.tier)] \(.headline[0:60])... → \(.primaryAsset) (\(.assetConfidence)%)"'
echo ""

# Check for explainer content (should be excluded)
EXPLAINER_COUNT=$(echo "$RESPONSE" | jq '[.items[] | select(.headline | test("(?i)(what is|how to|explained|analysis:|guide to)"))] | length')
if [ "$EXPLAINER_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: Found $EXPLAINER_COUNT explainer articles (should be excluded)"
else
    echo "✅ No explainer content found (good)"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Summary:"
echo "   Total Items: $COUNT"
echo "   Tier A: $TIER_A | Tier B: $TIER_B"
echo "   Proxy Assets: $PROXY_COUNT"
echo "   Avg Confidence: $CONF_AVG%"
echo ""

if [ "$COUNT" -ge 10 ] && [ "$CONF_MIN" -ge 70 ]; then
    echo "✅ Primary goals met!"
else
    echo "⚠️  Some goals not met - check warnings above"
fi

