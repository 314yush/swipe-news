# APITube Endpoints Analysis

## Current Implementation

We're using **`/v1/news/everything`** endpoint, which is the correct choice for our use case.

## Available Endpoints

According to [APITube Endpoints Documentation](https://docs.apitube.io/platform/news-api/endpoints):

| Endpoint | Description | Use Case |
|----------|-------------|----------|
| `/v1/news/everything` | Get all articles | ✅ **We use this** - Most flexible |
| `/v1/news/top-headlines` | Get top headlines | Breaking news, but limited filtering |
| `/v1/news/category` | Get articles by category | Category-specific, requires category IDs |
| `/v1/news/topic` | Get articles by topic | Topic-specific |
| `/v1/news/industry` | Get articles by industry | Industry-specific |
| `/v1/news/entity` | Get articles by entity | Entity-specific |
| `/v1/news/story` | Get specific story by ID | Single article lookup |
| `/v1/news/article` | Get specific article by ID | Single article lookup |

## Why `/v1/news/everything`?

### ✅ Advantages

1. **Flexible Filtering**: Supports all parameters we need:
   - `published_at.start` - Date filtering (critical for 15-minute windows)
   - `language.code` - Language filtering
   - `per_page` - Pagination
   - `page` - Page numbers

2. **Complete Coverage**: Gets articles from all sources, not just top headlines

3. **Client-Side Filtering**: We need to filter by:
   - Asset matching (keyword-based)
   - Tier assignment (urgency + confidence)
   - Avantis pair availability
   
   These filters can't be done server-side, so we need all articles.

4. **Consistent API**: Same endpoint for both 15-minute and 24-hour windows

### ❌ Why Not Other Endpoints?

**`/v1/news/top-headlines`**:
- ❌ May not support `published_at.start` parameter
- ❌ Limited to "top" articles only
- ❌ Less flexible for our filtering needs

**`/v1/news/category`**:
- ❌ Requires category ID mapping (we'd need to maintain this)
- ❌ Less flexible - can't easily combine with other filters
- ❌ We filter by asset keywords anyway, not just category

**`/v1/news/entity`**:
- ❌ Would require entity IDs for each trading pair
- ❌ Too specific - we match by keywords, not entities

## Current Usage

```typescript
// Endpoint: https://api.apitube.io/v1/news/everything
// Parameters:
// - per_page: 200 (15min) or 500 (24h)
// - page: 1
// - language.code: 'en'
// - published_at.start: ISO 8601 timestamp (for time windows)
```

## Optimization Opportunities

### Future Considerations

1. **Hybrid Approach**: Could use `/v1/news/top-headlines` for 15-minute window if:
   - It supports date filtering
   - It's faster/more efficient
   - It returns enough articles after filtering

2. **Category Endpoint**: Could use `/v1/news/category` if:
   - We map our categories to APITube category IDs
   - It reduces API response size
   - It's faster than filtering client-side

3. **Entity Matching**: Could use `/v1/news/entity` if:
   - APITube has entity data for trading pairs (BTC, ETH, etc.)
   - It's more accurate than keyword matching
   - It reduces false positives

## Current Status: ✅ Optimal

Our current implementation using `/v1/news/everything` is the best choice because:
- ✅ Supports all required parameters
- ✅ Flexible enough for our filtering needs
- ✅ Consistent across all use cases
- ✅ No additional mapping/maintenance required

## References

- [APITube Endpoints](https://docs.apitube.io/platform/news-api/endpoints)
- [APITube Parameters](https://docs.apitube.io/platform/news-api/parameters)
- [APITube Technical FAQ](https://docs.apitube.io/platform/news-api/technical-faq)

