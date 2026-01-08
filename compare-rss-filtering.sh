#!/bin/bash

# Comparison script: Raw RSS vs Filtered Pipeline
# Shows exactly how much data we're losing at each stage

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25&debug=true"

echo "📊 RSS Feed Filtering Comparison"
echo "=================================="
echo ""

# Check if server is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "❌ Error: Server not running"
    echo "   Start with: cd client && npm run dev"
    exit 1
fi

echo "Fetching data with debug stats..."
RESPONSE=$(curl -s "$API_URL")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo "❌ Error: Invalid JSON response"
    exit 1
fi

if [ "$(echo "$RESPONSE" | jq -r '.success')" != "true" ]; then
    echo "❌ Error: API returned success=false"
    exit 1
fi

# Extract pipeline data
if echo "$RESPONSE" | jq -e '.debug.pipeline' > /dev/null 2>&1; then
    echo "✅ Pipeline Comparison:"
    echo ""
    
    RAW=$(echo "$RESPONSE" | jq '.debug.pipeline.rawRSSItems')
    AFTER_AGE=$(echo "$RESPONSE" | jq '.debug.pipeline.afterAgeFilter')
    AFTER_ASSET=$(echo "$RESPONSE" | jq '.debug.pipeline.afterAssetFilter')
    AFTER_TIER=$(echo "$RESPONSE" | jq '.debug.pipeline.afterTierFilter')
    AFTER_DEDUP=$(echo "$RESPONSE" | jq '.debug.pipeline.afterDedup')
    FINAL=$(echo "$RESPONSE" | jq '.debug.pipeline.finalCount')
    
    echo "Stage                    | Items  | Loss   | Retention"
    echo "-------------------------|--------|--------|----------"
    printf "1. Raw RSS Items        | %6d | %6d | 100%%\n" "$RAW" "0"
    
    AGE_LOSS=$((RAW - AFTER_AGE))
    AGE_PCT=$((AFTER_AGE * 100 / RAW))
    printf "2. After Age Filter     | %6d | %6d | %3d%%\n" "$AFTER_AGE" "$AGE_LOSS" "$AGE_PCT"
    
    ASSET_LOSS=$((AFTER_AGE - AFTER_ASSET))
    ASSET_PCT=$((AFTER_ASSET * 100 / RAW))
    printf "3. After Asset Filter   | %6d | %6d | %3d%%\n" "$AFTER_ASSET" "$ASSET_LOSS" "$ASSET_PCT"
    
    TIER_LOSS=$((AFTER_ASSET - AFTER_TIER))
    TIER_PCT=$((AFTER_TIER * 100 / RAW))
    printf "4. After Tier Filter    | %6d | %6d | %3d%%\n" "$AFTER_TIER" "$TIER_LOSS" "$TIER_PCT"
    
    DEDUP_LOSS=$((AFTER_TIER - AFTER_DEDUP))
    DEDUP_PCT=$((AFTER_DEDUP * 100 / RAW))
    printf "5. After Deduplication  | %6d | %6d | %3d%%\n" "$AFTER_DEDUP" "$DEDUP_LOSS" "$DEDUP_PCT"
    
    LIMIT_LOSS=$((AFTER_DEDUP - FINAL))
    FINAL_PCT=$((FINAL * 100 / RAW))
    printf "6. After Limit (25)     | %6d | %6d | %3d%%\n" "$FINAL" "$LIMIT_LOSS" "$FINAL_PCT"
    
    echo ""
    echo "📉 Overall: ${RAW} → ${FINAL} items (${FINAL_PCT}% retention)"
    echo ""
    
    # Show percentages breakdown
    echo "Filter Breakdown (as % of raw RSS):"
    echo "$RESPONSE" | jq -r '.debug.normalizationStats.percentages | 
      "  Age filter:     \(.filteredByAge)%\n" +
      "  Asset filter:   \(.filteredByAsset)%\n" +
      "  Tier filter:   \(.filteredByTier)%\n" +
      "  Passed:        \(.passed)%"'
    echo ""
    
    # Show top feeds
    echo "Top 10 Feeds by Items Passed:"
    echo "$RESPONSE" | jq -r '.debug.topFeeds[]? | "  \(.name): \(.passed) items (\(.retentionRate)% retention)"'
    echo ""
    
    # Show deduplication stats
    echo "Deduplication Impact:"
    echo "$RESPONSE" | jq -r '.debug.deduplication | 
      "  Before: \(.itemsBeforeDedup) items\n" +
      "  After:  \(.itemsAfterDedup) items\n" +
      "  Removed: \(.itemsRemoved) items (\(.percentageRemoved)%)"'
    
else
    echo "⚠️  Debug stats not available (cached response)"
    echo "   Add ?debug=true or wait for cache to expire"
    echo ""
    echo "Current response:"
    echo "$RESPONSE" | jq '{count, tierACount, tierBCount, cached}'
fi

echo ""
echo "=================================="
echo ""
echo "💡 Tips:"
echo "  - If retention < 5%, check if time window is too strict"
echo "  - If asset filter removes > 50%, proxy keywords may need expansion"
echo "  - If tier filter removes > 30%, confidence threshold may be too high"

