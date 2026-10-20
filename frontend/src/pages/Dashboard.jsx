import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";
import PrimaryButton from "../components/PrimaryButton";
import AudioPlayer from "../components/AudioPlayer";
import { emotionMeta, ORDERED_EMOTIONS } from "../utils/emotion";

const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";

export default function Dashboard({ session }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "insights";

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail sheet state for past reflections
  const [selectedReflection, setSelectedReflection] = useState(null);

  const token = session?.access_token;

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, trendRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/emotion-analytics`, { headers }),
        fetch(`${API_BASE}/emotion-trend?days=30`, { headers }),
        fetch(`${API_BASE}/emotion-history?page=1&limit=30`, { headers })
      ]);

      if (!analyticsRes.ok || !trendRes.ok || !historyRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const [analyticsData, trendJson, historyJson] = await Promise.all([
        analyticsRes.json(),
        trendRes.json(),
        historyRes.json()
      ]);

      setAnalytics(analyticsData);
      const normalizedTrend = (Array.isArray(trendJson) ? trendJson : (trendJson.trend || [])).map(item => ({
        ...item,
        stability_score: item.stability_score ?? item.score
      }));
      setTrendData(normalizedTrend);
      setHistoryItems(Array.isArray(historyJson) ? historyJson : (historyJson.records || historyJson.history || []));
    } catch (err) {
      console.error("Dashboard data error:", err);
      setError("We couldn't load your history. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Stability ring calculations
  const stabilityScore = analytics?.stability_score ?? 70;
  let stabilityLabel = "Steady";
  let ringColor = "var(--emo-confidence)";
  if (stabilityScore < 40) {
    stabilityLabel = "Rough patch";
    ringColor = "var(--emo-sadness)";
  } else if (stabilityScore < 70) {
    stabilityLabel = "Finding balance";
    ringColor = "var(--marigold)";
  }

  // Ring arc math: 270 degree arc
  // Radius = 60, circumference = 2 * PI * 60 = 376.99
  // 270 deg of circle = 376.99 * 0.75 = 282.74
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * (stabilityScore / 100));

  // Format date helper (e.g. 12 Oct)
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  // Group history by week
  const groupHistoryByWeek = (items) => {
    const groups = {};
    items.forEach((item) => {
      const d = new Date(item.created_at || item.date);
      // Find start of week (Sunday)
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const key = `Week of ${formatDate(startOfWeek)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const groupedHistory = groupHistoryByWeek(historyItems);

  if (isLoading) {
    return (
      <main id="main" className="page-container">
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
            <div style={{ height: "40px", width: "120px", background: "var(--surface)", borderRadius: "var(--r-sm)" }} />
            <div style={{ height: "40px", width: "140px", background: "var(--surface)", borderRadius: "var(--r-sm)" }} />
          </div>
          {/* Skeleton cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="panel" style={{ height: "80px", opacity: 0.6 }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="panel" style={{ textAlign: "center", maxWidth: "440px" }}>
          <h2>{error}</h2>
          <div style={{ marginTop: "24px" }}>
            <PrimaryButton variant="primary" onClick={fetchDashboardData}>
              Try again
            </PrimaryButton>
          </div>
        </div>
      </main>
    );
  }

  const hasSessions = (historyItems && historyItems.length > 0) || (trendData && trendData.length > 0);

  return (
    <main id="main" className="page-container">
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        
        {/* Header Tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "12px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "insights"}
              onClick={() => setTab("insights")}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-sans)",
                fontSize: "1.0625rem",
                fontWeight: activeTab === "insights" ? "600" : "500",
                color: activeTab === "insights" ? "var(--peacock)" : "var(--text-muted)",
                padding: "8px 16px",
                cursor: "pointer",
                borderBottom: activeTab === "insights" ? "2px solid var(--peacock)" : "2px solid transparent",
                marginBottom: "-13px"
              }}
            >
              Insights
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setTab("history")}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-sans)",
                fontSize: "1.0625rem",
                fontWeight: activeTab === "history" ? "600" : "500",
                color: activeTab === "history" ? "var(--peacock)" : "var(--text-muted)",
                padding: "8px 16px",
                cursor: "pointer",
                borderBottom: activeTab === "history" ? "2px solid var(--peacock)" : "2px solid transparent",
                marginBottom: "-13px"
              }}
            >
              Past reflections
            </button>
          </div>

          <Link to="/voice" style={{ textDecoration: "none" }}>
            <PrimaryButton variant="primary" style={{ height: "42px", padding: "0 18px", fontSize: "0.875rem" }}>
              Start speaking
            </PrimaryButton>
          </Link>
        </div>

        {/* Empty State */}
        {!hasSessions ? (
          <div className="panel" style={{ textAlign: "center", padding: "64px var(--space-6)" }}>
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--surface-raised), var(--surface))",
                border: "2px solid var(--line)",
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--peacock)"
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
              Your insights will appear after your first reflection
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "24px" }}>
              Speak or write what's on your mind to hear the Gita's guidance.
            </p>
            <PrimaryButton variant="primary" onClick={() => window.location.href = "/voice"}>
              Start speaking
            </PrimaryButton>
          </div>
        ) : (
          <>
            {/* TAB 1: INSIGHTS */}
            {activeTab === "insights" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Top Row: Ring Gauge (270 arc) + 30-day Trend Chart */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                  
                  {/* Stability Ring Gauge */}
                  <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px var(--space-6)" }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "20px" }}>
                      Emotional Stability (30 days)
                    </div>

                    <div style={{ position: "relative", width: "170px", height: "170px" }}>
                      <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: "rotate(135deg)" }}>
                        {/* Background track (270 deg) */}
                        <circle
                          cx="85"
                          cy="85"
                          r={radius}
                          fill="none"
                          stroke="var(--line)"
                          strokeWidth="10"
                          strokeDasharray={`${arcLength} ${circumference}`}
                          strokeLinecap="round"
                        />
                        {/* Fill arc */}
                        <circle
                          cx="85"
                          cy="85"
                          r={radius}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth="10"
                          strokeDasharray={`${arcLength} ${circumference}`}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 0.8s var(--ease-calm)" }}
                        />
                      </svg>

                      {/* Center number and word label */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <span className="tabular-nums" style={{ fontFamily: "var(--font-sans)", fontSize: "2.75rem", fontWeight: "600", lineHeight: 1, color: "var(--text)" }}>
                          {stabilityScore}
                        </span>
                        <span style={{ fontSize: "0.875rem", color: ringColor, fontWeight: "600", marginTop: "4px" }}>
                          {stabilityLabel}
                        </span>
                      </div>
                    </div>

                    <details style={{ marginTop: "20px", fontSize: "0.8125rem", color: "var(--text-faint)", cursor: "pointer" }}>
                      <summary>How this score is calculated</summary>
                      <p style={{ marginTop: "8px", lineHeight: 1.5, color: "var(--text-muted)", maxWidth: "260px" }}>
                        Weighted balance of calmness, confidence, and positive emotional regulation over your recorded reflections.
                      </p>
                    </details>
                  </div>

                  {/* Trend Area Chart (Recharts) */}
                  <div className="panel" style={{ padding: "24px var(--space-6)" }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "16px" }}>
                      Stability Trend
                    </div>

                    {trendData.length > 0 ? (
                      <div style={{ width: "100%", height: "200px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--peacock)" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="var(--peacock)" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatDate}
                              stroke="var(--text-faint)"
                              fontSize={12}
                              tickLine={false}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke="var(--text-faint)"
                              fontSize={12}
                              tickCount={4}
                              tickLine={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "8px 12px", borderRadius: "var(--r-sm)" }}>
                                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDate(d.date)}</div>
                                      <div style={{ fontWeight: "600", color: "var(--text)", marginTop: "2px" }}>Score: {d.stability_score || d.score}</div>
                                      {d.dominant_emotion && (
                                        <div style={{ fontSize: "0.8125rem", color: "var(--peacock)", textTransform: "capitalize" }}>
                                          {d.dominant_emotion}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="stability_score"
                              stroke="var(--peacock)"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#areaGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "40px 0", textAlign: "center" }}>
                        Record multiple reflections to view your trend over time.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Emotion Mix + Streak */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                  
                  {/* Emotion Mix (Sorted List) */}
                  <div className="panel">
                    <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "16px" }}>
                      Emotion Mix (Last 30 Days)
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {ORDERED_EMOTIONS.map((emoKey) => {
                        const count = analytics?.emotion_counts?.[emoKey] || analytics?.emotion_counts?.[emoKey.toUpperCase()] || 0;
                        const itemMeta = emotionMeta(emoKey);
                        const total = analytics?.total_sessions || 1;
                        const pct = Math.round((count / total) * 100);

                        return (
                          <div key={emoKey} style={{ display: "grid", gridTemplateColumns: "110px 1fr 36px", alignItems: "center", gap: "12px", fontSize: "0.875rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: itemMeta.color }}>
                                {itemMeta.renderIcon({ size: 16, color: itemMeta.color })}
                              </span>
                              <span style={{ color: "var(--text)" }}>{itemMeta.label}</span>
                            </div>

                            <div className="emotion-bar-track">
                              <div
                                className="emotion-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: itemMeta.color
                                }}
                              />
                            </div>

                            <div className="tabular-nums" style={{ textAlign: "right", color: "var(--text-muted)" }}>
                              {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Negative Streak & Recent Rhythm */}
                  <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "16px" }}>
                        Recent Session Rhythm
                      </div>

                      <p style={{ color: "var(--text)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "20px" }}>
                        {analytics?.streak?.consecutive_negative >= 2 ? (
                          <span style={{ color: "var(--marigold)", fontWeight: "500" }}>
                            {analytics.streak.consecutive_negative} consecutive challenging reflections. Take a gentle breath.
                          </span>
                        ) : (
                          "Your recent sessions reflect a steady inner journey."
                        )}
                      </p>

                      {/* Row of last 7 sessions as dots filled with emotion color */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }} aria-label="Last 7 reflections">
                        {(historyItems.slice(0, 7)).map((item, idx) => {
                          const itemMeta = emotionMeta(item.emotion || item.final_emotion);
                          return (
                            <div
                              key={idx}
                              title={`${itemMeta.label} - ${formatDate(item.created_at || item.date)}`}
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: itemMeta.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: `0 0 8px ${itemMeta.color}44`
                              }}
                            >
                              {itemMeta.renderIcon({ size: 12, color: "#07202A" })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", marginTop: "24px" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>
                        Total reflections recorded: <strong style={{ color: "var(--text)" }}>{analytics?.total_sessions || historyItems.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: PAST REFLECTIONS */}
            {activeTab === "history" && (
              <div>
                {Object.keys(groupedHistory).length === 0 ? (
                  <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <p style={{ color: "var(--text-muted)" }}>No past reflections found yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                    {Object.entries(groupedHistory).map(([weekLabel, items]) => (
                      <div key={weekLabel}>
                        <h3 style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "12px" }}>
                          {weekLabel}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {items.map((item, idx) => {
                            const itemMeta = emotionMeta(item.emotion || item.final_emotion);
                            return (
                              <div
                                key={item.id || idx}
                                onClick={() => setSelectedReflection(item)}
                                className="panel"
                                style={{
                                  padding: "16px 20px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  transition: "background-color 0.15s var(--ease-calm)"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "var(--r-sm)",
                                      backgroundColor: "var(--surface-raised)",
                                      border: "1px solid var(--line)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}
                                  >
                                    {itemMeta.renderIcon({ size: 22, color: itemMeta.color })}
                                  </div>

                                  <div style={{ overflow: "hidden" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "var(--text)", textTransform: "capitalize" }}>
                                        {itemMeta.label}
                                      </span>
                                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                                        {formatDate(item.created_at || item.date)}
                                      </span>
                                    </div>
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, marginTop: "2px" }}>
                                      {item.transcribed_text || item.advice_summary || "Reflection session"}
                                    </p>
                                  </div>
                                </div>

                                <span style={{ fontSize: "0.8125rem", color: "var(--peacock)", flexShrink: 0, marginLeft: "12px" }}>
                                  Read ▾
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Detail Sheet for Selected Reflection */}
        {selectedReflection && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reflection-detail-heading"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(3, 18, 24, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px"
            }}
            onClick={() => setSelectedReflection(null)}
          >
            <div
              className="panel"
              style={{
                maxWidth: "640px",
                width: "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "32px var(--space-6)",
                boxShadow: "var(--shadow-2)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>
                    {formatDate(selectedReflection.created_at || selectedReflection.date)}
                  </span>
                  <h2 id="reflection-detail-heading" style={{ fontSize: "1.5rem", textTransform: "capitalize", margin: "4px 0 0" }}>
                    {selectedReflection.emotion || selectedReflection.final_emotion}
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setSelectedReflection(null)}
                  aria-label="Close reflection details"
                >
                  ✕
                </button>
              </div>

              {/* What was shared */}
              {selectedReflection.transcribed_text && (
                <div style={{ background: "var(--surface-raised)", padding: "16px", borderRadius: "var(--r-sm)", marginBottom: "24px" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                    What you shared
                  </div>
                  <p style={{ fontStyle: "italic", color: "var(--text)", fontSize: "0.9375rem", lineHeight: 1.6, margin: 0 }}>
                    "{selectedReflection.transcribed_text}"
                  </p>
                </div>
              )}

              {/* Audio player if audio exists */}
              {selectedReflection.audio_url && (
                <div style={{ marginBottom: "24px" }}>
                  <AudioPlayer src={selectedReflection.audio_url} />
                </div>
              )}

              {/* Advice markdown */}
              <div style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text)" }}>
                <ReactMarkdown>
                  {selectedReflection.advice_summary || selectedReflection.summary || selectedReflection.explanation || "No advice recorded."}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
