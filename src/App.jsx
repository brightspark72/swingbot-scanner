import { useState, useEffect, useCallback } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (!n && n !== 0) return "N/A";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function fmtMcap(n) {
  if (!n) return "N/A";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function scoreBreakdown({ athDiscount, volMcap, isTrending, devCommits, circulatingPct, mcap, round }) {
  const parts = {};
  // Price position — 30 pts
  if (athDiscount >= 80 && athDiscount <= 95) parts.price = 30;
  else if (athDiscount >= 60) parts.price = 18;
  else if (athDiscount >= 40) parts.price = 10;
  else parts.price = 0;
  // Volume — 20 pts
  if (volMcap > 0.5) parts.volume = 20;
  else if (volMcap > 0.2) parts.volume = 12;
  else if (volMcap > 0.05) parts.volume = 6;
  else parts.volume = 0;
  // Dev — 15 pts
  if (devCommits > 10) parts.dev = 15;
  else if (devCommits > 0) parts.dev = 7;
  else parts.dev = 0;
  // Tokenomics — 10 pts
  if (circulatingPct > 70) parts.tokenomics = 10;
  else if (circulatingPct > 40) parts.tokenomics = 5;
  else parts.tokenomics = 0;
  // Social/trending — 15 pts
  parts.social = isTrending ? 15 : 0;
  // Round match — 10 pts
  if (round === "all") parts.round = 5;
  else if (round === "micro" && mcap < 50e6) parts.round = 10;
  else if (round === "mid" && mcap >= 50e6) parts.round = 10;
  else parts.round = 0;

  const total = Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0));
  return { ...parts, total };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color = score >= 71 ? "#00ff88" : score >= 41 ? "#ffaa00" : "#ff4455";
  const bg = color + "18";
  return (
    <div style={{
      background: bg, color, border: `1px solid ${color}50`,
      borderRadius: 8, padding: "4px 12px", fontWeight: 800,
      fontSize: 18, letterSpacing: 1, fontFamily: "monospace",
      minWidth: 52, textAlign: "center", lineHeight: 1.2
    }}>
      {score}
      <div style={{ fontSize: 9, fontWeight: 400, letterSpacing: 0.5, opacity: 0.7 }}>/ 100</div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 2 }}>
        <span>{label}</span><span style={{ color: value > 0 ? color : "#444" }}>{value}/{max}</span>
      </div>
      <div style={{ background: "#ffffff08", borderRadius: 3, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${(value / max) * 100}%`, background: value > 0 ? color : "#333", height: "100%", borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function ATHBar({ pct }) {
  const discount = Math.min(100, Math.max(0, pct));
  const color = discount >= 80 && discount <= 95 ? "#00ff88" : discount > 50 ? "#ffaa00" : "#ff4455";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "#ffffff08", borderRadius: 3, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${100 - discount}%`, background: color, height: "100%", borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 700, minWidth: 40, fontFamily: "monospace" }}>-{discount.toFixed(0)}%</span>
    </div>
  );
}

function SignalPills({ signals }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {signals.map((s, i) => (
        <span key={i} style={{
          background: s.color + "18", color: s.color, border: `1px solid ${s.color}40`,
          borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: 0.5
        }}>{s.label}</span>
      ))}
    </div>
  );
}

