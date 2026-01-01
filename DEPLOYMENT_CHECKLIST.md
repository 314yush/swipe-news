# Deployment Checklist

Use this checklist to ensure everything is configured correctly for Vercel deployment.

## Pre-Deployment

### Trading Service
- [ ] Trading service deployed (Railway/Render/your server)
- [ ] Trading service URL is accessible via HTTPS
- [ ] CORS configured to allow your Vercel domain
- [ ] Environment variables set on trading service:
  - [ ] `AVANTIS_RPC_URL`
  - [ ] `PRIVY_APP_ID`
  - [ ] `PRIVY_APP_SECRET`
  - [ ] `ALLOWED_ORIGINS` (comma-separated list of Vercel domains)

### Supabase (if using)
- [ ] Supabase project created
- [ ] All migrations run (001-010)
- [ ] Edge Functions deployed (if using)
- [ ] Supabase URL and keys ready

### Vercel Configuration
- [ ] GitHub repository connected
- [ ] Root directory set to `client`
- [ ] Framework preset: Next.js
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`

## Environment Variables in Vercel

### Required
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID

### Recommended
- [ ] `TRADING_SERVICE_URL` - Your deployed trading service URL
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase key

### Optional
- [ ] `NEXT_PUBLIC_NEWSAPI_KEY` - For news fetching
- [ ] `NEXT_PUBLIC_ALPHAVANTAGE_KEY` - Alternative news source
- [ ] `NEXT_PUBLIC_CRYPTOPANIC_KEY` - Crypto news
- [ ] `NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP` - Gas sponsorship toggle

**Important**: Set variables for Production, Preview, and Development environments.

## Post-Deployment Testing

### Basic Functionality
- [ ] App loads without errors
- [ ] Login with Privy works
- [ ] News feed loads
- Swipe gestures work

### Trading Functionality
- [ ] Can build transactions (calls trading service)
- [ ] Can execute trades
- [ ] Portfolio page loads
- [ ] Trade history displays

### Error Handling
- [ ] Check browser console for errors
- [ ] Check Vercel logs for server errors
- [ ] Check trading service logs
- [ ] Test with network tab open

## CORS Configuration

### Trading Service CORS
Update `server/trading-service/main.py` or set environment variable:

```bash
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

Or update the code to include your Vercel domain:
```python
allow_origins=[
    "https://your-app.vercel.app",
    "https://your-app-*.vercel.app",  # Preview deployments
    "http://localhost:3000",  # Local dev
]
```

## Monitoring

- [ ] Vercel Analytics enabled (optional)
- [ ] Error tracking set up (optional)
- [ ] Trading service monitoring configured
- [ ] Alerts configured for critical errors

## Security Checklist

- [ ] No sensitive keys in code
- [ ] All secrets in environment variables
- [ ] CORS properly restricted (not `*` in production)
- [ ] HTTPS enabled everywhere
- [ ] Privy App ID is correct
- [ ] Supabase keys are correct

## Performance

- [ ] Build completes successfully
- [ ] First load time is acceptable
- [ ] Images optimized
- [ ] API routes respond quickly
- [ ] Trading service responds quickly

## Troubleshooting Common Issues

### Build Fails
- Check Vercel build logs
- Verify all dependencies in package.json
- Check for TypeScript errors locally

### Trading Service Not Responding
- Verify `TRADING_SERVICE_URL` is correct
- Check CORS configuration
- Test trading service URL directly
- Check trading service logs

### Environment Variables Not Working
- Ensure `NEXT_PUBLIC_` prefix for client-side vars
- Redeploy after adding variables
- Check variable names are exact (case-sensitive)

### CORS Errors
- Update trading service CORS
- Check browser console for specific error
- Verify trading service is HTTPS

## Quick Deploy Commands

### Vercel CLI
```bash
cd client
vercel
vercel --prod
```

### Set Environment Variables
```bash
vercel env add NEXT_PUBLIC_PRIVY_APP_ID
vercel env add TRADING_SERVICE_URL
# ... add others as needed
```

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console
3. Check trading service logs
4. Review VERCEL_DEPLOYMENT.md for detailed instructions

