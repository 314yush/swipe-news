/**
 * Market Hours Checker
 * Validates if markets are open for trading
 */

import { getMarketCategory } from '../config/avantisMarkets';

/**
 * Get current time in a specific timezone
 * @param {string} timezone - IANA timezone string
 * @returns {Date} Date object in the specified timezone
 */
function getTimeInTimezone(timezone) {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Check if current day is a weekday (Mon-Fri)
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Check if current time is within US stock market hours
 * NYSE/NASDAQ: 9:30 AM - 4:00 PM ET, Monday-Friday
 * @returns {Object} { isOpen, message }
 */
function checkUSStockHours() {
  const etTime = getTimeInTimezone('America/New_York');
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min)
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  if (!isWeekday(etTime)) {
    return {
      isOpen: false,
      message: 'US stock markets are closed on weekends. Open Mon-Fri 9:30 AM - 4:00 PM ET.',
    };
  }

  if (currentMinutes < marketOpen) {
    const hoursUntil = Math.floor((marketOpen - currentMinutes) / 60);
    const minsUntil = (marketOpen - currentMinutes) % 60;
    return {
      isOpen: false,
      message: `US stock markets open in ${hoursUntil}h ${minsUntil}m (9:30 AM ET).`,
    };
  }

  if (currentMinutes >= marketClose) {
    return {
      isOpen: false,
      message: 'US stock markets are closed. Open Mon-Fri 9:30 AM - 4:00 PM ET.',
    };
  }

  const minsUntilClose = marketClose - currentMinutes;
  const hoursLeft = Math.floor(minsUntilClose / 60);
  const minsLeft = minsUntilClose % 60;

  return {
    isOpen: true,
    message: `US stock markets open. Closes in ${hoursLeft}h ${minsLeft}m.`,
  };
}

/**
 * Check if current time is within Forex market hours
 * Forex: 24/5 (Sunday 5 PM ET to Friday 5 PM ET)
 * @returns {Object} { isOpen, message }
 */
function checkForexHours() {
  const etTime = getTimeInTimezone('America/New_York');
  const day = etTime.getDay();
  const hours = etTime.getHours();

  // Forex is closed from Friday 5 PM to Sunday 5 PM ET
  // Day 0 = Sunday, Day 5 = Friday, Day 6 = Saturday

  // Saturday - closed
  if (day === 6) {
    return {
      isOpen: false,
      message: 'Forex markets are closed on weekends. Opens Sunday 5:00 PM ET.',
    };
  }

  // Sunday before 5 PM - closed
  if (day === 0 && hours < 17) {
    const hoursUntil = 17 - hours;
    return {
      isOpen: false,
      message: `Forex markets open in ${hoursUntil}h (5:00 PM ET).`,
    };
  }

  // Friday after 5 PM - closed
  if (day === 5 && hours >= 17) {
    return {
      isOpen: false,
      message: 'Forex markets are closed for the weekend. Opens Sunday 5:00 PM ET.',
    };
  }

  return {
    isOpen: true,
    message: 'Forex markets are open 24/5.',
  };
}

/**
 * Crypto markets are always open (24/7)
 * @returns {Object} { isOpen, message }
 */
function checkCryptoHours() {
  return {
    isOpen: true,
    message: 'Crypto markets are open 24/7.',
  };
}

/**
 * Commodity markets follow mixed schedules
 * Simplified: Treating as forex-like hours
 * @returns {Object} { isOpen, message }
 */
function checkCommodityHours() {
  // Gold, Silver, Oil trade nearly 24/5 like forex
  return checkForexHours();
}

/**
 * Check if index markets are open
 * US indices follow US stock market hours with extended futures
 * Simplified: Using stock market hours
 * @returns {Object} { isOpen, message }
 */
function checkIndexHours() {
  return checkUSStockHours();
}

/**
 * Check if a specific market is open for trading
 * @param {string} market - Market pair (e.g., 'BTC/USD')
 * @returns {Object} { isOpen, message, category }
 */
export function isMarketOpen(market) {
  const category = getMarketCategory(market);

  let result;

  switch (category) {
    case 'CRYPTO':
      result = checkCryptoHours();
      break;
    case 'FOREX':
      result = checkForexHours();
      break;
    case 'STOCKS':
      result = checkUSStockHours();
      break;
    case 'COMMODITIES':
      result = checkCommodityHours();
      break;
    case 'INDICES':
      result = checkIndexHours();
      break;
    default:
      // Unknown category - assume open (crypto-like)
      result = checkCryptoHours();
  }

  return {
    ...result,
    category,
  };
}

/**
 * Get market hours info for display
 * @param {string} market - Market pair
 * @returns {Object} Market hours information
 */
export function getMarketHoursInfo(market) {
  const category = getMarketCategory(market);

  const hoursInfo = {
    CRYPTO: {
      schedule: '24/7',
      description: 'Always open',
      timezone: 'N/A',
    },
    FOREX: {
      schedule: '24/5',
      description: 'Sunday 5 PM - Friday 5 PM ET',
      timezone: 'America/New_York',
    },
    STOCKS: {
      schedule: 'Mon-Fri 9:30 AM - 4:00 PM',
      description: 'US Market Hours',
      timezone: 'America/New_York',
    },
    COMMODITIES: {
      schedule: 'Nearly 24/5',
      description: 'Similar to Forex hours',
      timezone: 'America/New_York',
    },
    INDICES: {
      schedule: 'Mon-Fri 9:30 AM - 4:00 PM',
      description: 'US Market Hours',
      timezone: 'America/New_York',
    },
  };

  return hoursInfo[category] || hoursInfo.CRYPTO;
}

/**
 * Format next market open time
 * @param {string} market - Market pair
 * @returns {string} Formatted time string
 */
export function getNextOpenTime(market) {
  const { isOpen, message } = isMarketOpen(market);
  
  if (isOpen) {
    return 'Now';
  }
  
  // Extract time from message if possible
  return message;
}

export default isMarketOpen;







