import { create } from 'zustand';

/**
 * News store for managing news articles and interactions
 */
const useNewsStore = create((set, get) => ({
  // News state
  news: [], // 15-minute news for swipe feed
  feedNews: [], // 24-hour news for feed page
  currentCategory: 'Trending',
  interactedNews: {}, // { newsId: 'dismissed' | 'longed' | 'shorted' }
  currentIndex: 0,
  loading: false,
  error: null,
  refreshing: false,

  // Actions
  setNews: (news) => {
    set({ news, currentIndex: 0 });
  },

  addNews: (newNews) => {
    set((state) => ({
      news: [...state.news, ...newNews],
    }));
  },

  setFeedNews: (feedNews) => {
    set({ feedNews });
  },

  addFeedNews: (newFeedNews) => {
    set((state) => ({
      feedNews: [...state.feedNews, ...newFeedNews],
    }));
  },

  setCategory: (category) => {
    set({ currentCategory: category, currentIndex: 0 });
  },

  /**
   * Mark a news article as interacted
   * @param {string} newsId - The ID of the news article
   * @param {'dismissed' | 'longed' | 'shorted'} interaction - The type of interaction
   */
  markAsInteracted: (newsId, interaction) => {
    set((state) => ({
      interactedNews: {
        ...state.interactedNews,
        [newsId]: interaction,
      },
    }));
  },

  /**
   * Get interaction for a news article
   * @param {string} newsId - The ID of the news article
   * @returns {'dismissed' | 'longed' | 'shorted' | null}
   */
  getInteraction: (newsId) => {
    return get().interactedNews[newsId] || null;
  },

  /**
   * Get fresh (non-interacted) news for the current category
   */
  getFreshNews: () => {
    const { news, currentCategory, interactedNews } = get();
    
    // Filter by category if not 'Trending'
    let filtered = currentCategory === 'Trending' 
      ? news 
      : news.filter((item) => item.category === currentCategory);
    
    // Filter out interacted news
    return filtered.filter((item) => !interactedNews[item.id]);
  },

  /**
   * Get all news for the current category (including interacted)
   */
  getCategoryNews: () => {
    const { news, currentCategory } = get();
    
    if (currentCategory === 'Trending') {
      return news;
    }
    
    return news.filter((item) => item.category === currentCategory);
  },

  /**
   * Move to next news item
   */
  nextNews: () => {
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.news.length - 1),
    }));
  },

  /**
   * Move to previous news item
   */
  previousNews: () => {
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    }));
  },

  setCurrentIndex: (index) => {
    set({ currentIndex: index });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error, loading: false });
  },

  setRefreshing: (refreshing) => {
    set({ refreshing });
  },

  clearError: () => {
    set({ error: null });
  },

  // Clear all interactions (for testing/reset)
  clearInteractions: () => {
    set({ interactedNews: {} });
  },

  // Reset store to initial state
  reset: () => {
    set({
      news: [],
      feedNews: [],
      currentCategory: 'Trending',
      interactedNews: {},
      currentIndex: 0,
      loading: false,
      error: null,
      refreshing: false,
    });
  },
}));

export default useNewsStore;


