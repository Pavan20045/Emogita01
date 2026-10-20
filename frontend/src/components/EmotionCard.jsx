import React from "react";
import { emotionMeta, ORDERED_EMOTIONS } from "../utils/emotion";

export default function EmotionCard({
  emotion,
  probabilities = {},
  title = "Analysis Result",
  subtitle
}) {
  const meta = emotionMeta(emotion);

  // Parse probabilities and sort descending
  const sortedProbabilities = ORDERED_EMOTIONS.map((key) => {
    const rawVal = probabilities[key] || probabilities[key.toLowerCase()] || probabilities[key.toUpperCase()] || 0;
    const pct = Math.round(rawVal * 100);
    const itemMeta = emotionMeta(key);
    return {
      key,
      label: itemMeta.label,
      color: itemMeta.color,
      pct,
      renderIcon: itemMeta.renderIcon
    };
  }).sort((a, b) => b.pct - a.pct);

  const topKey = sortedProbabilities[0]?.key || meta.key;

  return (
    <div className="emotion-card" role="region" aria-label={`Detected emotion: ${meta.label}`}>
      <div className="emotion-card-header">
        <div
          className="emotion-icon-badge"
          style={{ borderColor: meta.color }}
        >
          {meta.renderIcon({ size: 36, color: meta.color })}
        </div>

        <div>
          <h2 style={{ color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
            {meta.label}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginTop: "4px" }}>
            {meta.description}
          </p>
        </div>
      </div>

      {subtitle && (
        <p style={{ color: "var(--text-faint)", fontSize: "0.875rem", marginBottom: "16px" }}>
          {subtitle}
        </p>
      )}

      {/* Sorted probability bars */}
      {sortedProbabilities.length > 0 && (
        <div className="emotion-bars-container" aria-label="Confidence breakdown">
          {sortedProbabilities.map((item) => {
            const isTop = item.key === topKey;
            return (
              <div key={item.key} className="emotion-bar-row">
                <div className="emotion-bar-label">
                  {item.renderIcon({ size: 16, color: isTop ? item.color : "var(--text-faint)" })}
                  <span style={{ color: isTop ? "var(--text)" : "var(--text-muted)", fontWeight: isTop ? "600" : "400" }}>
                    {item.label}
                  </span>
                </div>

                <div className="emotion-bar-track">
                  <div
                    className="emotion-bar-fill"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: isTop ? item.color : "var(--line)"
                    }}
                  />
                </div>

                <div
                  className="emotion-bar-pct tabular-nums"
                  style={{
                    color: isTop ? "var(--text)" : "var(--text-muted)",
                    fontWeight: isTop ? "600" : "400"
                  }}
                >
                  {item.pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
