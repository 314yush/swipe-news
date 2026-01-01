/**
 * Formatting utilities for the application
 */

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: USD)
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'USD', options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  const defaultOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  // For very small values, show more decimals
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
    defaultOptions.minimumFractionDigits = 4;
    defaultOptions.maximumFractionDigits = 4;
  }

  return new Intl.NumberFormat('en-US', defaultOptions).format(value);
}

/**
 * Format P&L with color indicator
 * @param {number} value - P&L value
 * @returns {Object} { text, isPositive, isNegative }
 */
export function formatPnL(value) {
  const formatted = formatCurrency(value);
  const sign = value > 0 ? '+' : '';
  
  return {
    text: `${sign}${formatted}`,
    isPositive: value > 0,
    isNegative: value < 0,
    isNeutral: value === 0,
  };
}

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param {number} value - Numeric value
 * @returns {string} Abbreviated number string
 */
export function formatCompactNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }

  return value.toFixed(2);
}

/**
 * Format price based on value magnitude
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (price === null || price === undefined || isNaN(price)) {
    return '$0.00';
  }

  // For prices under $1, show more decimals
  if (price < 1) {
    return `$${price.toFixed(6)}`;
  }
  // For prices under $100, show 2 decimals
  if (price < 100) {
    return `$${price.toFixed(2)}`;
  }
  // For larger prices, show 2 decimals with commas
  return formatCurrency(price);
}

/**
 * Format date relative to now
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // For older dates, show the date
  return formatDate(date);
}

/**
 * Format date in short format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time only
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Try to break at a word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Format wallet address (truncate middle)
 * @param {string} address - Wallet address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Truncated address
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Format leverage
 * @param {number} leverage - Leverage value
 * @returns {string} Formatted leverage string
 */
export function formatLeverage(leverage) {
  return `${leverage}x`;
}

/**
 * Format market pair for display
 * @param {string} market - Market pair (e.g., 'BTC/USD')
 * @returns {string} Formatted market string
 */
export function formatMarket(market) {
  if (!market) return '';
  return market.toUpperCase();
}

/**
 * Check if a news article is fresh (less than 1 hour old)
 * @param {string|Date} publishedAt - Publication date
 * @returns {boolean}
 */
export function isNewsFresh(publishedAt) {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now - published;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours < 1;
}

/**
 * Check if a news article is very fresh (less than 15 minutes old)
 * Used for "hot" news badge with pulse animation
 * @param {string|Date} publishedAt - Publication date
 * @returns {boolean}
 */
export function isNewsVeryFresh(publishedAt) {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now - published;
  const diffMins = diffMs / (1000 * 60);
  
  return diffMins < 15;
}

/**
 * Get color class for P&L
 * @param {number} value - P&L value
 * @returns {string} Tailwind color class
 */
export function getPnLColorClass(value) {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';
  return 'text-on-surface-dark';
}

export default {
  formatCurrency,
  formatPnL,
  formatPercent,
  formatCompactNumber,
  formatPrice,
  formatRelativeTime,
  formatDate,
  formatDateTime,
  formatTime,
  truncateText,
  formatAddress,
  formatLeverage,
  formatMarket,
  isNewsFresh,
  isNewsVeryFresh,
  getPnLColorClass,
};

