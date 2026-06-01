
import { useState, useEffect, useCallback } from "react";

const ROUND_FILTERS = {
  "all": { label: "All Rounds", mcapMax: Infinity },
  "micro": { label: "Round 1-2 · Micro/DEX", mcapMax: 50_000_000 },
  "mid": { label: "Round 3-4 · Mid/CEX", mcapMax: Infinity, mcapMin: 50_000_000 },
};

const MODULE_TABS = [
  { id: "catalyst", label: "Catalyst Radar", icon: "⚡" },
  { id: "volume", label: "Volume Spikes", icon: "📊" },
  { id: "social", label: "Social Momentum", icon: "🔥" },
  { id: "price", label: "Price Position", icon: "📉" },
  { id: "fundamentals", label: "Fundamentals", icon: "🔬" },
];

function OpportunityBadge({ score }) {
  const color = score >= 71 ? "#00ff88" : score >= 41 ? "#ffaa00" : "#ff4455";
  const bg = score >= 71 ? "#00ff8820" : score >= 41 ? "#ffaa0020" : "#ff445520";
  return (
    <span style={{
      background: bg, color, border: `1px solid ${color}`,
      borderRadius: 6, padding: "2px 10px", fontWeight: 700,
      fontSize: 13, letterSpacing: 1, fontFamily: "monospace"
    }}>{score}</span>
  );
}

