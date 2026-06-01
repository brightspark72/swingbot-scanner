export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    const raw = await response.json();
    // Enrich each token with pair data to get volume/liquidity
    const tokens = Array.isArray(raw) ? raw.slice(0, 20) : [];
    const enriched = await Promise.all(tokens.map(async (t) => {
      try {
        const pairRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`);
        const pairData = await pairRes.json();
        const topPair = pairData?.pairs?.[0];
        return {
          ...t,
          volume24h: topPair?.volume?.h24 || 0,
          liquidity: topPair?.liquidity?.usd || 0,
          priceUsd: topPair?.priceUsd || null,
          priceChange24h: topPair?.priceChange?.h24 || null,
          pairUrl: topPair?.url || null,
        };
      } catch {
        return t;
      }
    }));
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
