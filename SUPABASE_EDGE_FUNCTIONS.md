# Supabase Edge Functions - Deprecated

## ⚠️ Edge Functions No Longer Required

**As of the latest update, Supabase Edge Functions are no longer used for trading operations.**

All trading operations (build-transaction, execute-trade, close-trade) are now handled directly by the Python FastAPI service. The client calls the Python service endpoints directly, eliminating the need for Edge Functions.

## Current Architecture

```
Client (Next.js)
  ↓
Python Trading Service (FastAPI)
  ↓
Avantis SDK
  ↓
On-chain (Base)
```

## What Changed

- **Removed**: Supabase Edge Functions for trading operations
- **Removed**: Trade storage in Supabase database (trades are fetched from Avantis SDK)
- **Kept**: Direct Python service calls for all trading operations
- **Kept**: Supabase database for user authentication and news caching (optional)

## Migration Notes

- Existing Edge Functions have been removed from the codebase
- No Edge Function deployment is required
- All trading operations go through the Python service
- Trades are fetched on-demand from Avantis SDK via `getTrades()` endpoint

## Benefits

1. **Simplified architecture**: Fewer moving parts, easier to maintain
2. **Reduced latency**: Direct calls to Python service, no Edge Function overhead
3. **Cost savings**: No Edge Function invocations
4. **Single source of truth**: Avantis SDK is the authoritative source for trades
5. **Easier debugging**: Fewer layers to trace through

## For Deployment

When deploying to Vercel or any other platform:
- **No Edge Functions needed**: Just deploy the Next.js client and Python service
- **Set `TRADING_SERVICE_URL`**: Point to your deployed Python service
- **Optional Supabase**: Only needed for user authentication and news caching
