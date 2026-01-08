# How Asset Matching Works

## Overview

The system determines if a news article is about a specific asset using **keyword matching with confidence scoring**. Here's how it works:

## The Matching Process

### 1. **Keyword Database**
Each trading pair has a list of keywords that identify it. For example:
- `BTC/USD` has keywords: `['bitcoin', 'btc', 'crypto market', 'cryptocurrency market', ...]`
- `ETH/USD` has keywords: `['ethereum', 'eth', 'ether', 'vitalik']`
- `TSLA/USD` has keywords: `['tesla', 'tsla', 'elon musk']`

### 2. **Text Analysis**
When an article comes in, the system:
1. Extracts the **headline** and **description**
2. Converts everything to lowercase for matching
3. Searches for keywords in both headline and description

### 3. **Confidence Scoring**

The system scores each potential match:

- **Headline match**: +40 points (high confidence - article is directly about this)
- **Description match**: +20 points (medium confidence - mentioned in details)
- **Multiple keywords**: Points accumulate (more mentions = higher confidence)
- **Proxy assets**: -15% penalty (proxy assets like BTC for general crypto news get slightly lower priority)

**Example:**
```
Headline: "Bitcoin Surges to New All-Time High"
Description: "BTC price breaks $100k as crypto market rallies"

Matching:
- "bitcoin" in headline → +40 points
- "btc" in description → +20 points
- "crypto market" in description → +20 points
Total: 80 points → Confidence: 80%
```

### 4. **Confidence Threshold**

Only matches with **≥70% confidence** are accepted. This ensures:
- Articles are actually about the asset (not just mentioning it in passing)
- Reduces false positives
- Prioritizes relevant news

### 5. **Best Match Selection**

If multiple assets match:
- Returns the **highest confidence** match
- If tied, prefers **non-proxy assets** (specific assets over general market proxies)
- Only **one primary asset** per article (the most relevant)

## Example Matches

### ✅ Strong Match (Confidence ≥70)
```
Headline: "Ethereum Foundation Announces Major Upgrade"
Keywords matched: "ethereum" (headline) + "eth" (description)
Score: 40 + 20 = 60 → 60% (below threshold, but if "ethereum" appears twice: 40+40=80 ✅)
```

### ✅ Multiple Keywords
```
Headline: "Tesla Stock Soars After Elon Musk Announces New Model"
Keywords matched: "tesla" (headline) + "tsla" (description) + "elon musk" (description)
Score: 40 + 20 + 20 = 80 → 80% confidence ✅
```

### ❌ Weak Match (Confidence <70)
```
Headline: "Tech Stocks Rally Across the Board"
Keywords matched: "stock" (generic, not specific)
Score: 20 → 20% confidence ❌ (too low)
```

## Special Cases

### Proxy Assets
Some pairs act as "proxies" for general market news:
- **BTC/USD**: General crypto market news (even if not specifically about Bitcoin)
- **SPY/USD**: General stock market news
- **XAU/USD**: Safe-haven/macro economic news
- **USOILSPOT/USD**: Energy sector news

These get a 15% penalty to prioritize specific assets when both match.

### Word Boundary Matching
Short keywords (2-3 characters) use word boundaries to avoid false positives:
- "ETH" matches "ethereum" but not "method"
- "BTC" matches "bitcoin" but not "abstract"

## Current Configuration

The system uses **static CSV data** (`Avantis_Trading_Pairs.csv`) to determine which pairs are available. This:
- ✅ Faster (no API calls)
- ✅ More reliable (no network failures)
- ✅ Always up-to-date with your CSV file

## Filtering Flow

1. **Fetch articles** from APITube
2. **Load available pairs** from CSV
3. **For each article**:
   - Extract headline + description
   - Match against keywords (only for available pairs)
   - Calculate confidence score
   - If ≥70%: Accept article
   - If <70%: Reject article
4. **Return only articles** that match available Avantis pairs

## Why 70% Threshold?

- **Too low (50%)**: Too many false positives, articles barely related
- **Too high (90%)**: Too strict, misses relevant news
- **70%**: Sweet spot - ensures relevance while capturing most important news

This means an article needs:
- At least 2 headline keywords, OR
- 1 headline + 2 description keywords, OR
- 4+ description keywords