function ResearchPanel({ coin, scores, onClose }) {
  const athDiscount = coin.ath && coin.current_price ? ((coin.ath - coin.current_price) / coin.ath * 100) : null;
  const circulatingPct = coin.total_supply ? (coin.circulating_supply / coin.total_supply * 100) : null;
  const commits = coin.developer_data?.commit_activity_4_weeks || 0;

  const summary = (() => {
    const parts = [];
    if (athDiscount) parts.push(`${coin.name} is ${athDiscount.toFixed(0)}% below its all-time high`);
    if (commits > 10) parts.push(`strong development activity with ${commits} commits in the last 4 weeks`);
    else if (commits > 0) parts.push(`some development activity (${commits} commits recently)`);
    else parts.push(`no recent GitHub activity detected — verify the team is still active`);
    if (circulatingPct > 70) parts.push(`${circulatingPct.toFixed(0)}% of supply is circulating suggesting lower dump risk`);
    else if (circulatingPct) parts.push(`only ${circulatingPct.toFixed(0)}% of supply is circulating — watch for scheduled unlocks`);
    if (coin.isTrending) parts.push(`currently trending across crypto platforms`);
    return parts.join(", ") + ".";
  })();

  return (
    <div style={{ background: "#060e1c", border: "1px solid #00ff8830", borderRadius: 12, padding: 20, marginTop: 2, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: "#00ff88", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>⚡ RESEARCH: {coin.name?.toUpperCase()}</div>
        <button onClick={onClose} style={{ background: "none", border: "1px solid #ffffff20", color: "#666", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 11 }}>✕ Close</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {/* Score breakdown */}
        <div style={{ background: "#0a1628", borderRadius: 8, padding: 12, gridColumn: "span 1" }}>
          <div style={{ color: "#4a6fa5", fontSize: 10, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Score Breakdown</div>
          {scores && <>
            <ScoreBar label="⚡ Price Position" value={scores.price} max={30} color="#00ff88" />
            <ScoreBar label="📊 Volume Signal" value={scores.volume} max={20} color="#00aaff" />
            <ScoreBar label="🔬 Dev Activity" value={scores.dev} max={15} color="#aa88ff" />
            <ScoreBar label="🔥 Social/Trend" value={scores.social} max={15} color="#ff8844" />
            <ScoreBar label="💎 Tokenomics" value={scores.tokenomics} max={10} color="#ffdd44" />
            <ScoreBar label="🎯 Round Match" value={scores.round} max={10} color="#44ffdd" />
          </>}
        </div>

        {/* Tokenomics */}
        <div style={{ background: "#0a1628", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#4a6fa5", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tokenomics</div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 2 }}>
            <div>Circulating: <span style={{ color: "#fff" }}>{coin.circulating_supply?.toLocaleString() || "N/A"}</span></div>
            <div>Total Supply: <span style={{ color: "#fff" }}>{coin.total_supply?.toLocaleString() || "N/A"}</span></div>
            <div>% Circulating: <span style={{ color: circulatingPct > 70 ? "#00ff88" : "#ffaa00" }}>{circulatingPct ? circulatingPct.toFixed(1) + "%" : "N/A"}</span></div>
            <div>Genesis: <span style={{ color: "#fff" }}>{coin.genesis_date || "Unknown"}</span></div>
            <div>ATH: <span style={{ color: "#fff" }}>{fmt$(coin.ath)}</span></div>
          </div>
        </div>

        {/* Dev */}
        <div style={{ background: "#0a1628", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#4a6fa5", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Dev Activity</div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 2 }}>
            <div>4-wk commits: <span style={{ color: commits > 10 ? "#00ff88" : commits > 0 ? "#ffaa00" : "#ff4455", fontWeight: 700 }}>{commits}</span></div>
            <div>GitHub Stars: <span style={{ color: "#fff" }}>{coin.developer_data?.stars?.toLocaleString() || "N/A"}</span></div>
            <div>Forks: <span style={{ color: "#fff" }}>{coin.developer_data?.forks?.toLocaleString() || "N/A"}</span></div>
            <div>Status: <span style={{ color: commits > 10 ? "#00ff88" : commits > 0 ? "#ffaa00" : "#ff4455", fontWeight: 700 }}>{commits > 10 ? "🟢 Active" : commits > 0 ? "🟡 Low" : "🔴 Inactive"}</span></div>
          </div>
        </div>

        {/* Community */}
        <div style={{ background: "#0a1628", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#4a6fa5", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Community</div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 2 }}>
            <div>Twitter: <span style={{ color: "#fff" }}>{coin.community_data?.twitter_followers?.toLocaleString() || "N/A"}</span></div>
            <div>Reddit: <span style={{ color: "#fff" }}>{coin.community_data?.reddit_subscribers?.toLocaleString() || "N/A"}</span></div>
            <div>Telegram: <span style={{ color: "#fff" }}>{coin.community_data?.telegram_channel_user_count?.toLocaleString() || "N/A"}</span></div>
            <div>Trending: <span style={{ color: coin.isTrending ? "#00ff88" : "#666", fontWeight: 700 }}>{coin.isTrending ? "🟢 Yes" : "No"}</span></div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: "#00ff8810", border: "1px solid #00ff8825", borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div style={{ color: "#00ff88", fontSize: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>⚡ Summary</div>
        <div style={{ color: "#ccd", fontSize: 12, lineHeight: 1.7 }}>{summary}</div>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "CoinGecko ↗", url: `https://www.coingecko.com/en/coins/${coin.id}` },
          { label: "DexScreener ↗", url: `https://dexscreener.com/search?q=${coin.symbol}` },
          { label: "TradingView ↗", url: `https://www.tradingview.com/chart/?symbol=${coin.symbol?.toUpperCase()}USDT` },
        ].map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
            background: "#ffffff08", border: "1px solid #ffffff15", color: "#888",
            borderRadius: 6, padding: "5px 12px", fontSize: 11, textDecoration: "none"
          }}>{l.label}</a>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [marketRes, trendingRes] = await Promise.allSettled([
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d"),
        fetch("https://api.coingecko.com/api/v3/search/trending"),
      ]);

      if (marketRes.status === "fulfilled" && marketRes.value.ok) {
        const d = await marketRes.value.json();
        setMarketCoins(Array.isArray(d) ? d : []);
      }
      if (trendingRes.status === "fulfilled" && trendingRes.value.ok) {
        const d = await trendingRes.value.json();
        const ids = new Set((d.coins || []).map(c => c.item?.id).filter(Boolean));
        setTrendingIds(ids);
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetail = useCallback(async (id) => {
    if (detailMap[id]) return;
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

  // Build unified scored list
  const scoredCoins = marketCoins
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
      const scores = scoreBreakdown({ athDiscount, volMcap, isTrending, devCommits, circulatingPct, mcap: c.market_cap, round });

      // Build signal pills
      const signals = [];
      if (isTrending) signals.push({ label: "TRENDING", color: "#ff8844" });
      if (volMcap > 0.5) signals.push({ label: "VOL SPIKE", color: "#00aaff" });
      if (athDiscount >= 80 && athDiscount <= 95) signals.push({ label: "ATH SWEET SPOT", color: "#00ff88" });
      else if (athDiscount >= 60) signals.push({ label: "DISCOUNTED", color: "#ffaa00" });
      if (devCommits > 10) signals.push({ label: "ACTIVE DEV", color: "#aa88ff" });
      if (circulatingPct > 70) signals.push({ label: "LOW DUMP RISK", color: "#44ffdd" });
      else if (circulatingPct < 40) signals.push({ label: "HIGH INFLATION", color: "#ff4455" });

      return { ...c, athDiscount, volMcap, isTrending, scores, signals };
    })
    .filter(c => c.scores.total >= filterMin)
    .sort((a, b) => {
      if (sortBy === "score") return b.scores.total - a.scores.total;
      if (sortBy === "ath") return b.athDiscount - a.athDiscount;
      if (sortBy === "volume") return b.volMcap - a.volMcap;
      if (sortBy === "change") return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
      return 0;
    });

  return (
    <div style={{ minHeight: "100vh", background: "#040c18", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "#ccd6f6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #040c18; } ::-webkit-scrollbar-thumb { background: #00ff8830; border-radius: 3px; }
        .hovrow:hover { background: #0b1a30 !important; }
        .pill-btn { transition: all 0.15s; }
        .pill-btn:hover { opacity: 0.8; }
        .sort-btn:hover { color: #00ff88 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(180deg,#020810 0%,#040c18 100%)", borderBottom: "1px solid #00ff8828", padding: "20px 28px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: "#00ff88", letterSpacing: 3, lineHeight: 1 }}>
              SWINGBOT <span style={{ color: "#fff" }}>SCANNER</span> <span style={{ color: "#4a6fa5", fontSize: 16 }}>v2.0</span>
            </div>
            <div style={{ color: "#2a4a6a", fontSize: 11, letterSpacing: 2, marginTop: 3 }}>UNIFIED OPPORTUNITY INTELLIGENCE · ALL SIGNALS · ONE RANKED LIST</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdated && <span style={{ color: "#2a4a6a", fontSize: 10 }}>↻ {lastUpdated.toLocaleTimeString()}</span>}
            <button onClick={fetchAll} disabled={loading} style={{
              background: "#0a1628", border: "1px solid #00ff8840", color: "#00ff88",
              borderRadius: 7, padding: "7px 16px", cursor: "pointer", fontSize: 11,
              fontFamily: "inherit", letterSpacing: 1
            }}>{loading ? "SCANNING..." : "↻ REFRESH"}</button>
          </div>
        </div>

        {/* Round selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["all", "🌐 All Rounds"], ["micro", "⚡ Round 1-2 · Micro / DEX"], ["mid", "📈 Round 3-4 · Mid / CEX"]].map(([key, label]) => (
            <button key={key} className="pill-btn" onClick={() => setRound(key)} style={{
              background: round === key ? "#00ff88" : "#0a1628",
              color: round === key ? "#040c18" : "#668",
              border: `1px solid ${round === key ? "#00ff88" : "#ffffff18"}`,
              borderRadius: 20, padding: "5px 16px", cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", fontWeight: round === key ? 700 : 400, letterSpacing: 0.5
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{ background: "#060e1c", borderBottom: "1px solid #ffffff08", padding: "10px 28px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ color: "#4a6fa5", fontSize: 10, letterSpacing: 1 }}>SORT BY:</div>
        {[["score", "Opportunity Score"], ["ath", "ATH Discount"], ["volume", "Volume Spike"], ["change", "24h Change"]].map(([key, label]) => (
          <button key={key} className="sort-btn" onClick={() => setSortBy(key)} style={{
            background: "none", border: "none", color: sortBy === key ? "#00ff88" : "#446",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: sortBy === key ? 700 : 400,
            borderBottom: sortBy === key ? "1px solid #00ff88" : "1px solid transparent", paddingBottom: 2
          }}>{label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#4a6fa5", fontSize: 10, letterSpacing: 1 }}>MIN SCORE:</div>
          {[0, 20, 40, 60].map(v => (
            <button key={v} className="pill-btn" onClick={() => setFilterMin(v)} style={{
              background: filterMin === v ? "#00ff8820" : "none",
              border: `1px solid ${filterMin === v ? "#00ff88" : "#ffffff15"}`,
              color: filterMin === v ? "#00ff88" : "#446",
              borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontFamily: "inherit"
            }}>{v}+</button>
          ))}
        </div>
        <div style={{ color: "#2a4a6a", fontSize: 10 }}>{scoredCoins.length} assets</div>
      </div>

      {/* ── Signal legend ── */}
      <div style={{ background: "#050d1a", borderBottom: "1px solid #ffffff06", padding: "8px 28px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ color: "#2a4a6a", fontSize: 9, letterSpacing: 1 }}>SIGNALS:</div>
        {[
          { label: "TRENDING", color: "#ff8844" },
          { label: "VOL SPIKE", color: "#00aaff" },
          { label: "ATH SWEET SPOT", color: "#00ff88" },
          { label: "DISCOUNTED", color: "#ffaa00" },
          { label: "ACTIVE DEV", color: "#aa88ff" },
          { label: "LOW DUMP RISK", color: "#44ffdd" },
          { label: "HIGH INFLATION", color: "#ff4455" },
        ].map(s => (
          <span key={s.label} style={{ background: s.color + "15", color: s.color, border: `1px solid ${s.color}35`, borderRadius: 3, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>{s.label}</span>
        ))}
      </div>

      {/* ── Table header ── */}
      <div style={{ display: "flex", padding: "8px 28px", color: "#2a4a6a", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: "1px solid #ffffff06" }}>
        <div style={{ flex: "0 0 52px" }}></div>
        <div style={{ flex: 2 }}>Asset</div>
        <div style={{ flex: 1 }}>Price</div>
        <div style={{ flex: 1 }}>24h %</div>
        <div style={{ flex: 1 }}>Market Cap</div>
        <div style={{ flex: 1.5 }}>ATH Discount</div>
        <div style={{ flex: 2 }}>Signals</div>
        <div style={{ flex: 1, textAlign: "center" }}>Score</div>
        <div style={{ flex: 1 }}></div>
      </div>

      {/* ── Rows ── */}
      <div style={{ padding: "8px 28px 40px" }}>
        {loading && !marketCoins.length ? (
          <div style={{ textAlign: "center", padding: 60, color: "#2a4a6a" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>◌</div>
            <div style={{ fontSize: 11, letterSpacing: 3 }}>SCANNING ALL SIGNALS...</div>
          </div>
        ) : scoredCoins.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#2a4a6a", fontSize: 12 }}>No assets match current filters</div>
        ) : (
          scoredCoins.map((c, idx) => {
            const changeColor = c.price_change_percentage_24h > 0 ? "#00ff88" : c.price_change_percentage_24h < 0 ? "#ff4455" : "#666";
            const isExpanded = expandedId === c.id;
            const detail = detailMap[c.id];
            const isLoadingDetail = loadingDetailId === c.id;

            return (
              <div key={c.id}>
                <div className="hovrow" onClick={() => handleExpand(c.id)} style={{
                  display: "flex", alignItems: "center", padding: "11px 0",
                  borderBottom: "1px solid #ffffff06", cursor: "pointer",
                  background: isExpanded ? "#0a1628" : "transparent",
                  transition: "background 0.15s"
                }}>
                  {/* Rank */}
                  <div style={{ flex: "0 0 52px", color: "#2a4a6a", fontSize: 11, fontWeight: 700, paddingLeft: 4 }}>
                    #{idx + 1}
                  </div>
                  {/* Name */}
                  <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: "#00ff8815",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#00ff88", fontWeight: 800, fontSize: 10, flexShrink: 0
                    }}>{c.symbol?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#e8f0ff", fontSize: 13 }}>{c.name}</div>
                      <div style={{ color: "#2a4a6a", fontSize: 10 }}>{c.symbol?.toUpperCase()}</div>
                    </div>
                  </div>
                  {/* Price */}
                  <div style={{ flex: 1, fontSize: 12, color: "#ccd" }}>{fmt$(c.current_price)}</div>
                  {/* 24h */}
                  <div style={{ flex: 1, color: changeColor, fontSize: 12, fontWeight: 700 }}>
                    {c.price_change_percentage_24h != null ? `${c.price_change_percentage_24h > 0 ? "+" : ""}${c.price_change_percentage_24h.toFixed(2)}%` : "—"}
                  </div>
                  {/* Mcap */}
                  <div style={{ flex: 1, color: "#668", fontSize: 11 }}>{fmtMcap(c.market_cap)}</div>
                  {/* ATH */}
                  <div style={{ flex: 1.5 }}>
                    {c.athDiscount > 0 ? <ATHBar pct={c.athDiscount} /> : <span style={{ color: "#333", fontSize: 11 }}>—</span>}
                  </div>
                  {/* Signals */}
                  <div style={{ flex: 2 }}><SignalPills signals={c.signals} /></div>
                  {/* Score */}
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <ScoreBadge score={c.scores.total} />
                  </div>
                  {/* Expand */}
                  <div style={{ flex: 1, textAlign: "right", color: "#446", fontSize: 11 }}>
                    {isExpanded ? "▲ close" : "▼ research"}
                  </div>
                </div>

                {isExpanded && (
                  isLoadingDetail ? (
                    <div style={{ padding: "16px 0", color: "#4a6fa5", fontSize: 11, textAlign: "center" }}>Loading research data...</div>
                  ) : detail ? (
                    <ResearchPanel coin={{ ...detail, isTrending: c.isTrending }} scores={c.scores} onClose={() => setExpandedId(null)} />
                  ) : (
                    <div style={{ padding: "16px 0", color: "#4a6fa5", fontSize: 11, textAlign: "center" }}>Click again to load research — CoinGecko rate limit may apply</div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ textAlign: "center", padding: "16px 28px", borderTop: "1px solid #ffffff06", color: "#1a3050", fontSize: 10, letterSpacing: 1 }}>
        SWINGBOT SCANNER v2.0 · FOR RESEARCH PURPOSES ONLY · NOT FINANCIAL ADVICE
      </div>
    </div>
  );
}
