import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrimaryButton from "./PrimaryButton";

export default function Navbar({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("emogita-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("emogita-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    localStorage.removeItem("emogita_session");
    localStorage.removeItem("userProfile");
    window.dispatchEvent(new Event("emogita_auth_change"));
    navigate("/login");
  };

  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "insights";

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="top-navbar" role="banner">
        <Link to={session ? "/dashboard" : "/"} className="nav-brand" aria-label="EmoGita home">
          <img
            src="/logo_original.jpeg"
            alt=""
            className="nav-logo-img"
            onError={(e) => {
              // fallback if logo fails
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="nav-wordmark">EmoGita</span>
        </Link>

        {session && (
          <nav className="nav-links-desktop" aria-label="Main Navigation">
            <Link
              to="/voice"
              className={`nav-link-item ${currentPath === "/voice" ? "active" : ""}`}
            >
              Speak
            </Link>
            <Link
              to="/dashboard?tab=insights"
              className={`nav-link-item ${currentPath === "/dashboard" && activeTab === "insights" ? "active" : ""}`}
            >
              Insights
            </Link>
            <Link
              to="/dashboard?tab=history"
              className={`nav-link-item ${currentPath === "/dashboard" && activeTab === "history" ? "active" : ""}`}
            >
              Past reflections
            </Link>
          </nav>
        )}

        <div className="nav-actions">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-quiet"
            aria-label={`Switch to ${theme === "dark" ? "Day" : "Night"} theme`}
            title={`Switch to ${theme === "dark" ? "Day" : "Night"} theme`}
            style={{ width: "44px", height: "44px", padding: 0, borderRadius: "50%" }}
          >
            {theme === "dark" ? (
              // Sun icon for switching to light
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Moon icon for switching to dark
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {session ? (
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-quiet"
              style={{ fontSize: "0.875rem" }}
            >
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-quiet" style={{ textDecoration: "none" }}>
                Log in
              </Link>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <PrimaryButton variant="primary" style={{ height: "42px", padding: "0 18px", fontSize: "0.875rem" }}>
                  Get started
                </PrimaryButton>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Bottom Tab Bar for Mobile (when logged in) */}
      {session && (
        <nav className="bottom-tab-bar" aria-label="Mobile Navigation">
          <Link
            to="/voice"
            className={`bottom-tab-item ${currentPath === "/voice" ? "active" : ""}`}
            aria-label="Speak"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span>Speak</span>
          </Link>
          <Link
            to="/dashboard?tab=insights"
            className={`bottom-tab-item ${currentPath === "/dashboard" && activeTab === "insights" ? "active" : ""}`}
            aria-label="Insights"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Insights</span>
          </Link>
          <Link
            to="/dashboard?tab=history"
            className={`bottom-tab-item ${currentPath === "/dashboard" && activeTab === "history" ? "active" : ""}`}
            aria-label="Past reflections"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Reflections</span>
          </Link>
        </nav>
      )}
    </>
  );
}
