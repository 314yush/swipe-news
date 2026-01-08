# APITube Integration Setup

## Environment Variable

Set the APITube API key in your environment:

```bash
export APITUBE_API_KEY=api_live_N5u3PhEreowICgA8Z9PTTEbOThAsvE611K4G8hr2cCnxcwpKeP6kPf05
```

Or add it to your `.env.local` file in the `client/` directory:

```
APITUBE_API_KEY=api_live_N5u3PhEreowICgA8Z9PTTEbOThAsvE611K4G8hr2cCnxcwpKeP6kPf05
```

## Testing

1. Start your Next.js development server:
   ```bash
   cd client
   npm run dev
   ```

2. Test the API endpoint:
   ```bash
   # Swipe feed (30 minutes, tier-based sorting)
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25"
   
   # Feed page (24 hours, chronological sorting)
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=1440&limit=100"
   
   # With category filter
   curl "http://localhost:3000/api/rss-news?category=Crypto&maxAgeMinutes=30"
   
   # With debug stats
   curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&debug=true"
   ```

## What Changed

- **Replaced RSS feeds** with APITube API (500k+ verified sources)
- **Preserved all filtering logic**: Asset matching, tier assignment, urgency scoring
- **Maintained caching**: Same 30min/5min cache TTLs
- **Kept deduplication**: URL/ID and asset-based deduplication unchanged
- **Same sorting**: Tier-based for swipe feed, chronological for feed page

## Expected Results

- More news articles available (500k+ sources vs ~50 RSS feeds)
- More reliable timestamps (APITube provides real-time data)
- Better coverage across categories
- Same filtering accuracy (asset matching logic unchanged)

## Monitoring

Check server logs for:
- `[APITube API]` prefixed messages showing fetch progress
- Normalization statistics showing filtering rates
- Cache hit/miss information




