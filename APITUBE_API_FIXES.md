# APITube API Integration Fixes

## Issues Found

Based on the [APITube documentation](https://docs.apitube.io/platform/news-api/technical-faq), we identified several issues with our API implementation:

### 1. **Rate Limit Configuration** ✅ CONFIGURED
**Status**: Configured for paid plan
- **Free plan limit**: 100 articles per request
- **Paid plan limit**: 500 articles per request ✅ (We have paid plan)

**Configuration**: 
- Capped `per_page` to 500 (paid plan limit)
- 15-minute window: 200 articles per request
- 24-hour window: 500 articles per request
- Added warning when requesting more than limit

### 2. **Date Format** ✅ CORRECT
**Status**: Our date format is correct
- Using `published_at.start` parameter ✅
- Using ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ` ✅
- Format matches APITube documentation ✅

### 3. **Authentication** ✅ CORRECT
**Status**: Authentication is correct
- Using `X-API-Key` header ✅
- Header name is case-sensitive and correct ✅

### 4. **Endpoint** ✅ CORRECT
**Status**: Endpoint is correct
- Using `/v1/news/everything` ✅
- Base URL: `https://api.apitube.io` ✅

### 5. **Parameters** ✅ MOSTLY CORRECT
**Status**: Parameters are correct
- `per_page`: ✅ (now capped to 100)
- `page`: ✅
- `language.code`: ✅
- `published_at.start`: ✅

## Changes Made

### `apitube.ts`
1. **Capped `per_page` to 500** to respect paid plan limits
2. **Added warning** when requesting more than paid plan limit (500)
3. **Improved date format** to use full ISO 8601 (was already correct, but now more explicit)
4. **Added rate limit header logging** to monitor API usage
5. **Better error messages** for rate limit issues

### `route.ts`
1. **Configured `perPage` for paid plan**: 200 for 15-minute window, 500 for 24-hour window
2. **Added comments** explaining the rate limit constraints

## API Usage According to Docs

From [APITube Technical FAQ](https://docs.apitube.io/platform/news-api/technical-faq):

### Rate Limits
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- We now log these headers to monitor usage

### Article Limits
- **Free plan**: 100 articles per request
- **Paid plan**: 500 articles per request
- Use pagination (`page` parameter) to get more articles

### Date Filtering
- Use `published_at.start` for start date
- Use `published_at.end` for end date
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

## Testing

After these fixes, test with:

```bash
# Should work now (within paid plan limits)
curl "http://localhost:3000/api/rss-news?maxAgeMinutes=30&limit=25"

# Check rate limit headers in logs
# Look for: [APITube] Rate limit: X/Y requests remaining
```

## Current Configuration (Paid Plan)

- **15-minute window**: 200 articles per request
- **24-hour window**: 500 articles per request
- **Max per request**: 500 articles (paid plan limit)

## Next Steps

1. **Monitor rate limits**: Check logs for `X-RateLimit-Remaining` warnings
2. **Use pagination**: If you need more than 500 articles, use `page` parameter
3. **Check API status**: If 500 errors persist, check [APITube API Status](https://docs.apitube.io/platform/news-api/api-status)
4. **Monitor usage**: Watch rate limit headers to ensure you're not hitting daily/monthly limits

## References

- [APITube Documentation](https://docs.apitube.io/guides/user-guide/what-is-apitube)
- [Technical FAQ](https://docs.apitube.io/platform/news-api/technical-faq)
- [Parameters Documentation](https://docs.apitube.io/platform/news-api/parameters)
- [Rate Limits](https://docs.apitube.io/platform/news-api/rate-limits-and-quotas)

