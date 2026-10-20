import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError("Too many attempts. Wait a minute and try again.");
        } else if (response.status === 401 || response.status === 400) {
          setError("Email or password is incorrect. Check them and try again.");
        } else {
          setError(data.error || "Could not log in right now. Try again.");
        }
        setIsLoading(false);
        return;
      }

      const sessionData = {
        access_token: data.access_token,
        user: data.user
      };

      localStorage.setItem("emogita_session", JSON.stringify(sessionData));
      window.dispatchEvent(new Event("emogita_auth_change"));

      // Check if user has profile, otherwise to onboarding
      const userProfile = localStorage.getItem("userProfile");
      if (!userProfile) {
        navigate("/onboarding/profile", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError("Network connection issue. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Wordmark Above */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/logo_original.jpeg"
            alt=""
            style={{ width: "48px", height: "48px", borderRadius: "50%", marginBottom: "12px", border: "1px solid var(--line)" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>Welcome back</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Sign in to continue your reflections
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              disabled={isLoading}
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={isLoading}
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingRight: "48px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error-msg" role="alert" style={{ marginBottom: "20px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton
              type="submit"
              variant="primary"
              loading={isLoading}
              style={{ width: "100%" }}
            >
              Log in
            </PrimaryButton>
          </div>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
          New here?{" "}
          <Link to="/register" style={{ fontWeight: "500" }}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
