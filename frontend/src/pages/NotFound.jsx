import React from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

export default function NotFound() {
  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ maxWidth: "420px" }}>
        {/* Peacock feather SVG at 120px above the text */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }} aria-hidden="true">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path d="M50 95 C50 65 30 35 50 5 C70 35 50 65 50 95" stroke="var(--peacock)" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M50 95 C45 60 20 40 40 20" stroke="var(--peacock)" strokeWidth="1" strokeOpacity="0.3" />
            <path d="M50 95 C55 60 80 40 60 20" stroke="var(--peacock)" strokeWidth="1" strokeOpacity="0.3" />
            <circle cx="50" cy="35" r="18" fill="var(--surface-raised)" stroke="var(--peacock)" strokeWidth="2" />
            <circle cx="50" cy="35" r="11" fill="none" stroke="var(--marigold)" strokeWidth="2.5" />
            <circle cx="50" cy="35" r="5" fill="var(--peacock-strong)" />
          </svg>
        </div>

        <h1 style={{ fontSize: "1.75rem", marginBottom: "12px" }}>
          This page isn't here.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "28px" }}>
          Perhaps it has shifted like the river currents at dusk.
        </p>

        <Link to="/" style={{ textDecoration: "none" }}>
          <PrimaryButton variant="primary">
            Go to home
          </PrimaryButton>
        </Link>
      </div>
    </main>
  );
}
