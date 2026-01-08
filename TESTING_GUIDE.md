# Testing Guide: Swipe Feed Density MVP

This guide helps you test the new RSS feed improvements including proxy assets, confidence scoring, tiering, and deduplication.

## Quick Start

### 1. Start the Development Server

```bash
cd client
npm run dev
```

The app will be available at `http://localhost:3000`

### 2. Test the RSS API Endpoint Directly

Open your browser or use `curl` to test the API:

```bash
# Test swipe feed (15-minute window, max 25 items)
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq

# Test feed page (24-hour window)
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=1440&limit=25" | jq
```

**Expected Response Structure:**
```json
{
  "success": true,
  "items": [...],
  "count": 10-20,
  "tierACount": 2-5,
  "tierBCount": 6-15,
  "cached": false,
  "timestamp": "...",
  "cacheExpiresAt": "..."
}
```

## Testing Checklist

### ✅ Test 1: Verify Item Count (Primary Goal)

**Goal**: Swipe feed should return 10-20 items during active news periods

**Steps:**
1. Open browser console (F12)
2. Navigate to `http://localhost:3000` (swipe page)
3. Check console logs for:
   ```
   [RSS Service] API response: { itemsCount: X, tierACount: Y, tierBCount: Z }
   ```

**Expected:**
- `itemsCount`: 10-20 (not 2-3)
- `tierACount`: 2-5
- `tierBCount`: 6-15

**If you see 0-3 items:**
- Check if RSS feeds are responding (see Test 2)
- Check browser console for errors
- Verify you're testing during market hours (more news available)

---

### ✅ Test 2: Verify RSS Feeds Are Fetching

**Goal**: Ensure RSS feeds are being fetched successfully

**Steps:**
1. Open browser console
2. Navigate to swipe page
3. Look for logs like:
   ```
   [RSS API] CoinDesk: 5 items
   [RSS API] Reuters Business: 12 items
   [RSS API] Total items before deduplication: 150
   ```

