"use client";

import { Roboto } from "next/font/google";
import { useEffect } from "react";
import "./globals.css";
import { PrivyProvider } from "@privy-io/react-auth";
import ThemeProvider from "@/lib/theme/ThemeProvider";
import { prewarmCache } from "@/lib/services/avantisPairs";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// Component to pre-warm cache on app load
function CachePreloader() {
  useEffect(() => {
    // Pre-warm cache as soon as app loads
    prewarmCache().catch((error) => {
      console.warn('Failed to pre-warm Avantis pairs cache:', error);
    });
  }, []);
  
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Show error if Privy is not configured
  if (!privyAppId) {
    return (
      <html lang="en">
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
          <meta name="theme-color" content="#121212" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <title>SwipeTrader - Configuration Error</title>
        </head>
        <body className={`${roboto.variable} font-sans`}>
          <ThemeProvider>
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
              <div className="p-8 max-w-md text-center rounded-2xl bg-[#2B2930] border border-[#49454F]">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-medium text-[#E6E1E5] mb-2">
                  Configuration Required
                </h1>
                <p className="text-[#CAC4D0] mb-4">
                  The app is missing required environment variables.
                </p>
                <code className="block bg-[#211F26] p-3 rounded-lg text-sm text-red-400 mb-4">
                  NEXT_PUBLIC_PRIVY_APP_ID is not set
                </code>
                <p className="text-[#CAC4D0] text-sm">
                  Please add your Privy App ID to the <code>.env</code> file and
                  restart the development server.
                </p>
              </div>
            </div>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <title>SwipeTrader - News Trading</title>
        <meta
          name="description"
          content="Swipe through news and trade instantly on Avantis DEX"
        />
      </head>
      <body className={`${roboto.variable} font-sans`}>
        <ThemeProvider>
          <PrivyProvider
            appId={privyAppId}
            config={{
              // Allow users to connect existing wallets (MetaMask, WalletConnect, etc.)
              loginMethods: ["wallet", "email"],
              // Enable external wallet connections
              externalWallets: {
                // MetaMask, WalletConnect, Coinbase Wallet, etc.
                coinbaseWallet: {
                  // Coinbase Wallet configuration
                },
              },
              appearance: {
                theme: "dark",
                accentColor: "#D0BCFF", // M3 primary color
                logo: undefined,
              },
              embeddedWallets: {
                ethereum: {
                  // Create embedded wallet ONLY if user doesn't connect an existing wallet
                  // This allows both: existing wallets AND embedded wallets for new users
                  createOnLogin: "users-without-wallets",
                  // Enable gas sponsorship for embedded wallets
                  // This allows the app to pay for gas on behalf of users
                  // Note: Requires Privy gas sponsorship to be enabled in Privy dashboard
                },
              },
              // Enable gas sponsorship if configured
              // To enable: Set up gas sponsorship in Privy dashboard and add NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP=true
              ...(process.env.NEXT_PUBLIC_PRIVY_GAS_SPONSORSHIP === 'true' && {
                gasSponsorship: {
                  enabled: true,
                },
              }),
              defaultChain: {
                id: 8453, // Base
                name: "Base",
                network: "base",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: {
                  default: {
                    http: ["https://mainnet.base.org"],
                  },
                },
              },
            }}
          >
            <CachePreloader />
            <main key="main-content" className="h-full overflow-auto">{children}</main>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
