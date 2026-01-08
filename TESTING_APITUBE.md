# Testing APITube Integration

## Quick Start

### 1. Set Environment Variable

**Option A: Export in terminal**
```bash
export APITUBE_API_KEY=api_live_N5u3PhEreowICgA8Z9PTTEbOThAsvE611K4G8hr2cCnxcwpKeP6kPf05
```

**Option B: Add to `.env.local` file** (recommended)
```bash
cd client
echo "APITUBE_API_KEY=api_live_N5u3PhEreowICgA8Z9PTTEbOThAsvE611K4G8hr2cCnxcwpKeP6kPf05" >> .env.local
```

### 2. Start Development Server

```bash
cd client
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Test the API

**Option A: Use the test script**
```bash
# From project root
./test-apitube.sh
```

**Option B: Manual curl commands**

```bash
# Basic test (30-minute window, swipe feed)
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25" | jq

# With debug stats
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25&debug=true" | jq

# Feed page (24-hour window)
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=1440&limit=100" | jq

# Filter by category
curl "http://localhost:3000/api/rss-news?category=Crypto&maxAgeMinutes=30" | jq
```

**Option C: Test in browser**

Open these URLs in your browser:
- `http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25`
- `http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25&debug=true`

## What to Look For

### ✅ Success Indicators

1. **Response structure**: Should have `success: true`, `items` array, `tierACount`, `tierBCount`
2. **Item count**: Should get 5-25 items for 30-minute window
3. **Tier distribution**: Should have both Tier A and Tier B items
4. **Confidence scores**: All items should have `assetConfidence >= 70`
5. **Source**: Response should show `"APITube (500k+ verified sources)"`

### ⚠️ Troubleshooting

**No items returned:**
- Check server logs for `[APITube API]` messages
- Verify API key is set correctly
- Try extending time window: `?maxAgeMinutes=60` or `?maxAgeMinutes=1440`
- Check if it's a low-news period (late night/weekend)

**API errors:**
- Check server console for error messages
- Verify `APITUBE_API_KEY` environment variable is set
- Check API key is valid and has quota remaining

**Low item count:**
- Normal during low-news periods
- Try 24-hour window: `?maxAgeMinutes=1440`
- Check debug stats: `?debug=true`

## Server Logs

Watch your terminal where `npm run dev` is running. You should see:

```
[APITube API] 🔄 Cache miss/expired, fetching fresh news from APITube...
[APITube] Fetching news from APITube API...
[APITube] ✅ Fetched 200 articles (total: 200)
[APITube API] 📊 Normalization Statistics:
  Total parsed from APITube: 200
  ❌ Filtered by age: X
  ❌ Filtered by asset: Y
  ❌ Filtered by tier: Z
  ✅ Passed all filters: N
[APITube API] ✅ Fetched and cached N items
```

## Testing Different Scenarios

### Test News Abundance
```bash
# Compare 30min vs 24h windows
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30" | jq '.count'
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=1440" | jq '.count'
```

### Test Filtering Accuracy
```bash
# Check asset matching
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&debug=true" | jq '.debug.normalizationStats'
```

### Test Caching
```bash
# First request (cache miss)
time curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30" > /dev/null

# Second request (cache hit - should be faster)
time curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30" > /dev/null
```

### Test Categories
```bash
# Test each category
for cat in Crypto Tech Finance Energy Metals Politics Business; do
  echo "Testing $cat:"
  curl -s "http://localhost:3000/api/rss-news?category=$cat&maxAgeMinutes=1440" | jq '.count'
done
```

## Expected Results

- **News abundance**: Should see more articles than RSS (500k+ sources vs ~50 feeds)
- **Filtering**: Same accuracy as RSS (asset matching, tiering preserved)
- **Performance**: Similar or better (single API call vs multiple RSS feeds)
- **Reliability**: More reliable timestamps (real-time vs RSS delays)




