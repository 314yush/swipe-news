/**
 * News categories with emoji hints that connect to markets
 * "News First, Trading Hidden in Plain Sight"
 */

/**
 * Category configuration with emojis
 * Small emojis subconsciously connect to trading without being explicit
 */
export const CATEGORY_CONFIG = [
  { name: 'Trending', emoji: '🔥' },
  { name: 'Crypto', emoji: '₿' },
  { name: 'Tech', emoji: '📈' },
  { name: 'Finance', emoji: '💰' },
  { name: 'Energy', emoji: '⚡' },
  { name: 'Metals', emoji: '🥇' },
  { name: 'Politics', emoji: '🏛' },
  { name: 'Business', emoji: '💼' },
];

/**
 * Simple category list (for backwards compatibility)
 */
export const CATEGORIES = CATEGORY_CONFIG.map(c => c.name);

/**
 * Category emoji mapping
 */
export const CATEGORY_EMOJIS = CATEGORY_CONFIG.reduce((acc, c) => {
  acc[c.name] = c.emoji;
  return acc;
}, {});

/**
 * Category icons mapping (using Lucide icon names)
 */
export const CATEGORY_ICONS = {
  Trending: 'TrendingUp',
  Crypto: 'Bitcoin',
  Tech: 'Cpu',
  Finance: 'DollarSign',
  Energy: 'Zap',
  Metals: 'Coins',
  Politics: 'Landmark',
  Business: 'Briefcase',
};

/**
 * Category colors for badges
 */
export const CATEGORY_COLORS = {
  Trending: '#FFB300',
  Crypto: '#F7931A',
  Tech: '#00BCD4',
  Finance: '#4CAF50',
  Energy: '#FF5722',
  Metals: '#FFD700',
  Politics: '#9C27B0',
  Business: '#607D8B',
};

export default CATEGORIES;
