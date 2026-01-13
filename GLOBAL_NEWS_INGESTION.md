# Global News Ingestion System

Production-ready global news ingestion system using APITube with a single pipeline and deterministic refresh cadence.

## Architecture

### Single Ingestion Pipeline
- **Single endpoint**: `/api/news` - All users hit this endpoint
- **Global snapshot**: One dataset stored in Supabase, shared by all users
- **No cron jobs**: Refresh happens on-demand when bucket changes
- **Distributed lock**: Prevents duplicate refreshes across multiple instances

### Refresh Logic

**Time-based buckets:**
- **Market hours** (Mon-Fri, 9:30 AM - 4:00 PM ET): 3-minute buckets
- **Off-hours**: 15-minute buckets

**Flow:**
1. Client hits `/api/news`
2. Server calculates current refresh bucket
3. If bucket unchanged → return cached snapshot
4. If bucket changed → acquire lock → fetch from APITube → store snapshot → return

### Data Flow

```
Client Request
    ↓
/api/news (checks bucket)
    ↓
Bucket changed? → Yes → Acquire Lock → Fetch APITube → Normalize → Store → Release Lock
    ↓ No
Return Cached Snapshot
```

## Components

### 1. Refresh Bucket Logic (`lib/services/refreshBucket.ts`)
- Calculates time-based refresh buckets
- Determines if refresh is needed based on market hours
- Returns bucket identifiers that change at refresh intervals

### 2. Distributed Lock (`lib/services/distributedLock.ts`)
- Uses Supabase `refresh_locks` table
- Prevents duplicate refreshes when multiple instances detect bucket change
- 5-minute lock timeout
- Automatic cleanup of expired locks

### 3. Global Snapshot Storage (`lib/services/globalNewsSnapshot.ts`)
- Stores single global news snapshot in Supabase `news_snapshots` table
- All users read from same snapshot
- In-memory fallback if Supabase not configured

### 4. News API Endpoint (`app/api/news/route.ts`)
- Main ingestion endpoint
- Implements bucket check → lock → fetch → store → return flow
- Returns same snapshot to all users

### 5. Feed Endpoints
- **Swipe Feed** (`app/api/swipe-feed/route.ts`): Reads from global snapshot, prioritizes recency
- **Main Feed** (`app/api/main-feed/route.ts`): Reads from global snapshot, chronological order

## Database Schema

### Migration: `011_create_refresh_locks_and_snapshots.sql`

**Tables:**
1. `refresh_locks` - Distributed locking
2. `news_snapshots` - Global news snapshot storage

**Key Features:**
- RLS enabled (service role bypasses for writes)
- Automatic `updated_at` triggers
- Indexes for fast lookups

## Environment Variables

### Required
- `APITUBE_API_KEY` - APITube API key for news fetching

### Optional (for Supabase persistence)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side writes)

**Note:** System works without Supabase using in-memory fallback, but won't persist across instances.

## Setup

### 1. Run Database Migration

```bash
# Apply migration 011
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/011_create_refresh_locks_and_snapshots.sql
```

Or use Supabase dashboard to run the migration.

### 2. Set Environment Variables

Add to `.env.local` or Vercel environment variables:

```env
APITUBE_API_KEY=your-apitube-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Deploy

The system is ready to use. Clients should call `/api/news` to get the latest news snapshot.

## Usage

### Fetching News

```typescript
// Get global news snapshot
const response = await fetch('/api/news');
const data = await response.json();

// Response:
{
  success: true,
  bucket: "market-12345", // Current bucket ID
  articles: [...], // Normalized articles
  count: 100,
  cached: false, // true if returned from cache
  timestamp: "2024-01-01T12:00:00Z"
}
```

### Swipe Feed

```typescript
// Get swipe feed (prioritizes recency)
const response = await fetch('/api/swipe-feed?limit=25');
const data = await response.json();
```

### Main Feed

```typescript
// Get main feed (chronological)
const response = await fetch('/api/main-feed?limit=100&category=crypto');
const data = await response.json();
```

## Features

### High-Volume Fetching
- Fetches up to 100 articles per request (APITube limit)
- 60-minute time window for maximum coverage
- Minimal filtering to maximize article count

### Keyword-Based Matching
- Loosely maps articles to trading pairs using keyword matching
- Confidence threshold: 40% (non-blocking)
- Supports proxy assets for general market news

### Deduplication
- Hash-based deduplication (title + source + 5-minute bucket)
- Prevents duplicate articles in snapshot

### Fallback Behavior
- If Supabase not configured: Uses in-memory storage
- If lock not acquired: Returns existing snapshot
- If fetch fails: Returns existing snapshot

## Refresh Behavior

### Market Hours (9:30 AM - 4:00 PM ET, Mon-Fri)
- Refresh every 3 minutes
- Bucket changes every 3 minutes
- More frequent updates during active trading

### Off-Hours
- Refresh every 15 minutes
- Bucket changes every 15 minutes
- Reduces API calls during low activity

### Lock Contention
- If multiple instances detect bucket change simultaneously:
  - First instance acquires lock and refreshes
  - Other instances return existing snapshot
  - Prevents duplicate API calls

## Monitoring

### Logs
- `[News API]` - Main ingestion logs
- `[Distributed Lock]` - Lock acquisition/release
- `[Global Snapshot]` - Snapshot storage operations
- `[APITube]` - API fetch operations

### Metrics to Monitor
- Refresh frequency (should match bucket intervals)
- Lock contention (should be low)
- Article count per snapshot
- API call rate (should respect APITube limits)

## Rate Limiting

### APITube Limits
- **Paid Plan**: 20,000 API calls/month
- **Refresh Frequency**: 
  - Market hours: ~20 calls/hour = ~480 calls/day
  - Off-hours: ~4 calls/hour = ~96 calls/day
  - **Total**: ~576 calls/day = ~17,280 calls/month (within limit)

### Optimization
- Bucket-based caching reduces redundant fetches
- Distributed lock prevents duplicate refreshes
- Single snapshot shared by all users

## Troubleshooting

### No Articles Returned
1. Check APITube API key is set
2. Check Supabase connection (if using persistence)
3. Check migration 011 has been run
4. Check logs for fetch errors

### Lock Not Acquiring
1. Check Supabase connection
2. Check `refresh_locks` table exists
3. Check service role key is set
4. Manually clean expired locks if needed

### Duplicate Refreshes
1. Check distributed lock is working
2. Verify multiple instances aren't bypassing lock
3. Check lock timeout (5 minutes) is appropriate

## Future Enhancements

- [ ] Add metrics/analytics endpoint
- [ ] Add manual refresh trigger
- [ ] Add snapshot versioning
- [ ] Add article expiration/cleanup
- [ ] Add category-based filtering at fetch time
- [ ] Add pagination for large snapshots


