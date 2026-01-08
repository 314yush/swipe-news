#!/bin/bash

# Direct test of APITube API
# This tests the API directly without going through our filtering

API_KEY="api_live_N5u3PhEreowICgA8Z9PTTEbOThAsvE611K4G8hr2cCnxcwpKeP6kPf05"

echo "🧪 Testing APITube API directly..."
echo "=================================="
echo ""

# Calculate start date (24 hours ago)
START_DATE=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow() - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ'))")

echo "1️⃣ Testing basic API call..."
URL="https://api.apitube.io/v1/news/everything?per_page=10&language.code=en&published_at.start=${START_DATE}"

echo "URL: ${URL}"
echo ""

RESPONSE=$(curl -s -H "X-API-Key: ${API_KEY}" -H "Accept: application/json" "${URL}")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo "❌ Error: Invalid JSON response"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Got valid JSON response"
echo ""

# Check for errors
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
    echo "❌ API Error: $ERROR"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Check response structure
HAS_DATA=$(echo "$RESPONSE" | jq -e '.data != null' 2>/dev/null)
HAS_ARTICLES=$(echo "$RESPONSE" | jq -e '.data | type == "array"' 2>/dev/null)

if [ "$HAS_DATA" != "true" ] || [ "$HAS_ARTICLES" != "true" ]; then
    echo "⚠️  Unexpected response structure:"
    echo "$RESPONSE" | jq '.' | head -30
    echo ""
    echo "Checking for alternative structure..."
    
    # Maybe articles are directly in response?
    DIRECT_COUNT=$(echo "$RESPONSE" | jq '[.[] | select(.title != null)] | length' 2>/dev/null || echo "0")
    if [ "$DIRECT_COUNT" -gt 0 ]; then
        echo "✅ Found articles directly in response (not in .data array)"
        echo "Count: $DIRECT_COUNT"
        echo "$RESPONSE" | jq '.[0]' | head -20
    fi
else
    ARTICLE_COUNT=$(echo "$RESPONSE" | jq '.data | length')
    TOTAL=$(echo "$RESPONSE" | jq '.meta.total // 0')
    
    echo "2️⃣ Response Summary:"
    echo "   Articles in response: $ARTICLE_COUNT"
    echo "   Total available: $TOTAL"
    echo ""
    
    if [ "$ARTICLE_COUNT" -gt 0 ]; then
        echo "3️⃣ Sample Article:"
        echo "$RESPONSE" | jq '.data[0] | {title, url, published_at, source: .source.name}' | head -10
        echo ""
        
        echo "4️⃣ Checking article fields:"
        FIRST=$(echo "$RESPONSE" | jq '.data[0]')
        echo "   Has title: $(echo "$FIRST" | jq -r 'if .title then "✅" else "❌" end')"
        echo "   Has url: $(echo "$FIRST" | jq -r 'if .url then "✅" else "❌" end')"
        echo "   Has published_at: $(echo "$FIRST" | jq -r 'if .published_at then "✅" else "❌" end')"
        echo "   Has source: $(echo "$FIRST" | jq -r 'if .source then "✅" else "❌" end')"
        echo "   Source name: $(echo "$FIRST" | jq -r '.source.name // "N/A"')"
    else
        echo "⚠️  No articles returned"
        echo "Full response:"
        echo "$RESPONSE" | jq '.' | head -50
    fi
fi

echo ""
echo "=================================="