function ChainBadge({ chain }) {
  const colors = { ethereum: "#627eea", bsc: "#f0b90b", solana: "#9945ff", polygon: "#8247e5", arbitrum: "#28a0f0" };
  const c = colors[chain?.toLowerCase()] || "#888";
  return (
    <span style={{ background: c + "22", color: c, border: `1px solid ${c}40`, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>
      {chain?.toUpperCase() || "?"}
    </span>
  );
}

function ATHBar({ pct }) {
  const discount = Math.min(100, Math.max(0, pct));
  const color = discount > 80 ? "#00ff88" : discount > 50 ? "#ffaa00" : "#ff4455";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: "#ffffff10", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${100 - discount}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.6s" }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 700, minWidth: 45, fontFamily: "monospace" }}>-{discount.toFixed(0)}%</span>
    </div>
  );
}

function calcOpportunityScore({ athDiscount, volumeMcapRatio, isTrending, devCommits, circulatingPct, mcap, round }) {
  let score = 0;
  // Price position (30pts)
  if (athDiscount >= 80 && athDiscount <= 95) score += 30;
  else if (athDiscount >= 60) score += 18;
  else if (athDiscount >= 40) score += 10;
  // Volume spike (20pts)
  if (volumeMcapRatio > 0.5) score += 20;
  else if (volumeMcapRatio > 0.2) score += 12;
  else if (volumeMcapRatio > 0.05) score += 6;
  // Fundamentals (25pts)
  if (devCommits > 10) score += 15;
  else if (devCommits > 0) score += 7;
  if (circulatingPct > 70) score += 10;
  else if (circulatingPct > 40) score += 5;
  // Social (15pts)
  if (isTrending) score += 15;
  // Round match (10pts)
  if (round === "all") score += 5;
  else if (round === "micro" && mcap < 50_000_000) score += 10;
  else if (round === "mid" && mcap >= 50_000_000) score += 10;
  return Math.min(100, score);
}

function ResearchPanel({ coin, onClose }) {
  const athDiscount = coin.ath && coin.current_price ? ((coin.ath - coin.current_price) / coin.ath * 100) : null;
  const circulatingPct = coin.total_supply ? (coin.circulating_supply / coin.total_supply * 100) : null;
  const commits = coin.developer_data?.commit_activity_4_weeks || 0;

  const summary = (() => {
    const parts = [];
    if (athDiscount) parts.push(`${coin.name} is ${athDiscount.toFixed(0)}% below its all-time high`);
    if (commits > 10) parts.push(`active development with ${commits} commits in the last 4 weeks`);
    else if (commits > 0) parts.push(`some development activity (${commits} commits recently)`);
    else parts.push(`low recent development activity — proceed with caution`);
    if (circulatingPct > 70) parts.push(`a high circulating supply (${circulatingPct.toFixed(0)}%) suggesting lower dump risk`);
    else if (circulatingPct) parts.push(`only ${circulatingPct.toFixed(0)}% of supply circulating — watch for unlocks`);
    return parts.join(", ") + ".";
  })();

  return (
    <div style={{
      background: "#0a1628", border: "1px solid #00ff8840", borderRadius: 12,
      padding: 24, marginTop: 8, position: "relative"
    }}>
      <button onClick={onClose} style={{
        position: "absolute", top: 12, right: 12, background: "none",
        border: "1px solid #ffffff20", color: "#888", borderRadius: 6,
        padding: "2px 10px", cursor: "pointer", fontSize: 12
      }}>✕ Close</button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#ffffff08", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Tokenomics</div>
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.8 }}>
            <div>Circulating: <span style={{ color: "#fff" }}>{coin.circulating_supply?.toLocaleString() || "N/A"}</span></div>
            <div>Total Supply: <span style={{ color: "#fff" }}>{coin.total_supply?.toLocaleString() || "N/A"}</span></div>
            <div>% Circulating: <span style={{ color: circulatingPct > 70 ? "#00ff88" : "#ffaa00" }}>{circulatingPct ? circulatingPct.toFixed(1) + "%" : "N/A"}</span></div>
            <div>Genesis: <span style={{ color: "#fff" }}>{coin.genesis_date || "Unknown"}</span></div>
          </div>
        </div>
        <div style={{ background: "#ffffff08", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Dev Activity</div>
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.8 }}>
            <div>4-week commits: <span style={{ color: commits > 10 ? "#00ff88" : commits > 0 ? "#ffaa00" : "#ff4455" }}>{commits}</span></div>
            <div>GitHub Stars: <span style={{ color: "#fff" }}>{coin.developer_data?.stars?.toLocaleString() || "N/A"}</span></div>
            <div>Status: <span style={{ color: commits > 10 ? "#00ff88" : "#ffaa00" }}>{commits > 10 ? "Active" : commits > 0 ? "Low" : "Inactive"}</span></div>
          </div>
        </div>
        <div style={{ background: "#ffffff08", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Community</div>
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.8 }}>
            <div>Twitter: <span style={{ color: "#fff" }}>{coin.community_data?.twitter_followers?.toLocaleString() || "N/A"}</span></div>
            <div>Reddit: <span style={{ color: "#fff" }}>{coin.community_data?.reddit_subscribers?.toLocaleString() || "N/A"}</span></div>
            <div>ATH Price: <span style={{ color: "#fff" }}>${coin.ath?.toLocaleString() || "N/A"}</span></div>
            <div>Discount: <span style={{ color: "#00ff88" }}>{athDiscount ? athDiscount.toFixed(1) + "%" : "N/A"}</span></div>
          </div>
        </div>
      </div>

      <div style={{ background: "#00ff8810", border: "1px solid #00ff8830", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ color: "#00ff88", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>⚡ AI Summary</div>
        <div style={{ color: "#ccd", fontSize: 13, lineHeight: 1.7 }}>{summary}</div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "CoinGecko", url: `https://www.coingecko.com/en/coins/${coin.id}` },
          { label: "DexScreener", url: `https://dexscreener.com/search?q=${coin.symbol}` },
          { label: "Chart", url: `https://www.tradingview.com/chart/?symbol=${coin.symbol?.toUpperCase()}USDT` },
        ].map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
            background: "#ffffff10", border: "1px solid #ffffff20", color: "#aaa",
            borderRadius: 6, padding: "6px 14px", fontSize: 12, textDecoration: "none",
            transition: "all 0.2s"
          }}>{l.label} ↗</a>
        ))}
      </div>
    </div>
  );
}

