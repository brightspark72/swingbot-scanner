import { useState, useEffect, useCallback } from "react";

function fmt$(n) {
  if (!n && n !== 0) return "N/A";
  if (n < 0.000001) return `$${n.toFixed(10)}`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function fmtMcap(n) {
  if (!n) return "N/A";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function scoreBreakdown({ athDiscount, volMcap, isTrending, devCommits, circulatingPct, mcap, round, isDex, dexVolume, dexLiquidity }) {
  const parts = {};
  // Price position — 30 pts (DEX tokens get partial credit)
  if (!isDex) {
    if (athDiscount >= 80 && athDiscount <= 95) parts.price = 30;
    else if (athDiscount >= 60) parts.price = 18;
    else if (athDiscount >= 40) parts.price = 10;
    else parts.price = 0;
  } else {
    parts.price = 10; // DEX tokens assumed deeply early-stage
  }
  // Volume — 20 pts
  if (isDex) {
    if (dexVolume > 1e6) parts.volume = 20;
    else if (dexVolume > 500e3) parts.volume = 14;
    else if (dexVolume > 100e3) parts.volume = 7;
    else parts.volume = 0;
  } else {
    if (volMcap > 0.5) parts.volume = 20;
    else if (volMcap > 0.2) parts.volume = 12;
    else if (volMcap > 0.05) parts.volume = 6;
    else parts.volume = 0;
  }
  // Dev — 15 pts (DEX tokens skip — no github data)
  if (!isDex) {
    if (devCommits > 10) parts.dev = 15;
    else if (devCommits > 0) parts.dev = 7;
    else parts.dev = 0;
  } else {
    parts.dev = 0;
  }
  // Tokenomics — 10 pts
  if (!isDex) {
    if (circulatingPct > 70) parts.tokenomics = 10;
    else if (circulatingPct > 40) parts.tokenomics = 5;
    else parts.tokenomics = 0;
  } else {
    // DEX liquidity as proxy
    if (dexLiquidity > 1e6) parts.tokenomics = 10;
    else if (dexLiquidity > 500e3) parts.tokenomics = 5;
    else parts.tokenomics = 0;
  }
  // Social/trending — 15 pts
  parts.social = isTrending ? 15 : 0;
  // Round match — 10 pts
  if (isDex) {
    parts.round = round === "all" || round === "micro" ? 10 : 0;
  } else if (round === "all") {
    parts.round = 5;
  } else if (round === "micro" && mcap < 50e6) {
    parts.round = 10;
  } else if (round === "mid" && mcap >= 50e6) {
    parts.round = 10;
  } else {
    parts.round = 0;
  }

  const total = Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0));
  return { ...parts, total };
}

function ScoreBadge({ score }) {
  const color = score >= 71 ? "#00ff88" : score >= 41 ? "#ffaa00" : "#ff4455";
  return (
    <div style={{
      background: color + "15", color, border: `1px solid ${color}45`,
      borderRadius: 8, padding: "4px 10px", fontWeight: 800,
      fontSize: 17, letterSpacing: 1, fontFamily: "monospace",
      minWidth: 50, textAlign: "center", lineHeight: 1.2
    }}>
      {score}
      <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.6 }}>/ 100</div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#556", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color: value > 0 ? color : "#334" }}>{value}/{max}</span>
      </div>
      <div style={{ background: "#ffffff08", borderRadius: 3, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${(value / max) * 100}%`, background: value > 0 ? color : "#222", height: "100%", borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function ATHBar({ pct }) {
  const d = Math.min(100, Math.max(0, pct));
  const color = d >= 80 && d <= 95 ? "#00ff88" : d > 50 ? "#ffaa00" : "#ff4455";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "#ffffff08", borderRadius: 3, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${100 - d}%`, background: color, height: "100%", borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 700, minWidth: 38, fontFamily: "monospace" }}>-{d.toFixed(0)}%</span>
    </div>
  );
}

