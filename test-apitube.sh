#!/bin/bash

# Quick test script for APITube News API
# Usage: ./test-apitube.sh

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25"

echo "🧪 Testing APITube News API..."
echo "=================================="
echo ""

# Check if API key is set
if [ -z "$APITUBE_API_KEY" ]; then
    echo "⚠️  Warning: APITUBE_API_KEY not set in environment"
    echo "   Set it with: export APITUBE_API_KEY=your_key_here"
    echo "   Or add to client/.env.local"
    echo ""
fi

# Check if server is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "❌ Error: Server not running or not accessible"
    echo "   Make sure you've started the dev server:"
    echo "   cd client && npm run dev"
    exit 1
fi

echo "1️⃣ Fetching items from APITube..."
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
if [ "$COUNT" -lt 5 ]; then
    echo "   ⚠️  Warning: Got $COUNT items (expected 10-25)"
    echo "   This might be normal during low-news periods"
    echo "   Try: ?maxAgeMinutes=60 or ?maxAgeMinutes=1440"
else
    echo "   ✅ Good: $COUNT items"
fi
echo ""

# Tier Distribution
TIER_A=$(echo "$RESPONSE" | jq '.tierACount // 0')
TIER_B=$(echo "$RESPONSE" | jq '.tierBCount // 0')
echo "3️⃣ Tier Distribution:"
echo "   Tier A (breaking): $TIER_A"
echo "   Tier B (actionable): $TIER_B"
if [ "$TIER_A" -eq 0 ] && [ "$TIER_B" -eq 0 ]; then
    echo "   ⚠️  Warning: No items assigned to tiers"
else
    echo "   ✅ Tiers are working"
fi
echo ""

# Sources
SOURCES=$(echo "$RESPONSE" | jq -r '.sources[]')
echo "4️⃣ Source: $SOURCES"
echo ""

# Confidence Range
if [ "$COUNT" -gt 0 ]; then
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
fi

# Summary
echo "=================================="
echo "📊 Summary:"
echo "   Total Items: $COUNT"
echo "   Tier A: $TIER_A | Tier B: $TIER_B"
echo "   Source: APITube (500k+ verified sources)"
echo ""

if [ "$COUNT" -ge 5 ] && [ "$SUCCESS" = "true" ]; then
    echo "✅ APITube integration is working!"
else
    echo "⚠️  Check server logs for details"
    echo "   Look for: '[APITube API]' messages"
fi




