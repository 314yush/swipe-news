#!/bin/bash

# Debug script for RSS API - shows detailed statistics
# Usage: ./debug-rss-api.sh

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25&debug=true"

echo "🔍 Debugging RSS Feed API..."
echo "=================================="
echo ""

# Check if server is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "❌ Error: Server not running"
    echo "   Start with: cd client && npm run dev"
    exit 1
fi

echo "1️⃣ Fetching with debug mode..."
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

# Show debug stats if available
if echo "$RESPONSE" | jq -e '.debug' > /dev/null 2>&1; then
    echo "2️⃣ Pipeline Comparison (Raw RSS → Final):"
    RAW=$(echo "$RESPONSE" | jq '.debug.pipeline.rawRSSItems // 0')
    FINAL=$(echo "$RESPONSE" | jq '.debug.pipeline.finalCount // 0')
    if [ "$RAW" -gt 0 ]; then
        PCT=$((FINAL * 100 / RAW))
        echo "   ${RAW} raw RSS items → ${FINAL} final items (${PCT}% retention)"
    else
        echo "   No raw RSS items found"
    fi
    echo ""
    
    echo "3️⃣ Normalization Statistics:"
    echo "$RESPONSE" | jq '.debug.normalizationStats'
    echo ""
    
    TOTAL_PARSED=$(echo "$RESPONSE" | jq '.debug.normalizationStats.totalParsed')
    FILTERED_AGE=$(echo "$RESPONSE" | jq '.debug.normalizationStats.filteredByAge')
    FILTERED_ASSET=$(echo "$RESPONSE" | jq '.debug.normalizationStats.filteredByAsset')
    FILTERED_TIER=$(echo "$RESPONSE" | jq '.debug.normalizationStats.filteredByTier')
    PASSED=$(echo "$RESPONSE" | jq '.debug.normalizationStats.passed')
    
    echo "4️⃣ Filter Breakdown:"
    echo "   Total parsed from RSS: $TOTAL_PARSED"
    echo "   ❌ Filtered by age (>15min): $FILTERED_AGE"
    echo "   ❌ Filtered by asset (confidence < 70): $FILTERED_ASSET"
    echo "   ❌ Filtered by tier: $FILTERED_TIER"
    echo "   ✅ Passed all filters: $PASSED"
    echo ""
    
    if [ "$FILTERED_AGE" -gt "$TOTAL_PARSED" ]; then
        echo "⚠️  WARNING: Most items are too old (>15 minutes)"
        echo "   Try: ?maxAgeMinutes=30 or ?maxAgeMinutes=60"
    fi
    
    if [ "$FILTERED_ASSET" -gt 0 ]; then
        ASSET_PCT=$((FILTERED_ASSET * 100 / TOTAL_PARSED))
        echo "⚠️  WARNING: $ASSET_PCT% of items filtered by asset matching"
        echo "   This means headlines don't match trading pair keywords"
        echo "   Check proxy asset keywords in tradingPairs.ts"
    fi
    
    if [ "$FILTERED_TIER" -gt 0 ]; then
        TIER_PCT=$((FILTERED_TIER * 100 / TOTAL_PARSED))
        echo "⚠️  WARNING: $TIER_PCT% of items filtered by tier assignment"
        echo "   Items may have confidence < 70 or urgency < 1"
    fi
else
    echo "⚠️  Debug stats not available (cached response)"
    echo "   Clear cache or wait for cache to expire"
fi

echo ""
echo "5️⃣ Current Response:"
COUNT=$(echo "$RESPONSE" | jq '.count')
TIER_A=$(echo "$RESPONSE" | jq '.tierACount // 0')
TIER_B=$(echo "$RESPONSE" | jq '.tierBCount // 0')
CACHED=$(echo "$RESPONSE" | jq '.cached')

echo "   Items returned: $COUNT"
echo "   Tier A: $TIER_A | Tier B: $TIER_B"
echo "   Cached: $CACHED"
echo ""

if [ "$COUNT" -eq 0 ]; then
    echo "6️⃣ Troubleshooting Steps:"
    echo ""
    echo "   a) Try extending time window:"
    echo "      curl \"$API_URL\" | jq '.count'"
    echo "      (Change maxAgeMinutes=30 to maxAgeMinutes=60 or 120)"
    echo ""
    echo "   b) Check server logs for normalization stats"
    echo "      Look for: '[RSS API] 📊 Normalization Statistics'"
    echo ""
    echo "   c) Test individual RSS feeds:"
    echo "      curl 'https://www.coindesk.com/arc/outboundfeeds/rss/' | head -20"
    echo ""
    echo "   d) Check if it's a low-news period (late night/weekend)"
    echo "      Try: ?maxAgeMinutes=1440 (24 hours) to see if any items appear"
fi

echo ""
echo "=================================="