function SignalPills({ signals }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {signals.map((s, i) => (
        <span key={i} style={{
          background: s.color + "18", color: s.color, border: `1px solid ${s.color}35`,
          borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700, letterSpacing: 0.3
        }}>{s.label}</span>
      ))}
    </div>
  );
}

function ChainBadge({ chain }) {
  const colors = { ethereum: "#627eea", eth: "#627eea", bsc: "#f0b90b", solana: "#9945ff", sol: "#9945ff", polygon: "#8247e5", arbitrum: "#28a0f0", base: "#0052ff" };
  const c = colors[chain?.toLowerCase()] || "#888";
  return (
    <span style={{ background: c + "20", color: c, border: `1px solid ${c}40`, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>
      {chain?.toUpperCase() || "DEX"}
    </span>
  );
}

function ResearchPanel({ coin, scores, onClose }) {
  const athDiscount = coin.ath && coin.current_price ? ((coin.ath - coin.current_price) / coin.ath * 100) : null;
  const circulatingPct = coin.total_supply ? (coin.circulating_supply / coin.total_supply * 100) : null;
  const commits = coin.developer_data?.commit_activity_4_weeks || 0;
  const isDex = coin.isDex;

  const summary = (() => {
    const parts = [];
    if (isDex) {
      parts.push(`${coin.name} is a DEX token on ${coin.chainId?.toUpperCase() || "unknown chain"}`);
      if (coin.dexVolume > 1e6) parts.push(`strong 24h DEX volume of ${fmtMcap(coin.dexVolume)}`);
      if (coin.dexLiquidity > 1e6) parts.push(`solid liquidity of ${fmtMcap(coin.dexLiquidity)}`);
      parts.push(`verify the team and contract on DexScreener before entry`);
    } else {
      if (athDiscount) parts.push(`${coin.name} is ${athDiscount.toFixed(0)}% below its all-time high`);
      if (commits > 10) parts.push(`strong development activity with ${commits} commits in the last 4 weeks`);
      else if (commits > 0) parts.push(`some development activity (${commits} commits recently)`);
      else parts.push(`no recent GitHub activity — verify the team is still active`);
      if (circulatingPct > 70) parts.push(`${circulatingPct.toFixed(0)}% of supply circulating suggesting lower dump risk`);
      else if (circulatingPct) parts.push(`only ${circulatingPct.toFixed(0)}% circulating — watch for unlocks`);
    }
    if (coin.isTrending) parts.push(`currently trending`);
    return parts.join(", ") + ".";
  })();

  return (
    <div style={{ background: "#060e1c", border: "1px solid #00ff8825", borderRadius: 10, padding: 18, marginTop: 2, marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: "#00ff88", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>
          ⚡ {coin.name?.toUpperCase()} {isDex && <ChainBadge chain={coin.chainId} />}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "1px solid #ffffff15", color: "#556", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontSize: 10 }}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
          <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Score Breakdown</div>
          <ScoreBar label="⚡ Price / Stage" value={scores.price} max={30} color="#00ff88" />
          <ScoreBar label="📊 Volume" value={scores.volume} max={20} color="#00aaff" />
          <ScoreBar label="🔬 Dev Activity" value={scores.dev} max={15} color="#aa88ff" />
          <ScoreBar label="🔥 Social/Trend" value={scores.social} max={15} color="#ff8844" />
          <ScoreBar label="💎 Tokenomics" value={scores.tokenomics} max={10} color="#ffdd44" />
          <ScoreBar label="🎯 Round Match" value={scores.round} max={10} color="#44ffdd" />
        </div>

        {isDex ? (
          <>
            <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
              <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>DEX Data</div>
              <div style={{ fontSize: 11, color: "#aaa", lineHeight: 2 }}>
                <div>Chain: <span style={{ color: "#fff" }}><ChainBadge chain={coin.chainId} /></span></div>
                <div>24h Volume: <span style={{ color: "#00aaff" }}>{fmtMcap(coin.dexVolume)}</span></div>
                <div>Liquidity: <span style={{ color: coin.dexLiquidity > 1e6 ? "#00ff88" : "#ffaa00" }}>{fmtMcap(coin.dexLiquidity)}</span></div>
                <div>Price: <span style={{ color: "#fff" }}>{fmt$(coin.current_price)}</span></div>
              </div>
            </div>
            <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
              <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Contract</div>
              <div style={{ fontSize: 10, color: "#aaa", lineHeight: 2, wordBreak: "break-all" }}>
                <div style={{ color: "#556", marginBottom: 4 }}>Address:</div>
                <div style={{ color: "#fff", fontSize: 9 }}>{coin.tokenAddress || "N/A"}</div>
              </div>
            </div>
            <div style={{ background: "#ff445510", borderRadius: 7, padding: 10, border: "1px solid #ff445520" }}>
              <div style={{ color: "#ff8899", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>⚠ DEX Caution</div>
              <div style={{ fontSize: 10, color: "#cc8888", lineHeight: 1.7 }}>
                Always verify contract on DexScreener. Check for honeypots, check liquidity lock status, and research the team before entry.
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
              <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tokenomics</div>
              <div style={{ fontSize: 11, color: "#aaa", lineHeight: 2 }}>
                <div>Circulating: <span style={{ color: "#fff" }}>{coin.circulating_supply?.toLocaleString() || "N/A"}</span></div>
                <div>Total Supply: <span style={{ color: "#fff" }}>{coin.total_supply?.toLocaleString() || "N/A"}</span></div>
                <div>% Circ: <span style={{ color: circulatingPct > 70 ? "#00ff88" : "#ffaa00" }}>{circulatingPct ? circulatingPct.toFixed(1) + "%" : "N/A"}</span></div>
                <div>Genesis: <span style={{ color: "#fff" }}>{coin.genesis_date || "Unknown"}</span></div>
              </div>
            </div>
            <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
              <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Dev Activity</div>
              <div style={{ fontSize: 11, color: "#aaa", lineHeight: 2 }}>
                <div>4-wk commits: <span style={{ color: commits > 10 ? "#00ff88" : commits > 0 ? "#ffaa00" : "#ff4455", fontWeight: 700 }}>{commits}</span></div>
                <div>Stars: <span style={{ color: "#fff" }}>{coin.developer_data?.stars?.toLocaleString() || "N/A"}</span></div>
                <div>Status: <span style={{ color: commits > 10 ? "#00ff88" : commits > 0 ? "#ffaa00" : "#ff4455", fontWeight: 700 }}>{commits > 10 ? "🟢 Active" : commits > 0 ? "🟡 Low" : "🔴 Inactive"}</span></div>
              </div>
            </div>
            <div style={{ background: "#0a1628", borderRadius: 7, padding: 10 }}>
              <div style={{ color: "#334", fontSize: 9, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Community</div>
              <div style={{ fontSize: 11, color: "#aaa", lineHeight: 2 }}>
                <div>Twitter: <span style={{ color: "#fff" }}>{coin.community_data?.twitter_followers?.toLocaleString() || "N/A"}</span></div>
                <div>Reddit: <span style={{ color: "#fff" }}>{coin.community_data?.reddit_subscribers?.toLocaleString() || "N/A"}</span></div>
                <div>Telegram: <span style={{ color: "#fff" }}>{coin.community_data?.telegram_channel_user_count?.toLocaleString() || "N/A"}</span></div>
                <div>ATH: <span style={{ color: "#fff" }}>{fmt$(coin.ath)}</span></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ background: "#00ff8810", border: "1px solid #00ff8820", borderRadius: 7, padding: 10, marginBottom: 12 }}>
        <div style={{ color: "#00ff88", fontSize: 9, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>⚡ Summary</div>
        <div style={{ color: "#ccd", fontSize: 11, lineHeight: 1.7 }}>{summary}</div>
      </div>

      <div style={{ display: "flex", gap: 7 }}>
        {!isDex && <a href={`https://www.coingecko.com/en/coins/${coin.id}`} target="_blank" rel="noopener noreferrer" style={{ background: "#ffffff08", border: "1px solid #ffffff12", color: "#778", borderRadius: 5, padding: "4px 10px", fontSize: 10, textDecoration: "none" }}>CoinGecko ↗</a>}
        <a href={`https://dexscreener.com/search?q=${coin.symbol || coin.tokenAddress}`} target="_blank" rel="noopener noreferrer" style={{ background: "#ffffff08", border: "1px solid #ffffff12", color: "#778", borderRadius: 5, padding: "4px 10px", fontSize: 10, textDecoration: "none" }}>DexScreener ↗</a>
        {!isDex && <a href={`https://www.tradingview.com/chart/?symbol=${coin.symbol?.toUpperCase()}USDT`} target="_blank" rel="noopener noreferrer" style={{ background: "#ffffff08", border: "1px solid #ffffff12", color: "#778", borderRadius: 5, padding: "4px 10px", fontSize: 10, textDecoration: "none" }}>TradingView ↗</a>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SwingBotScanner() {
  const [round, setRound] = useState("all");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [sortBy, setSortBy] = useState("score");
  const [filterMin, setFilterMin] = useState(0);

  const [marketCoins, setMarketCoins] = useState([]);
  const [trendingIds, setTrendingIds] = useState(new Set());
  const [dexTokens, setDexTokens] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [marketRes, trendingRes, dexRes] = await Promise.allSettled([
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d"),
        fetch("https://api.coingecko.com/api/v3/search/trending"),
        fetch("/api/dexscreener"),
      ]);
      if (marketRes.status === "fulfilled" && marketRes.value.ok) {
        const d = await marketRes.value.json();
        setMarketCoins(Array.isArray(d) ? d : []);
      }
      if (trendingRes.status === "fulfilled" && trendingRes.value.ok) {
        const d = await trendingRes.value.json();
        setTrendingIds(new Set((d.coins || []).map(c => c.item?.id).filter(Boolean)));
      }
      if (dexRes.status === "fulfilled" && dexRes.value.ok) {
        const d = await dexRes.value.json();
        setDexTokens(Array.isArray(d) ? d.slice(0, 40) : []);
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetail = useCallback(async (id) => {
    if (detailMap[id] || id.startsWith("dex_")) return;
    setLoadingDetailId(id);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true`);
      if (res.ok) {
        const d = await res.json();
        setDetailMap(prev => ({ ...prev, [id]: d }));
      }
    } finally {
      setLoadingDetailId(null);
    }
  }, [detailMap]);

  const handleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchDetail(id);
  };

  // Build CoinGecko entries
  const cgEntries = marketCoins
    .filter(c => {
      if (round === "micro") return c.market_cap < 50e6;
      if (round === "mid") return c.market_cap >= 50e6;
      return true;
    })
    .map(c => {
      const athDiscount = c.ath && c.current_price ? ((c.ath - c.current_price) / c.ath * 100) : 0;
      const volMcap = c.total_volume / (c.market_cap || 1);
      const isTrending = trendingIds.has(c.id);
      const detail = detailMap[c.id];
      const devCommits = detail?.developer_data?.commit_activity_4_weeks || 0;
      const circulatingPct = c.total_supply ? (c.circulating_supply / c.total_supply * 100) : 60;
      const scores = scoreBreakdown({ athDiscount, volMcap, isTrending, devCommits, circulatingPct, mcap: c.market_cap, round, isDex: false });

      const signals = [];
      if (isTrending) signals.push({ label: "TRENDING", color: "#ff8844" });
      if (volMcap > 0.5) signals.push({ label: "VOL SPIKE", color: "#00aaff" });
      if (athDiscount >= 80 && athDiscount <= 95) signals.push({ label: "ATH SWEET SPOT", color: "#00ff88" });
      else if (athDiscount >= 60) signals.push({ label: "DISCOUNTED", color: "#ffaa00" });
      if (devCommits > 10) signals.push({ label: "ACTIVE DEV", color: "#aa88ff" });
      if (circulatingPct > 70) signals.push({ label: "LOW DUMP RISK", color: "#44ffdd" });
      else if (c.total_supply && circulatingPct < 40) signals.push({ label: "HIGH INFLATION", color: "#ff4455" });

      return { ...c, athDiscount, volMcap, isTrending, scores, signals, isDex: false, source: "CEX" };
    });

  // Build DexScreener entries
  const dexEntries = (round === "mid" ? [] : dexTokens).map((t, i) => {
    const dexVolume = t.volume?.h24 || 0;
    const dexLiquidity = t.liquidity?.usd || 0;
    const isTrending = true; // DexScreener feed is already trending tokens
    const scores = scoreBreakdown({ athDiscount: 0, volMcap: 0, isTrending, devCommits: 0, circulatingPct: 50, mcap: 0, round, isDex: true, dexVolume, dexLiquidity });

    const signals = [{ label: "DEX TOKEN", color: "#f0b90b" }];
    if (dexVolume > 1e6) signals.push({ label: "HIGH VOLUME", color: "#00aaff" });
    if (dexLiquidity > 1e6) signals.push({ label: "STRONG LIQUIDITY", color: "#44ffdd" });
    signals.push({ label: (t.chainId || "DEX").toUpperCase(), color: "#888" });

    return {
      id: `dex_${i}_${t.tokenAddress?.slice(0, 8)}`,
      name: t.description?.slice(0, 20) || `Token ${t.tokenAddress?.slice(0, 6)}`,
      symbol: t.tokenAddress?.slice(0, 6) || "DEX",
      current_price: null,
      price_change_percentage_24h: null,
      market_cap: 0,
      athDiscount: null,
      volMcap: 0,
      isTrending,
      scores,
      signals,
      isDex: true,
      source: "DEX",
      chainId: t.chainId,
      tokenAddress: t.tokenAddress,
      dexVolume,
      dexLiquidity,
    };
  });

  // Merge and sort
  const allCoins = [...cgEntries, ...dexEntries]
    .filter(c => c.scores.total >= filterMin)
    .sort((a, b) => {
      if (sortBy === "score") return b.scores.total - a.scores.total;
      if (sortBy === "ath") return (b.athDiscount || 0) - (a.athDiscount || 0);
      if (sortBy === "volume") return (b.volMcap || b.dexVolume || 0) - (a.volMcap || a.dexVolume || 0);
      if (sortBy === "change") return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
      return 0;
    });

  return (
    <div style={{ minHeight: "100vh", background: "#040c18", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#ccd6f6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #040c18; } ::-webkit-scrollbar-thumb { background: #00ff8828; border-radius: 3px; }
        .hovrow:hover { background: #0a1828 !important; }
        .pill:hover { opacity: 0.8; }
        .srt:hover { color: #00ff88 !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#020810 0%,#040c18 100%)", borderBottom: "1px solid #00ff8822", padding: "18px 26px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#00ff88", letterSpacing: 3, lineHeight: 1 }}>
              SWINGBOT <span style={{ color: "#fff" }}>SCANNER</span> <span style={{ color: "#2a4a6a", fontSize: 14 }}>v2.1</span>
            </div>
            <div style={{ color: "#1a3050", fontSize: 10, letterSpacing: 2, marginTop: 3 }}>CEX + DEX · ALL SIGNALS · ONE RANKED LIST</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdated && <span style={{ color: "#1a3050", fontSize: 10 }}>↻ {lastUpdated.toLocaleTimeString()}</span>}
            <button onClick={fetchAll} disabled={loading} style={{
              background: "#0a1628", border: "1px solid #00ff8835", color: "#00ff88",
              borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 10,
              fontFamily: "inherit", letterSpacing: 1
            }}>{loading ? "SCANNING..." : "↻ REFRESH"}</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["all", "🌐 All Rounds"], ["micro", "⚡ Round 1-2 · Micro / DEX"], ["mid", "📈 Round 3-4 · Mid / CEX"]].map(([key, label]) => (
            <button key={key} className="pill" onClick={() => setRound(key)} style={{
              background: round === key ? "#00ff88" : "#0a1628",
              color: round === key ? "#040c18" : "#446",
              border: `1px solid ${round === key ? "#00ff88" : "#ffffff15"}`,
              borderRadius: 20, padding: "4px 14px", cursor: "pointer",
              fontSize: 10, fontFamily: "inherit", fontWeight: round === key ? 700 : 400
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: "#060e1c", borderBottom: "1px solid #ffffff06", padding: "8px 26px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div style={{ color: "#334", fontSize: 9, letterSpacing: 1 }}>SORT:</div>
        {[["score", "Opportunity Score"], ["ath", "ATH Discount"], ["volume", "Volume"], ["change", "24h Change"]].map(([key, label]) => (
          <button key={key} className="srt" onClick={() => setSortBy(key)} style={{
            background: "none", border: "none", color: sortBy === key ? "#00ff88" : "#334",
            cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: sortBy === key ? 700 : 400,
            borderBottom: sortBy === key ? "1px solid #00ff88" : "1px solid transparent", paddingBottom: 1
          }}>{label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ color: "#334", fontSize: 9, letterSpacing: 1 }}>MIN SCORE:</div>
          {[0, 20, 40, 60].map(v => (
            <button key={v} className="pill" onClick={() => setFilterMin(v)} style={{
              background: filterMin === v ? "#00ff8818" : "none",
              border: `1px solid ${filterMin === v ? "#00ff88" : "#ffffff12"}`,
              color: filterMin === v ? "#00ff88" : "#334",
              borderRadius: 4, padding: "2px 7px", cursor: "pointer", fontSize: 9, fontFamily: "inherit"
            }}>{v}+</button>
          ))}
        </div>
        <div style={{ color: "#1a3050", fontSize: 9 }}>{allCoins.length} assets</div>
      </div>

      {/* Signal legend */}
      <div style={{ background: "#050d1a", borderBottom: "1px solid #ffffff05", padding: "6px 26px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ color: "#1a3050", fontSize: 9, letterSpacing: 1 }}>SIGNALS:</div>
        {[
          { label: "TRENDING", color: "#ff8844" }, { label: "VOL SPIKE", color: "#00aaff" },
          { label: "ATH SWEET SPOT", color: "#00ff88" }, { label: "DISCOUNTED", color: "#ffaa00" },
          { label: "ACTIVE DEV", color: "#aa88ff" }, { label: "LOW DUMP RISK", color: "#44ffdd" },
          { label: "HIGH INFLATION", color: "#ff4455" }, { label: "DEX TOKEN", color: "#f0b90b" },
        ].map(s => (
          <span key={s.label} style={{ background: s.color + "15", color: s.color, border: `1px solid ${s.color}30`, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>{s.label}</span>
        ))}
      </div>

      {/* Table header */}
      <div style={{ display: "flex", padding: "7px 26px", color: "#1a3050", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: "1px solid #ffffff05" }}>
        <div style={{ flex: "0 0 46px" }}></div>
        <div style={{ flex: 2 }}>Asset</div>
        <div style={{ flex: 1 }}>Price</div>
        <div style={{ flex: 1 }}>24h</div>
        <div style={{ flex: 1 }}>Mkt Cap</div>
        <div style={{ flex: 1.5 }}>ATH Discount</div>
        <div style={{ flex: 2 }}>Signals</div>
        <div style={{ flex: 1, textAlign: "center" }}>Score</div>
        <div style={{ flex: 1 }}></div>
      </div>

      {/* Rows */}
      <div style={{ padding: "6px 26px 40px" }}>
        {loading && !marketCoins.length ? (
          <div style={{ textAlign: "center", padding: 50, color: "#1a3050" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>◌</div>
            <div style={{ fontSize: 10, letterSpacing: 3 }}>SCANNING CEX + DEX MARKETS...</div>
          </div>
        ) : allCoins.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#1a3050", fontSize: 11 }}>No assets match current filters</div>
        ) : (
          allCoins.map((c, idx) => {
            const changeColor = (c.price_change_percentage_24h || 0) > 0 ? "#00ff88" : (c.price_change_percentage_24h || 0) < 0 ? "#ff4455" : "#334";
            const isExpanded = expandedId === c.id;
            const detail = detailMap[c.id];
            const isLoadingDetail = loadingDetailId === c.id;

            return (
              <div key={c.id}>
                <div className="hovrow" onClick={() => handleExpand(c.id)} style={{
                  display: "flex", alignItems: "center", padding: "10px 0",
                  borderBottom: "1px solid #ffffff05", cursor: "pointer",
                  background: isExpanded ? "#091628" : "transparent", transition: "background 0.1s"
                }}>
                  <div style={{ flex: "0 0 46px", color: "#1a3050", fontSize: 10, fontWeight: 700, paddingLeft: 2 }}>#{idx + 1}</div>
                  <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: c.isDex ? "#f0b90b15" : "#00ff8812",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: c.isDex ? "#f0b90b" : "#00ff88", fontWeight: 800, fontSize: 9, flexShrink: 0
                    }}>{c.symbol?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#e0eaff", fontSize: 12 }}>{c.name}</div>
                      <div style={{ color: "#1a3050", fontSize: 10 }}>{c.isDex ? <ChainBadge chain={c.chainId} /> : c.symbol?.toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: 11, color: "#aab" }}>{c.current_price ? fmt$(c.current_price) : "—"}</div>
                  <div style={{ flex: 1, color: changeColor, fontSize: 11, fontWeight: 700 }}>
                    {c.price_change_percentage_24h != null ? `${c.price_change_percentage_24h > 0 ? "+" : ""}${c.price_change_percentage_24h.toFixed(2)}%` : "—"}
                  </div>
                  <div style={{ flex: 1, color: "#334", fontSize: 10 }}>{c.market_cap ? fmtMcap(c.market_cap) : c.isDex ? <span style={{ color: "#f0b90b99", fontSize: 9 }}>DEX</span> : "N/A"}</div>
                  <div style={{ flex: 1.5 }}>
                    {c.athDiscount > 0 ? <ATHBar pct={c.athDiscount} /> : <span style={{ color: "#1a3050", fontSize: 10 }}>—</span>}
                  </div>
                  <div style={{ flex: 2 }}><SignalPills signals={c.signals} /></div>
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><ScoreBadge score={c.scores.total} /></div>
                  <div style={{ flex: 1, textAlign: "right", color: "#334", fontSize: 10 }}>{isExpanded ? "▲ close" : "▼ research"}</div>
                </div>

                {isExpanded && (
                  isLoadingDetail ? (
                    <div style={{ padding: "14px 0", color: "#2a4a6a", fontSize: 10, textAlign: "center" }}>Loading research data...</div>
                  ) : (c.isDex || detail) ? (
                    <ResearchPanel
                      coin={c.isDex ? c : { ...detail, isTrending: c.isTrending }}
                      scores={c.scores}
                      onClose={() => setExpandedId(null)}
                    />
                  ) : (
                    <div style={{ padding: "14px 0", color: "#2a4a6a", fontSize: 10, textAlign: "center" }}>Loading... (CoinGecko rate limit may apply — try again in a moment)</div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ textAlign: "center", padding: "14px 26px", borderTop: "1px solid #ffffff05", color: "#0e1e30", fontSize: 9, letterSpacing: 1 }}>
        SWINGBOT SCANNER v2.1 · CEX + DEX · FOR RESEARCH PURPOSES ONLY · NOT FINANCIAL ADVICE
      </div>
    </div>
  );
}
