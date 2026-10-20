import React from "react";
import { emotionMeta } from "../utils/emotion";

export default function EmotionDisplay({ emotion, confidence = null, showLabel = true, size = 20 }) {
  const meta = emotionMeta(emotion);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 10px",
        borderRadius: "var(--r-sm)",
        background: "var(--surface-raised)",
        border: "1px solid var(--line)"
      }}
      aria-label={`Emotion: ${meta.label}${confidence !== null ? ` ${Math.round(confidence * 100)}%` : ""}`}
    >
      <span style={{ display: "inline-flex", color: meta.color }}>
        {meta.renderIcon({ size, color: meta.color })}
      </span>

      {showLabel && (
        <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text)", textTransform: "capitalize" }}>
          {meta.label}
        </span>
      )}

      {confidence !== null && (
        <span className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginLeft: "2px" }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
