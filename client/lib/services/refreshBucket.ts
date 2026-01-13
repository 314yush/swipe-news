/**
 * Time-Bucket Refresh Logic
 * Determines refresh buckets based on market hours
 * - Market hours: 3-minute buckets
 * - Off-hours: 15-minute buckets
 */

/**
 * Check if US stock markets are open
 */
function isMarketOpen(): boolean {
  const etTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const day = etTime.getDay();

  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const isWeekday = day >= 1 && day <= 5;

  return isWeekday && currentMinutes >= marketOpen && currentMinutes < marketClose;
}

/**
 * Calculate current refresh bucket
 * Returns a string identifier that changes when refresh is needed
 */
export function getCurrentRefreshBucket(): string {
  const now = new Date();
  const isOpen = isMarketOpen();
  
  if (isOpen) {
    const bucketMinutes = 3;
    const bucketMs = bucketMinutes * 60 * 1000;
    const bucketNumber = Math.floor(now.getTime() / bucketMs);
    return `market-${bucketNumber}`;
  } else {
    const bucketMinutes = 15;
    const bucketMs = bucketMinutes * 60 * 1000;
    const bucketNumber = Math.floor(now.getTime() / bucketMs);
    return `off-${bucketNumber}`;
  }
}

/**
 * Get refresh interval in minutes for current time
 */
export function getRefreshIntervalMinutes(): number {
  return isMarketOpen() ? 3 : 15;
}

/**
 * Check if bucket has changed
 */
export function hasBucketChanged(currentBucket: string | null): boolean {
  const newBucket = getCurrentRefreshBucket();
  return currentBucket !== newBucket;
}