**Expected:**
- Multiple feeds showing item counts
- Total items before deduplication: 50-200+
- Some feeds may fail (that's OK - graceful degradation)

**If all feeds fail:**
- Check network connectivity
- Verify you're not behind a firewall blocking RSS feeds
- Check server console for CORS or timeout errors

---

### ✅ Test 3: Verify Proxy Asset Matching

**Goal**: Verify general market news maps to proxy assets (BTC, SPY, XAU, OIL)

**Steps:**
1. Call API directly:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | {headline, primaryAsset, isProxyAsset, assetConfidence}'
   ```

2. Look for items with:
   - `primaryAsset: "BTC/USD"` and `isProxyAsset: true` (crypto market news)
   - `primaryAsset: "SPY/USD"` and `isProxyAsset: true` (stock market news)
   - `primaryAsset: "XAU/USD"` and `isProxyAsset: true` (gold/safe-haven news)
   - `primaryAsset: "USOILSPOT/USD"` and `isProxyAsset: true` (oil/energy news)

**Expected:**
- At least 30-50% of items should have `isProxyAsset: true`
- Headlines like "Fed signals rate pause" → `SPY/USD`
- Headlines like "Crypto markets surge" → `BTC/USD`
- `assetConfidence` should be >= 70 for all items

**Example Good Matches:**
```json
{
  "headline": "Fed signals rate pause, stocks rally",
  "primaryAsset": "SPY/USD",
  "isProxyAsset": true,
  "assetConfidence": 75
}
```

---

### ✅ Test 4: Verify Tier Distribution

**Goal**: Verify Tier A (breaking) and Tier B (actionable) items are correctly classified

**Steps:**
1. Call API:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | {headline, tier, urgency, assetConfidence, isProxyAsset}'
   ```

2. Check tier distribution:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '{tierACount, tierBCount, total: .count}'
   ```

**Expected:**
- **Tier A items**:
  - `urgency: 3`
  - `assetConfidence >= 80`
  - `isProxyAsset: false` (specific asset mentioned)
  - Headlines contain: "breaking", "just in", "crash", "surge", etc.

- **Tier B items**:
  - `assetConfidence >= 70`
  - `urgency >= 1`
  - Can be proxy assets

- **Tier A count**: 2-5 items
- **Tier B count**: 6-15 items

**Example Tier A:**
```json
{
  "headline": "Breaking: Bitcoin crashes 10% on SEC news",
  "tier": "A",
  "urgency": 3,
  "assetConfidence": 85,
  "isProxyAsset": false
}
```

**Example Tier B:**
```json
{
  "headline": "Stock market rallies on Fed comments",
  "tier": "B",
  "urgency": 2,
  "assetConfidence": 75,
  "isProxyAsset": true
}
```

---

### ✅ Test 5: Verify Deduplication

**Goal**: Verify same-asset items within ±5 minutes are deduplicated

**Steps:**
1. Call API and group by asset:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items | group_by(.primaryAsset) | map({asset: .[0].primaryAsset, count: length, items: map(.headline)})'
   ```

**Expected:**
- For each asset, items published within 5 minutes should be deduplicated
- Only the highest-tier item kept (Tier A > Tier B)
- If same tier, highest confidence kept
- If same confidence, most recent kept

**Example:**
If you have 3 BTC/USD items published at:
- 10:00 AM (Tier B, confidence 70)
- 10:02 AM (Tier A, confidence 85) ← Should keep this
- 10:03 AM (Tier B, confidence 75)

Only the Tier A item at 10:02 AM should appear.

---

### ✅ Test 6: Verify Freshness Filtering

**Goal**: Verify cached items are re-filtered for freshness at response time

**Steps:**
1. Call API twice (second call will use cache):
   ```bash
   # First call - fetches fresh
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.count'
   
   # Wait 16 minutes (or modify cache TTL for testing)
   # Second call - should filter out expired items
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.count'
   ```

2. Check server logs:
   ```
   [RSS API] ✅ Serving from global cache (age: Xs)
   ```

**Expected:**
- Cached items older than 15 minutes should be filtered out
- Response count may decrease if items aged out
- Fresh items should still appear

**To test faster:**
- Temporarily reduce `CACHE_TTL_15MIN` to 1 minute in `route.ts`
- Call API, wait 2 minutes, call again
- Items older than 15 minutes should be filtered

---

### ✅ Test 7: Verify Sorting (Tier A First)

**Goal**: Verify Tier A items appear before Tier B items

**Steps:**
1. Call API and check order:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items | map({tier, headline}) | .[0:5]'
   ```

**Expected:**
- First items should be Tier A (if any exist)
- Then Tier B items
- Within each tier, newest first

**Example Order:**
```json
[
  {"tier": "A", "headline": "Breaking: Bitcoin crashes..."},
  {"tier": "A", "headline": "Just in: SEC approves..."},
  {"tier": "B", "headline": "Stock market rallies..."},
  {"tier": "B", "headline": "Crypto prices surge..."}
]
```

---

### ✅ Test 8: Verify UI Display

**Goal**: Verify swipe feed shows items correctly in the UI

**Steps:**
1. Navigate to `http://localhost:3000` (swipe page)
2. Login if required
3. Check:
   - Cards are displaying
   - You can swipe through multiple cards (not just 2-3)
   - Each card shows a headline

**Expected:**
- 10-20 cards available to swipe
- Cards load smoothly
- No empty state during market hours

**If you see empty state:**
- Check browser console for errors
- Verify API is returning items (Test 1)
- Check if you're testing during low-news periods (late night/weekend)

---

### ✅ Test 9: Verify Confidence Scoring

**Goal**: Verify items have confidence scores >= 70

**Steps:**
1. Call API:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | {headline, assetConfidence, primaryAsset} | select(.assetConfidence < 70)'
   ```

**Expected:**
- **No results** (all items should have confidence >= 70)
- If you see results, that's a bug

**Check confidence distribution:**
```bash
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items | map(.assetConfidence) | {min: min, max: max, avg: (add/length)}'
```

**Expected:**
- `min: 70` (all items >= 70)
- `max: 100`
- `avg: 75-85` (reasonable average)

---

### ✅ Test 10: Verify Explainer Content Exclusion

**Goal**: Verify analysis/explainer articles are excluded

**Steps:**
1. Call API and check for excluded patterns:
   ```bash
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | select(.headline | test("(?i)(what is|how to|explained|analysis:|guide to)")) | .headline'
   ```

**Expected:**
- **No results** (explainer content should be excluded)

**Excluded Patterns:**
- "What is Bitcoin?"
- "How to trade crypto"
- "Analysis: Market trends"
- "Guide to investing"
- "Everything you need to know about..."

---

## Debugging Tips

### If Items Count is Still Low (2-3):

1. **Check RSS Feed Response Times:**
   - Some feeds may be slow or timing out
   - Check server logs for feed failures

2. **Verify Proxy Keywords Are Matching:**
   ```bash
   # Test keyword matching directly
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | select(.isProxyAsset == true) | {headline, primaryAsset}'
   ```
   - Should see proxy assets matching general market news

3. **Check Time Window:**
   - 15-minute window is strict
   - Try 30 minutes temporarily to see if more items appear:
     ```bash
     curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25" | jq '.count'
     ```

4. **Verify Confidence Threshold:**
   - Lower threshold temporarily to 60 to see if items are being filtered:
     - Edit `client/lib/config/tradingPairs.ts`
     - Change `confidence >= 70` to `confidence >= 60`
     - Restart dev server
     - Check if more items appear

### If Tier A Count is 0:

- **Normal during low-news periods** (late night, weekends)
- Tier A requires: urgency 3 + confidence >= 80 + non-proxy
- Check if any items have `urgency: 3`:
  ```bash
  curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" | jq '.items[] | select(.urgency == 3) | {headline, urgency, assetConfidence, isProxyAsset}'
  ```

### If Deduplication Seems Too Aggressive:

- Check time differences between same-asset items
- Items within 5 minutes are deduplicated
- This is intentional to avoid duplicate news

---

## Performance Testing

### Test Cache Performance:

1. **First Request** (cache miss):
   ```bash
   time curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" > /dev/null
   ```
   - Should take 5-15 seconds (fetching from RSS feeds)

2. **Second Request** (cache hit):
   ```bash
   time curl "http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25" > /dev/null
   ```
   - Should take < 100ms (serving from cache)

---

## Manual Testing Script

Save this as `test-rss-api.sh`:

```bash
#!/bin/bash

echo "🧪 Testing RSS Feed API..."
echo ""

API_URL="http://localhost:3000/api/rss-news?maxAgeMinutes=15&limit=25"

echo "1️⃣ Fetching items..."
RESPONSE=$(curl -s "$API_URL")

echo "2️⃣ Item Count:"
echo "$RESPONSE" | jq '.count'

echo "3️⃣ Tier Distribution:"
echo "$RESPONSE" | jq '{tierA: .tierACount, tierB: .tierBCount, total: .count}'

echo "4️⃣ Proxy Assets:"
echo "$RESPONSE" | jq '.items | map(select(.isProxyAsset == true)) | length'

echo "5️⃣ Confidence Range:"
echo "$RESPONSE" | jq '.items | map(.assetConfidence) | {min: min, max: max, avg: (add/length)}'

echo "6️⃣ Sample Items:"
echo "$RESPONSE" | jq '.items[0:3] | map({headline, tier, primaryAsset, assetConfidence})'

echo ""
echo "✅ Test Complete!"
```

Make it executable and run:
```bash
chmod +x test-rss-api.sh
./test-rss-api.sh
```

---

## Success Criteria

✅ **Primary Goal Met:**
- Swipe feed returns 10-20 items during active news periods
- No empty state during market hours

✅ **Secondary Goals Met:**
- Tier A: 2-5 breaking news items
- Tier B: 6-15 actionable items
- Proxy assets matching general market news
- Deduplication working correctly
- Freshness filtering working correctly

---

## Next Steps

If tests pass:
- Deploy to staging/production
- Monitor logs for feed failures
- Track item counts over time

If tests fail:
- Check specific test above for debugging tips
- Review server logs for errors
- Verify RSS feeds are accessible





