# APITube Rate Limit Monitoring

## Rate Limits by Plan

According to [APITube Rate Limits Documentation](https://docs.apitube.io/platform/news-api/rate-limits):

| Plan         | Rate Limit                                    |
| ------------ | --------------------------------------------- |
| Free         | 30 requests per 30 minutes                    |
| Basic        | 1500 requests per 15 minutes                  |
| Professional | 3000 requests per 15 minutes                  |
| Corporate    | 5000 requests per 15 minutes                  |

## How to Check if We've Crossed the Quota

### 1. **Check Server Logs**

Look for these log messages in your server output:

#### ✅ Normal Usage
```
[APITube] Rate limit: 1495/1500 requests remaining (0.3% used, resets in 12min)
```

#### ⚠️ Warning (Low but OK)
```
[APITube] ⚠️ WARNING: Low rate limit: 200/1500 requests remaining (86.7% used)
[APITube] Rate limit resets in: 8 minutes
```

#### 🚨 Critical (Almost Exhausted)
```
[APITube] 🚨 CRITICAL: Rate limit almost exhausted! 50/1500 requests remaining (96.7% used)
[APITube] Rate limit resets in: 3 minutes
```

#### ❌ Rate Limit Exceeded (429 Error)
```
[APITube] ❌ RATE LIMIT EXCEEDED (429)
[APITube] Rate limit: 1500 requests per window
[APITube] Rate limit resets in: 10 minutes (600 seconds)
```

### 2. **Check HTTP Response Headers**

Every API response includes these headers:

- `X-RateLimit-Limit`: Maximum requests per window (e.g., `1500`)
- `X-RateLimit-Remaining`: Requests remaining (e.g., `1495`)
- `X-RateLimit-Reset`: Seconds until reset (e.g., `600`)

### 3. **Calculate Request Frequency**

Our current setup:
- **Cache TTL**: 5 minutes
- **Requests per cache refresh**: 1 request per endpoint call
- **Maximum requests per hour**: ~12 requests/hour (if cache misses every 5 min)
- **Maximum requests per 15 minutes**: ~3 requests/15min

**This is well within all plan limits**, even the free plan (30/30min).

### 4. **Potential Issues**

#### Multiple Users/Endpoints
If you have:
- Multiple users hitting the API simultaneously
- Multiple endpoints calling APITube
- Cache not working properly

You could exceed limits. Check:
```bash
# Count API calls in logs
grep "\[APITube\] Fetching news" server.log | wc -l

# Check for 429 errors
grep "429\|RATE LIMIT" server.log
```

#### Cache Not Working
If cache isn't working, every user request = 1 API call. With 10 users and 5-minute cache:
- 10 requests every 5 minutes = 120 requests/hour
- Still within Basic plan (1500/15min = 6000/hour)

## Current Monitoring

### ✅ What We're Monitoring

1. **Rate limit headers** - Logged on every request
2. **Usage percentage** - Calculated and logged
3. **Reset time** - Shows when limit resets
4. **Warnings** - Alerts when <20% remaining
5. **Critical alerts** - Alerts when <5% remaining
6. **429 errors** - Special handling with reset time

### 📊 Log Levels

- **Info**: Normal usage (<80% used)
- **Warning**: Low but OK (20-5% remaining)
- **Error**: Critical (<5% remaining) or 429 error

## How to Fix Rate Limit Issues

### If You Get 429 Errors:

1. **Check your plan**: Verify which plan you have
   ```bash
   # Check logs for rate limit headers
   grep "X-RateLimit-Limit" server.log | tail -1
   ```

2. **Wait for reset**: The error message shows reset time
   ```
   Rate limit resets in: 10 minutes
   ```

3. **Increase cache TTL**: Reduce API calls by caching longer
   ```typescript
   // In route.ts, increase CACHE_TTL_15MIN
   const CACHE_TTL_15MIN = 10 * 60 * 1000; // 10 minutes instead of 5
   ```

4. **Upgrade plan**: If consistently hitting limits, upgrade
   - Basic: 1500/15min
   - Professional: 3000/15min
   - Corporate: 5000/15min

### If Approaching Limits:

1. **Monitor logs**: Watch for warnings
2. **Reduce cache refresh**: Increase cache TTL
3. **Batch requests**: Use pagination instead of multiple calls
4. **Optimize**: Only fetch when cache expires

## Testing Rate Limits

### Check Current Usage

```bash
# Start your server and make a request
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25"

# Check logs for rate limit info
# Look for: [APITube] Rate limit: X/Y requests remaining
```

### Simulate High Usage

```bash
# Make multiple rapid requests (if testing)
for i in {1..10}; do
  curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25" &
done
wait

# Check logs for rate limit warnings
```

## References

- [APITube Rate Limits](https://docs.apitube.io/platform/news-api/rate-limits)
- [HTTP Response Codes](https://docs.apitube.io/platform/news-api/http-response-codes)
- [Rate Limit Headers](https://docs.apitube.io/platform/news-api/rate-limits#monitoring-rate-limits)


