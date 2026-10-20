import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profession, setProfession] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Check them and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          profession,
          description: description.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError("Too many attempts. Wait a minute and try again.");
        } else {
          setError(data.error || "Could not create account right now. Check your details.");
        }
        setIsLoading(false);
        return;
      }

      setSuccess("Account created successfully. Redirecting to login...");

      // Also save initial profile to localStorage
      if (profession) {
        localStorage.setItem("userProfile", JSON.stringify({
          profession_category: profession,
          work_description: description
        }));
      }

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError("Network connection issue. Check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Wordmark & Heading */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/logo_original.jpeg"
            alt=""
            style={{ width: "48px", height: "48px", borderRadius: "50%", marginBottom: "12px", border: "1px solid var(--line)" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>Create your account</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Begin your journey of mindful reflection
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email
            </label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password" className="form-label">
              Password (min. 8 characters)
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
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

          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              disabled={isLoading}
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-profession" className="form-label">
              What do you do? (optional)
            </label>
            <select
              id="reg-profession"
              value={profession}
              disabled={isLoading}
              onChange={(e) => setProfession(e.target.value)}
              className="form-select"
            >
              <option value="">Select your role</option>
              <option value="Student">Student</option>
              <option value="Working professional">Working professional</option>
              <option value="Homemaker">Homemaker</option>
              <option value="Self-employed">Self-employed</option>
              <option value="Retired">Retired</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reg-desc" className="form-label">
              Brief note about your daily life (optional)
            </label>
            <textarea
              id="reg-desc"
              rows={3}
              maxLength={500}
              disabled={isLoading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="e.g., Final year student preparing for exams..."
            />
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

          {success && (
            <div style={{ color: "var(--success)", fontSize: "0.875rem", marginBottom: "20px" }} role="status">
              {success}
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton
              type="submit"
              variant="primary"
              loading={isLoading}
              style={{ width: "100%" }}
            >
              Create account
            </PrimaryButton>
          </div>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: "500" }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