export default function SwingBotScanner() {
  const [round, setRound] = useState("all");
  const [activeTab, setActiveTab] = useState("catalyst");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Data stores
  const [trendingCoins, setTrendingCoins] = useState([]);
  const [marketCoins, setMarketCoins] = useState([]);
  const [dexTokens, setDexTokens] = useState([]);
  const [fundamentalsMap, setFundamentalsMap] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendingRes, marketRes, dexRes] = await Promise.allSettled([
        fetch("https://api.coingecko.com/api/v3/search/trending"),
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d"),
        fetch("https://api.dexscreener.com/token-profiles/latest/v1"),
      ]);

      if (trendingRes.status === "fulfilled" && trendingRes.value.ok) {
        const d = await trendingRes.value.json();
        setTrendingCoins(d.coins || []);
      }
      if (marketRes.status === "fulfilled" && marketRes.value.ok) {
        const d = await marketRes.value.json();
        setMarketCoins(Array.isArray(d) ? d : []);
      }
      if (dexRes.status === "fulfilled" && dexRes.value.ok) {
        const d = await dexRes.value.json();
        setDexTokens(Array.isArray(d) ? d.slice(0, 30) : []);
      }

      setLastUpdated(new Date());
    } catch (e) {
      setError("Failed to fetch some data. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetail = useCallback(async (id) => {
    if (fundamentalsMap[id]) { setExpandedDetail(fundamentalsMap[id]); return; }
    setLoadingDetail(true);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true`);
      if (res.ok) {
        const d = await res.json();
        setFundamentalsMap(prev => ({ ...prev, [id]: d }));
        setExpandedDetail(d);
      }
    } catch (e) { } finally { setLoadingDetail(false); }
  }, [fundamentalsMap]);

  const handleResearch = (id) => {
    if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); return; }
    setExpandedId(id);
    setExpandedDetail(null);
    fetchDetail(id);
  };

  // Filter helpers
  const filterByRound = (mcap) => {
    if (round === "all") return true;
    if (round === "micro") return mcap < 50_000_000;
    if (round === "mid") return mcap >= 50_000_000;
    return true;
  };

  // Render module content
  const renderCatalyst = () => {
    if (!trendingCoins.length) return <EmptyState />;
    return trendingCoins.map(({ item }) => {
      const mcap = item.data?.market_cap_btc * 60000 || 0;
      if (!filterByRound(mcap)) return null;
      const score = calcOpportunityScore({ athDiscount: 70, volumeMcapRatio: 0.1, isTrending: true, devCommits: 5, circulatingPct: 60, mcap, round });
      return (
        <AssetRow
          key={item.id}
          id={item.id}
          name={item.name}
          symbol={item.symbol}
          price={item.data?.price || "N/A"}
          change24={item.data?.price_change_percentage_24h?.usd}
          mcap={mcap}
          athDiscount={null}
          score={score}
          badge={item.market_cap_rank < 200 ? { label: "High Potential", color: "#00ff88" } : { label: "Micro Cap", color: "#ffaa00" }}
          expanded={expandedId === item.id}
          expandedDetail={expandedDetail}
          loadingDetail={loadingDetail}
          onResearch={() => handleResearch(item.id)}
        />
      );
    });
  };

  const renderVolume = () => {
    if (!marketCoins.length) return <EmptyState />;
    return [...marketCoins]
      .map(c => ({ ...c, ratio: c.total_volume / (c.market_cap || 1) }))
      .sort((a, b) => b.ratio - a.ratio)
      .filter(c => filterByRound(c.market_cap))
      .slice(0, 20)
      .map(c => {
        const score = calcOpportunityScore({ athDiscount: c.ath ? ((c.ath - c.current_price) / c.ath * 100) : 50, volumeMcapRatio: c.ratio, isTrending: false, devCommits: 5, circulatingPct: 60, mcap: c.market_cap, round });
        return (
          <AssetRow key={c.id} id={c.id} name={c.name} symbol={c.symbol}
            price={`$${c.current_price?.toLocaleString()}`}
            change24={c.price_change_percentage_24h}
            mcap={c.market_cap}
            athDiscount={c.ath ? ((c.ath - c.current_price) / c.ath * 100) : null}
            score={score}
            badge={c.ratio > 0.5 ? { label: "Volume Spike", color: "#ff4488" } : { label: `Vol/MCap ${(c.ratio * 100).toFixed(0)}%`, color: "#888" }}
            expanded={expandedId === c.id} expandedDetail={expandedDetail} loadingDetail={loadingDetail}
            onResearch={() => handleResearch(c.id)}
          />
        );
      });
  };

  const renderSocial = () => {
    if (!dexTokens.length) return <EmptyState msg="DexScreener data unavailable — API may require CORS proxy in production" />;
    return dexTokens.slice(0, 20).map((t, i) => {
      const score = calcOpportunityScore({ athDiscount: 75, volumeMcapRatio: 0.3, isTrending: true, devCommits: 3, circulatingPct: 50, mcap: 1_000_000, round });
      return (
        <div key={i} style={rowStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 2 }}>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{t.tokenAddress?.slice(0, 8)}...</div>
              <div style={{ color: "#888", fontSize: 11 }}>{t.description?.slice(0, 40) || "Token"}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}><ChainBadge chain={t.chainId} /></div>
          <div style={{ flex: 1, color: "#888", fontSize: 12 }}>DEX Token</div>
          <div style={{ flex: 1 }}><span style={{ background: "#00ff8820", color: "#00ff88", border: "1px solid #00ff8840", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>Trending</span></div>
          <div style={{ flex: 1 }}><OpportunityBadge score={score} /></div>
          <div style={{ flex: 1 }}>
            {t.links?.length > 0 && <a href={t.links[0].url} target="_blank" rel="noopener noreferrer" style={{ color: "#00aaff", fontSize: 12 }}>View ↗</a>}
          </div>
        </div>
      );
    });
  };

  const renderPrice = () => {
    if (!marketCoins.length) return <EmptyState />;
    return [...marketCoins]
      .filter(c => c.ath && c.current_price)
      .map(c => ({ ...c, athDiscount: (c.ath - c.current_price) / c.ath * 100 }))
      .filter(c => c.athDiscount > 0 && (c.price_change_percentage_7d_in_currency > 0 || true))
      .filter(c => filterByRound(c.market_cap))
      .sort((a, b) => {
        const aSweet = a.athDiscount >= 80 && a.athDiscount <= 95;
        const bSweet = b.athDiscount >= 80 && b.athDiscount <= 95;
        if (aSweet && !bSweet) return -1;
        if (!aSweet && bSweet) return 1;
        return b.athDiscount - a.athDiscount;
      })
      .slice(0, 20)
      .map(c => {
        const score = calcOpportunityScore({ athDiscount: c.athDiscount, volumeMcapRatio: c.total_volume / (c.market_cap || 1), isTrending: false, devCommits: 5, circulatingPct: 60, mcap: c.market_cap, round });
        return (
          <AssetRow key={c.id} id={c.id} name={c.name} symbol={c.symbol}
            price={`$${c.current_price?.toLocaleString()}`}
            change24={c.price_change_percentage_24h}
            mcap={c.market_cap}
            athDiscount={c.athDiscount}
            score={score}
            badge={c.athDiscount >= 80 && c.athDiscount <= 95 ? { label: "Sweet Spot", color: "#00ff88" } : { label: "Discounted", color: "#ffaa00" }}
            expanded={expandedId === c.id} expandedDetail={expandedDetail} loadingDetail={loadingDetail}
            onResearch={() => handleResearch(c.id)}
          />
        );
      });
  };

  const renderFundamentals = () => {
    if (!marketCoins.length) return <EmptyState />;
    return marketCoins
      .filter(c => filterByRound(c.market_cap))
      .slice(0, 20)
      .map(c => {
        const detail = fundamentalsMap[c.id];
        const commits = detail?.developer_data?.commit_activity_4_weeks || 0;
        const circulatingPct = c.total_supply ? (c.circulating_supply / c.total_supply * 100) : 60;
        const score = calcOpportunityScore({ athDiscount: c.ath ? ((c.ath - c.current_price) / c.ath * 100) : 50, volumeMcapRatio: 0.1, isTrending: false, devCommits: commits, circulatingPct, mcap: c.market_cap, round });
        return (
          <AssetRow key={c.id} id={c.id} name={c.name} symbol={c.symbol}
            price={`$${c.current_price?.toLocaleString()}`}
            change24={c.price_change_percentage_24h}
            mcap={c.market_cap}
            athDiscount={c.ath ? ((c.ath - c.current_price) / c.ath * 100) : null}
            score={score}
            badge={commits > 10 ? { label: "Active Dev", color: "#00ff88" } : commits > 0 ? { label: "Low Dev", color: "#ffaa00" } : { label: "Click Research", color: "#666" }}
            expanded={expandedId === c.id} expandedDetail={expandedDetail} loadingDetail={loadingDetail}
            onResearch={() => handleResearch(c.id)}
          />
        );
      });
  };

  const renderModule = () => {
    switch (activeTab) {
      case "catalyst": return renderCatalyst();
      case "volume": return renderVolume();
      case "social": return renderSocial();
      case "price": return renderPrice();
      case "fundamentals": return renderFundamentals();
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#050d1a",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "#ccd6f6"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a1628; } ::-webkit-scrollbar-thumb { background: #00ff8840; border-radius: 3px; }
        .tab-btn:hover { background: #00ff8820 !important; color: #00ff88 !important; }
        .round-btn:hover { opacity: 0.85; }
        .research-btn:hover { background: #00ff8830 !important; color: #00ff88 !important; }
        .refresh-btn:hover { background: #00ff8820 !important; }
        .asset-row:hover { background: #0d1f3c !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #020a14 0%, #050d1a 100%)",
        borderBottom: "1px solid #00ff8830", padding: "24px 32px 20px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: "#00ff88", letterSpacing: 3, lineHeight: 1 }}>
              SWINGBOT <span style={{ color: "#fff" }}>SCANNER</span>
            </div>
            <div style={{ color: "#4a6fa5", fontSize: 12, letterSpacing: 2, marginTop: 4 }}>FIND THE NEXT 5X · CRYPTO OPPORTUNITY INTELLIGENCE</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastUpdated && <span style={{ color: "#4a6fa5", fontSize: 11 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button className="refresh-btn" onClick={fetchAll} disabled={loading} style={{
              background: "#0a1628", border: "1px solid #00ff8840", color: "#00ff88",
              borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 12,
              fontFamily: "inherit", letterSpacing: 1, transition: "all 0.2s"
            }}>
              {loading ? "⟳ Loading..." : "⟳ Refresh"}
            </button>
          </div>
        </div>

        {/* Round selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(ROUND_FILTERS).map(([key, val]) => (
            <button key={key} className="round-btn" onClick={() => setRound(key)} style={{
              background: round === key ? "#00ff88" : "#0a1628",
              color: round === key ? "#050d1a" : "#888",
              border: `1px solid ${round === key ? "#00ff88" : "#ffffff20"}`,
              borderRadius: 20, padding: "6px 18px", cursor: "pointer",
              fontSize: 12, fontFamily: "inherit", fontWeight: round === key ? 700 : 400,
              transition: "all 0.2s", letterSpacing: 0.5
            }}>{val.label}</button>
          ))}
        </div>
      </div>

      {/* Module tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #ffffff10", background: "#070f1f", padding: "0 32px" }}>
        {MODULE_TABS.map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => { setActiveTab(tab.id); setExpandedId(null); setExpandedDetail(null); }} style={{
            background: "none", border: "none", borderBottom: activeTab === tab.id ? "2px solid #00ff88" : "2px solid transparent",
            color: activeTab === tab.id ? "#00ff88" : "#666", padding: "14px 20px", cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", letterSpacing: 1, transition: "all 0.2s", whiteSpace: "nowrap"
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {error && (
          <div style={{ background: "#ff445520", border: "1px solid #ff445540", borderRadius: 8, padding: 12, marginBottom: 16, color: "#ff8899", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* Table header */}
        <div style={{ display: "flex", padding: "8px 16px", color: "#4a6fa5", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
          <div style={{ flex: 2 }}>Asset</div>
          <div style={{ flex: 1 }}>Price</div>
          <div style={{ flex: 1 }}>24h</div>
          <div style={{ flex: 1 }}>Market Cap</div>
          <div style={{ flex: 1.5 }}>ATH Discount</div>
          <div style={{ flex: 1 }}>Signal</div>
          <div style={{ flex: 1 }}>Score</div>
          <div style={{ flex: 1 }}>Action</div>
        </div>

        {loading && !marketCoins.length ? (
          <div style={{ textAlign: "center", padding: 60, color: "#4a6fa5" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
            <div style={{ fontSize: 13, letterSpacing: 2 }}>SCANNING MARKETS...</div>
          </div>
        ) : (
          <div>{renderModule()}</div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "20px 32px", borderTop: "1px solid #ffffff08", color: "#2a3f5f", fontSize: 11, letterSpacing: 1 }}>
        SWINGBOT SCANNER v1.0 · FOR RESEARCH PURPOSES ONLY · NOT FINANCIAL ADVICE
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex", alignItems: "center", padding: "12px 16px",
  background: "#070f1f", borderRadius: 8, marginBottom: 4,
  border: "1px solid #ffffff08", transition: "background 0.15s", cursor: "default"
};

function EmptyState({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#4a6fa5", fontSize: 13 }}>
      {msg || "No data available — try refreshing"}
    </div>
  );
}

function AssetRow({ id, name, symbol, price, change24, mcap, athDiscount, score, badge, expanded, expandedDetail, loadingDetail, onResearch }) {
  const changeColor = change24 > 0 ? "#00ff88" : change24 < 0 ? "#ff4455" : "#888";
  const mcapLabel = mcap > 1_000_000_000 ? `$${(mcap / 1_000_000_000).toFixed(1)}B` : mcap > 1_000_000 ? `$${(mcap / 1_000_000).toFixed(1)}M` : mcap ? `$${(mcap / 1000).toFixed(0)}K` : "N/A";

  return (
    <>
      <div className="asset-row" style={rowStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 2 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#00ff8820",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#00ff88", fontWeight: 700, fontSize: 11
          }}>{symbol?.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{name}</div>
            <div style={{ color: "#4a6fa5", fontSize: 11 }}>{symbol?.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 13, color: "#ccd" }}>{price}</div>
        <div style={{ flex: 1, color: changeColor, fontSize: 13, fontWeight: 600 }}>
          {change24 != null ? `${change24 > 0 ? "+" : ""}${change24.toFixed(2)}%` : "—"}
        </div>
        <div style={{ flex: 1, color: "#888", fontSize: 12 }}>{mcapLabel}</div>
        <div style={{ flex: 1.5 }}>
          {athDiscount != null ? <ATHBar pct={athDiscount} /> : <span style={{ color: "#333", fontSize: 12 }}>—</span>}
        </div>
        <div style={{ flex: 1 }}>
          {badge && <span style={{ background: badge.color + "20", color: badge.color, border: `1px solid ${badge.color}40`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{badge.label}</span>}
        </div>
        <div style={{ flex: 1 }}><OpportunityBadge score={score} /></div>
        <div style={{ flex: 1 }}>
          <button className="research-btn" onClick={onResearch} style={{
            background: expanded ? "#00ff8820" : "#0a1628",
            border: `1px solid ${expanded ? "#00ff88" : "#ffffff20"}`,
            color: expanded ? "#00ff88" : "#888", borderRadius: 6,
            padding: "5px 12px", cursor: "pointer", fontSize: 11,
            fontFamily: "inherit", transition: "all 0.2s"
          }}>{expanded ? "▲ Close" : "▼ Research"}</button>
        </div>
      </div>
      {expanded && (
        loadingDetail
          ? <div style={{ textAlign: "center", padding: 20, color: "#4a6fa5", fontSize: 12 }}>Loading research data...</div>
          : expandedDetail
            ? <ResearchPanel coin={expandedDetail} onClose={() => onResearch()} />
            : <div style={{ textAlign: "center", padding: 20, color: "#4a6fa5", fontSize: 12 }}>No detail data available</div>
      )}
    </>
  );
}
