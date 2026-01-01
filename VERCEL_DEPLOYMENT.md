# Vercel Deployment Guide

This guide explains how to deploy the client/UI to Vercel while keeping the trading service and other components working.

## Architecture Overview

When deployed to Vercel:
- **Client/UI**: Deployed on Vercel (Next.js)
- **Trading Service**: Runs separately (Python FastAPI) - can be on Railway, Render, or your own server
- **Supabase**: Cloud-hosted database and Edge Functions

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Trading Service**: Deploy the Python service separately (see below)
4. **Supabase Project**: Set up at [supabase.com](https://supabase.com)

## Step 1: Deploy Trading Service

The Python trading service needs to be deployed separately. Options:

### Option A: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repo
4. Add a service from the `server/trading-service` directory
5. Set environment variables:
   - `AVANTIS_RPC_URL=https://mainnet.base.org`
   - `PRIVY_APP_ID=your-privy-app-id`
   - `PRIVY_APP_SECRET=your-privy-app-secret`
6. Deploy and note the service URL (e.g., `https://your-service.railway.app`)

### Option B: Render
1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repo
4. Set root directory to `server/trading-service`
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Set environment variables (same as Railway)
8. Deploy and note the service URL

### Option C: Your Own Server
- Deploy the Python service to any server with Python 3.9+
- Ensure it's accessible via HTTPS
- Note the public URL

## Step 2: Deploy Client to Vercel

### Via Vercel Dashboard

1. **Import Project**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the repository

2. **Configure Project**:
   - **Root Directory**: `client` (important!)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

3. **Set Environment Variables**:
   Click "Environment Variables" and add:

   **Required:**
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
   ```

   **Optional (for full functionality):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
   TRADING_SERVICE_URL=https://your-trading-service-url.com
   NEXT_PUBLIC_NEWSAPI_KEY=your-newsapi-key (optional)
   NEXT_PUBLIC_ALPHAVANTAGE_KEY=your-alphavantage-key (optional)
   NEXT_PUBLIC_CRYPTOPANIC_KEY=your-cryptopanic-key (optional)
   NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP=true (optional)
   ```

   **Important**: 
   - `TRADING_SERVICE_URL` should be your deployed trading service URL (from Step 1)
   - Make sure to set these for **Production**, **Preview**, and **Development** environments

4. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Navigate to client directory**:
   ```bash
   cd client
   ```

4. **Deploy**:
   ```bash
   vercel
   ```

5. **Set Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_PRIVY_APP_ID
   vercel env add TRADING_SERVICE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   # ... add other variables as needed
   ```

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 3: Configure CORS

The trading service needs to allow requests from your Vercel domain.

### Update Trading Service CORS

In `server/trading-service/main.py`, update the CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.vercel.app",
        "https://your-project-*.vercel.app",  # For preview deployments
        "http://localhost:3000",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Or for development, you can keep `allow_origins=["*"]` but restrict it in production.

## Step 4: Verify Deployment

1. **Check Vercel Deployment**:
   - Visit your Vercel dashboard
   - Check that the deployment succeeded
   - View logs if there are any errors

2. **Test the Application**:
   - Visit your Vercel URL
   - Try logging in with Privy
   - Test fetching news
   - Test building a transaction (this will call your trading service)

3. **Check Trading Service**:
   - Ensure your trading service is running and accessible
   - Test the endpoint: `https://your-trading-service-url.com/build-transaction`
   - Check CORS headers are correct

## Environment Variables Reference

### Required for Vercel
- `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID

### Optional but Recommended
- `TRADING_SERVICE_URL` - URL of your deployed trading service
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key

### Optional
- `NEXT_PUBLIC_NEWSAPI_KEY` - For fetching news
- `NEXT_PUBLIC_ALPHAVANTAGE_KEY` - Alternative news source
- `NEXT_PUBLIC_CRYPTOPANIC_KEY` - Crypto news source
- `NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP` - Enable gas sponsorship

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors locally first

### Trading Service Not Responding
- Verify `TRADING_SERVICE_URL` is set correctly
- Check CORS configuration on trading service
- Test the trading service URL directly in browser/Postman
- Check trading service logs

### Environment Variables Not Working
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### CORS Errors
- Update trading service CORS to include your Vercel domain
- Check browser console for specific CORS error messages
- Ensure trading service is accessible via HTTPS

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:
- **Production**: Deploys from `main` branch
- **Preview**: Deploys from other branches/PRs

Each deployment gets a unique URL, so you can test changes before merging.

## Custom Domain

To use a custom domain:
1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Logs**: View in Vercel dashboard under "Deployments"
- **Trading Service**: Monitor via your hosting provider (Railway/Render)

## Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Trading Service**: Check pricing for Railway/Render
- **Supabase**: Free tier available with limits

## Next Steps

After deployment:
1. Test all features end-to-end
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up CI/CD for automated deployments

