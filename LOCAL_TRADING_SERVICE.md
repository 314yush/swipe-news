# Running Trading Service Locally with Vercel Deployment

This guide explains how to keep your trading service running locally while deploying the client to Vercel.

## Quick Start

### 1. Start Your Local Trading Service

```bash
cd server/trading-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### 2. Expose Local Service to Internet

You need a tunnel so Vercel can reach your local service. Choose one:

#### Option A: ngrok (Recommended)

1. **Install ngrok**:
   ```bash
   brew install ngrok  # macOS
   # Or download from https://ngrok.com/download
   ```

2. **Sign up** (free): https://dashboard.ngrok.com/signup

3. **Authenticate**:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

4. **Start tunnel**:
   ```bash
   ngrok http 8000
   ```

5. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

#### Option B: localtunnel (Free, No Signup)

1. **Install**:
   ```bash
   npm install -g localtunnel
   ```

2. **Start tunnel**:
   ```bash
   lt --port 8000
   ```

3. **Copy the URL** provided

#### Option C: Cloudflare Tunnel (Free, More Stable)

1. **Install**:
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Start tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```

3. **Copy the HTTPS URL** provided

### 3. Configure CORS

Set environment variable or update code to allow your Vercel domain:

**Using .env file** (recommended):
```bash
cd server/trading-service
echo "ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app,http://localhost:3000" >> .env
```

**Or export before starting**:
```bash
export ALLOWED_ORIGINS="https://your-app.vercel.app,https://your-app-*.vercel.app,http://localhost:3000"
uvicorn main:app --reload --port 8000
```

### 4. Set Vercel Environment Variable

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   ```
   TRADING_SERVICE_URL=https://your-tunnel-url.ngrok.io
   ```
   (Use your actual tunnel URL)

4. Redeploy your Vercel app

## Keeping Tunnel Running

### ngrok (with static domain - paid)

For production, consider ngrok's paid plan which gives you a static domain:

```bash
ngrok http 8000 --domain=your-static-domain.ngrok-free.app
```

### Using a Process Manager

Keep both services running with `foreman` or `pm2`:

**Install foreman**:
```bash
gem install foreman
```

**Create `Procfile`** in project root:
```
trading-service: cd server/trading-service && source venv/bin/activate && uvicorn main:app --reload --port 8000
tunnel: ngrok http 8000
```

**Run both**:
```bash
foreman start
```

### Using tmux/screen

Keep services running in background:

```bash
# Start tmux session
tmux new -s trading

# Start trading service
cd server/trading-service
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Split window (Ctrl+B then ")
# Start ngrok in other pane
ngrok http 8000

# Detach: Ctrl+B then d
# Reattach: tmux attach -t trading
```

## Troubleshooting

### Tunnel URL Changed

If your tunnel URL changes (ngrok free tier):
1. Update `TRADING_SERVICE_URL` in Vercel
2. Redeploy or wait for next deployment

### CORS Errors

- Check that `ALLOWED_ORIGINS` includes your Vercel domain
- Verify the domain matches exactly (including https://)
- Check browser console for specific CORS error

### Service Not Responding

- Verify trading service is running: `curl http://localhost:8000/docs`
- Check tunnel is active: visit tunnel URL in browser
- Check Vercel logs for connection errors
- Verify `TRADING_SERVICE_URL` is set correctly in Vercel

### ngrok Free Tier Limitations

- URL changes on restart
- Limited connections per minute
- Consider paid plan for production use

## Production Recommendation

For production, deploy the trading service to:
- **Railway** (easiest, good free tier)
- **Render** (free tier available)
- **Your own server** (most control)

This gives you:
- Stable URL (no tunnel needed)
- Better reliability
- No need to keep local machine running
- Better performance

See `VERCEL_DEPLOYMENT.md` for deployment options.

## Quick Reference

**Start trading service**:
```bash
cd server/trading-service && source venv/bin/activate && uvicorn main:app --reload --port 8000
```

**Start ngrok tunnel**:
```bash
ngrok http 8000
```

**Set CORS**:
```bash
export ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:3000"
```

**Update Vercel env var**:
- Dashboard → Project → Settings → Environment Variables
- Add/update `TRADING_SERVICE_URL` with tunnel URL

