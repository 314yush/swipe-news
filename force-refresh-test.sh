q#!/bin/bash

# Force refresh test - bypasses cache to see what APITube returns

echo "🔄 Force refreshing APITube cache..."
echo "=================================="
echo ""

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=1440&limit=25&debug=true&forceRefresh=true"

RESPONSE=$(curl -s "$API_URL")

if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo "❌ Invalid JSON response"
    echo "$RESPONSE"
    exit 1
fi

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
COUNT=$(echo "$RESPONSE" | jq '.count')

echo "✅ API Response:"
echo "   Success: $SUCCESS"
echo "   Items returned: $COUNT"
echo ""

if [ "$COUNT" -eq 0 ]; then
    echo "📊 Debug Statistics:"
    echo "$RESPONSE" | jq '.debug.normalizationStats' 2>/dev/null || echo "   (No debug stats available)"
    echo ""
    echo "🔍 Pipeline Breakdown:"
    echo "$RESPONSE" | jq '.debug.pipeline' 2>/dev/null || echo "   (No pipeline data)"
    echo ""
    echo "💡 Check server logs for '[APITube]' messages to see:"
    echo "   - How many articles APITube returned"
    echo "   - Where articles are being filtered out"
else
    echo "✅ Success! Got $COUNT items"
    echo ""
    echo "Sample items:"
    echo "$RESPONSE" | jq '.items[0:3] | .[] | "   - [\(.tier)] \(.headline[0:60])... → \(.primaryAsset)"'
fi




