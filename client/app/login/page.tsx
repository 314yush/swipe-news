"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Mail, User, ArrowRight } from "lucide-react";
import { LoadingPage } from "@/components/LoadingSpinner";
import { prewarmCache } from "@/lib/services/avantisPairs";

export default function LoginPage() {
  const { ready, authenticated, login, connectWallet } = usePrivy();
  const router = useRouter();

  // Pre-warm Avantis pairs cache when ready (even before authentication)
  useEffect(() => {
    if (ready) {
      prewarmCache().catch((error) => {
        console.warn('Failed to pre-warm Avantis pairs cache on login page:', error);
      });
    }
  }, [ready]);

  // Redirect if already authenticated
  useEffect(() => {
    if (ready && authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Loading state
  if (!ready) {
    return <LoadingPage />;
  }

  // Already authenticated, redirecting
  if (authenticated) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo and title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Logo */}
          <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
            <TrendingUp size={48} className="text-primary" />
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-on-surface mb-3">
            SwipeTrader
          </h1>
          <p className="text-on-surface-dark text-lg max-w-sm">
            Swipe through news. Trade instantly. Profit on your insights.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-12 w-full max-w-sm"
        >
          <FeatureCard icon="📰" title="News" description="Real-time" />
          <FeatureCard icon="⚡" title="Swipe" description="Instant" />
          <FeatureCard icon="📈" title="Trade" description="75x Leverage" />
        </motion.div>

        {/* Auth buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm space-y-3"
        >
          {/* Connect wallet button */}
          <button
            onClick={() => login()}
            className="w-full btn btn-primary py-4 text-lg gap-3"
          >
            <Wallet size={24} />
            Connect Wallet
            <ArrowRight size={20} className="ml-auto" />
          </button>

          {/* Email login button */}
          <button
            onClick={() => login()}
            className="w-full btn btn-secondary py-4 text-lg gap-3"
          >
            <Mail size={24} />
            Continue with Email
          </button>

          {/* Guest mode button */}
          <button
            onClick={async () => {
              // Create guest user - Privy will create an embedded wallet automatically
              // This allows testing without full authentication
              try {
                await login();
                // Navigation will happen automatically via useEffect
              } catch (error) {
                console.error("Failed to create guest session:", error);
              }
            }}
            className="w-full btn btn-ghost py-4 text-lg gap-3 border border-border"
          >
            <User size={24} />
            Continue as Guest
            <span className="ml-auto text-xs text-on-surface-dark">(Testing)</span>
          </button>
        </motion.div>

        {/* Powered by */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-on-surface-dark mb-2">
            Secured by
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-on-surface-dark">Privy</span>
            <span className="text-on-surface-dark">•</span>
            <span className="text-sm text-on-surface-dark">Avantis DEX</span>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-on-surface-dark">
          By connecting, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface-light rounded-xl p-3 text-center">
      <span className="text-2xl mb-1 block">{icon}</span>
      <p className="text-sm font-medium text-on-surface">{title}</p>
      <p className="text-xs text-on-surface-dark">{description}</p>
    </div>
  );
}

