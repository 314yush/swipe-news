# SwipeTrader - News Trading App

A mobile-first news trading web application where users swipe through financial news and instantly open leveraged positions on Avantis DEX.

## Features

- 📰 **Swipe Interface**: Swipe up to go LONG, down to go SHORT, or left/right to dismiss news
- 🔍 **Market Detection**: AI-powered keyword matching to detect trading pairs from news headlines
- 📊 **Portfolio**: Track active positions, trade history, and performance statistics
- ⚡ **Instant Trading**: Execute trades with 75x leverage directly from news cards
- 🎨 **Material Design 3**: Beautiful dark theme optimized for mobile
- 🔐 **Privy Authentication**: Embedded wallets for seamless trading

## Architecture

The application consists of two main components:

1. **Client** (`/client`): Next.js frontend application
2. **Trading Service** (`/server/trading-service`): Python FastAPI service for building and executing trades

All trading operations are handled directly by the Python service, which interfaces with the Avantis SDK.

## Prerequisites

- **Node.js** v20.17.0 or higher
- **Python** 3.9 or higher
- **npm** or **yarn**
- **Privy account** (for authentication) - [Get one here](https://privy.io)
- **Supabase account** (optional, for database) - [Get one here](https://supabase.com)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/314yush/swipe-news.git
cd swipe-news
```

### 2. Set Up the Client (Next.js)

```bash
cd client
npm install
```

Create a `.env.local` file in the `client` directory:

```env
# Required
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Optional - Supabase (for database features)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key

# Optional - Trading Service URL (defaults to http://localhost:8000)
TRADING_SERVICE_URL=http://localhost:8000

# Optional - News API Keys (for fetching news)
NEXT_PUBLIC_NEWSAPI_KEY=your-newsapi-key
NEXT_PUBLIC_ALPHAVANTAGE_KEY=your-alphavantage-key
NEXT_PUBLIC_CRYPTOPANIC_KEY=your-cryptopanic-key
```

### 3. Set Up the Trading Service (Python)

```bash
cd server/trading-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `server/trading-service` directory:

```env
# Avantis RPC URL
AVANTIS_RPC_URL=https://mainnet.base.org

# Privy Configuration (if using Privy for signing)
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
```

### 4. Set Up Supabase (Optional)

If you want to use Supabase for database features (user authentication, news caching):

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations in `/supabase/migrations` in order (001 through 010)

**Note**: Edge Functions are no longer required. All trading operations are handled directly by the Python service.

### 5. Run the Application

**Terminal 1 - Start the Trading Service:**
```bash
cd server/trading-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Start the Next.js Client:**
```bash
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
news-swiper/
├── client/                    # Next.js frontend
│   ├── app/                   # App Router pages
│   │   ├── page.tsx          # Home - Swipe interface
│   │   ├── feed/             # News feed page
│   │   ├── portfolio/        # Portfolio page
│   │   ├── settings/         # Settings page
│   │   └── login/             # Login page
│   ├── components/           # React components
│   ├── lib/                  # Utilities and services
│   │   ├── config/           # Market keywords, categories
│   │   ├── contracts/        # Avantis contract interfaces
│   │   ├── hooks/            # React hooks
│   │   ├── services/         # API services
│   │   ├── store/            # Zustand state management
│   │   └── utils/            # Helper functions
│   └── public/               # Static assets
├── server/
│   └── trading-service/      # Python FastAPI service
│       ├── main.py           # FastAPI application
│       ├── trader_privy.py  # Trading logic
│       └── privy_signer.py  # Privy signing utilities
└── supabase/
    └── migrations/           # Database migrations
```

## Environment Variables

### Client (Required)
- `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID (required)

### Client (Optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key
- `TRADING_SERVICE_URL` - Trading service URL (default: http://localhost:8000)
- `NEXT_PUBLIC_NEWSAPI_KEY` - NewsAPI key for fetching news
- `NEXT_PUBLIC_ALPHAVANTAGE_KEY` - Alpha Vantage API key
- `NEXT_PUBLIC_CRYPTOPANIC_KEY` - CryptoPanic API key
- `NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP` - Enable gas sponsorship (true/false)

### Trading Service (Optional)
- `AVANTIS_RPC_URL` - Base network RPC URL (default: https://mainnet.base.org)
- `PRIVY_APP_ID` - Privy App ID
- `PRIVY_APP_SECRET` - Privy App Secret

## Development

### Build for Production

**Client:**
```bash
cd client
npm run build
npm start
```

**Trading Service:**
```bash
cd server/trading-service
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Running Without Supabase

The application can run without Supabase using mock data. Simply omit the Supabase environment variables, and the app will use mock news and trade data.

## Features in Detail

### Swipe Gestures
- **Swipe Up** → Open LONG position
- **Swipe Down** → Open SHORT position  
- **Swipe Left/Right** → Dismiss news

### Market Detection
The app uses keyword matching to detect trading pairs from news headlines. Supports 80+ markets including:
- Crypto: BTC, ETH, SOL, DOGE, etc.
- Stocks: AAPL, NVDA, TSLA, etc.
- Forex: EUR/USD, USD/JPY, etc.
- Commodities: Gold, Oil, etc.

### Trading Parameters
- Collateral: $1, $2, $5, or $10
- Leverage: 75x
- Take Profit: +100%
- Stop Loss: None (by default)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Authentication**: Privy (Embedded Wallets)
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL, optional)
- **Blockchain**: Base Network (Ethereum L2)
- **DEX**: Avantis Protocol

## Troubleshooting

### "Privy App ID not set" Error
Make sure you've created a `.env.local` file in the `client` directory with your `NEXT_PUBLIC_PRIVY_APP_ID`.

### Trading Service Not Connecting
1. Ensure the trading service is running on port 8000
2. Check that `TRADING_SERVICE_URL` in your client `.env.local` matches the service URL
3. Verify CORS settings in `server/trading-service/main.py`

### Supabase Connection Issues
1. Verify your Supabase URL and key are correct
2. Ensure you've run all migrations in order
3. Note: Edge Functions are no longer required

## Deployment

### Deploying to Vercel

The client/UI can be deployed to Vercel for production. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

**Quick Start:**
1. **Option A - Local Trading Service** (Development):
   - Keep trading service running locally
   - Use ngrok/localtunnel to expose it
   - See [LOCAL_TRADING_SERVICE.md](./LOCAL_TRADING_SERVICE.md) for details

2. **Option B - Deploy Trading Service** (Production):
   - Deploy trading service separately (Railway, Render, or your own server)
   - Get your trading service URL

3. **Deploy Client to Vercel**:
   - Import your GitHub repo
   - Set root directory to `client`
   - Add environment variables:
     - `NEXT_PUBLIC_PRIVY_APP_ID` (required)
     - `TRADING_SERVICE_URL` (your tunnel URL or deployed service URL)
     - See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for full list
   - Deploy!

**Important**: 
- Make sure to set `TRADING_SERVICE_URL` environment variable in Vercel
- Configure CORS on your trading service to allow your Vercel domain
- For production, deploy the trading service rather than using a tunnel

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

