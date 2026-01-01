import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User store for authentication and settings
 * Persists settings to localStorage
 */
const useUserStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      walletAddress: null,
      balance: 0,
      isAuthenticated: false,
      isLoading: false,

      // Settings (persisted)
      collateralSetting: 1, // $1, $2, $5, $10
      showConfirmations: true,
      hasCompletedOnboarding: false,

      // Actions
      setUser: async (user) => {
        set({
          user,
          isAuthenticated: !!user,
          walletAddress: user?.wallet?.address || null,
        });
        
        // Save user to Supabase when user is set
        if (user) {
          try {
            const { saveUser } = await import('../services/supabase');
            await saveUser(user);
          } catch (error) {
            console.error('Failed to save user to Supabase:', error);
            // Don't throw - user can still use the app
          }
        }
      },

      setWalletAddress: (address) => {
        set({ walletAddress: address });
      },

      setBalance: (balance) => {
        set({ balance });
      },

      setCollateral: (amount) => {
        // Validate collateral amount
        const validAmounts = [1, 2, 5, 10];
        if (validAmounts.includes(amount)) {
          set({ collateralSetting: amount });
        }
      },

      toggleConfirmations: () => {
        set((state) => ({
          showConfirmations: !state.showConfirmations,
        }));
      },

      setShowConfirmations: (show) => {
        set({ showConfirmations: show });
      },

      markOnboardingComplete: () => {
        set({ hasCompletedOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      logout: () => {
        set({
          user: null,
          walletAddress: null,
          balance: 0,
          isAuthenticated: false,
        });
      },

      // Reset all settings to defaults
      resetSettings: () => {
        set({
          collateralSetting: 1,
          showConfirmations: true,
        });
      },
    }),
    {
      name: 'swipetrader-user-storage',
      // Only persist these fields
      partialize: (state) => ({
        collateralSetting: state.collateralSetting,
        showConfirmations: state.showConfirmations,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

export default useUserStore;


