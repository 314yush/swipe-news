# Supabase Edge Functions Configuration

## When Do You Need Edge Functions?

**For Vercel Deployment: NOT NECESSARY**

When deploying to Vercel, the client uses **Next.js API routes** (not Supabase Edge Functions). The code is configured to prefer Next.js API routes:

```javascript
const useNextApiRoute = true; // Always use Next.js API route for client-side deployment
```

So for Vercel deployment, you **don't need to configure Edge Functions** at all.

## When You DO Need Edge Functions

You only need Edge Functions if:
1. **Using Supabase Cloud** (not local Docker) and want to use Edge Functions instead of Next.js routes
2. **Testing locally** with Supabase Docker and want to test the Edge Functions
3. **Using Edge Functions in production** on Supabase cloud

## Configuration Options

### Option 1: Local Docker + Local Trading Service

If running Supabase locally with Docker and trading service on localhost:

**No changes needed** - The default `host.docker.internal:8000` works:
```typescript
const TRADING_SERVICE_URL = Deno.env.get('TRADING_SERVICE_URL') || 'http://host.docker.internal:8000';
```

### Option 2: Local Docker + ngrok Trading Service

If running Supabase locally with Docker but trading service is exposed via ngrok:

**Set environment variable** in Supabase:
```bash
# In supabase/.env or supabase/.env.local
TRADING_SERVICE_URL=https://your-ngrok-url.ngrok.io
```

Or when starting Supabase:
```bash
TRADING_SERVICE_URL=https://your-ngrok-url.ngrok.io supabase start
```

### Option 3: Supabase Cloud + Local Trading Service (ngrok)

If using Supabase cloud (not Docker) and trading service is local via ngrok:

**Set secrets in Supabase Dashboard:**
1. Go to your Supabase project
2. Navigate to Edge Functions → Settings
3. Add secret: `TRADING_SERVICE_URL` = `https://your-ngrok-url.ngrok.io`

Or via CLI:
```bash
supabase secrets set TRADING_SERVICE_URL=https://your-ngrok-url.ngrok.io
```

## For Vercel Deployment: Recommendation

**You don't need Edge Functions at all!**

The Vercel deployment uses Next.js API routes which:
- Run on Vercel (same origin as your client)
- Call your trading service directly (via ngrok or deployed URL)
- No CORS issues
- Simpler architecture

The Edge Functions are only used as a fallback if Next.js routes fail, which shouldn't happen on Vercel.

## Summary

| Scenario | Need Edge Functions? | TRADING_SERVICE_URL |
|----------|---------------------|---------------------|
| Vercel deployment | ❌ No | Set in Vercel env vars (for Next.js routes) |
| Local Docker + local trading | ✅ Optional | `http://host.docker.internal:8000` (default) |
| Local Docker + ngrok trading | ✅ Optional | `https://ngrok-url.ngrok.io` (set in .env) |
| Supabase Cloud + ngrok trading | ✅ If using | Set as Supabase secret |

## Quick Answer

**For your Vercel deployment: You don't need to change anything in Supabase Edge Functions.**

The Next.js API routes handle everything, and they get the `TRADING_SERVICE_URL` from Vercel environment variables, not from Supabase.

