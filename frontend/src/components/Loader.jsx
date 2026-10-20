import React from "react";

export default function Loader({
  mode = "inline", // inline or screen
  size = 24,
  label = "Loading...",
  subtext = ""
}) {
  if (mode === "screen") {
    return (
      <div className="loader-screen" role="status" aria-live="polite">
        <div
          className="loader-ring"
          style={{ width: "64px", height: "64px", borderWidth: "3px" }}
          aria-hidden="true"
        />
        <h2 style={{ marginTop: "24px", color: "var(--text)" }}>{label}</h2>
        {subtext && (
          <p style={{ marginTop: "8px", color: "var(--text-muted)", maxWidth: "400px" }}>
            {subtext}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
      role="status"
      aria-live="polite"
    >
      <span
        className="loader-ring"
        style={{ width: `${size}px`, height: `${size}px`, borderWidth: size > 32 ? "3px" : "2px" }}
        aria-hidden="true"
      />
      {label && <span className="sr-only" style={{ display: "none" }}>{label}</span>}
    </div>
  );
}
