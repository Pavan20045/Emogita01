import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

const ROLES = [
  "Student",
  "Working professional",
  "Homemaker",
  "Self-employed",
  "Retired",
  "Other"
];

export default function ProfileOnboarding() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("Working professional");
  const [description, setDescription] = useState("");

  const handleContinue = () => {
    const profile = {
      profession_category: selectedRole,
      work_description: description.trim()
    };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    navigate("/voice");
  };

  const handleSkip = () => {
    const profile = {
      profession_category: selectedRole || "Other",
      work_description: ""
    };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    navigate("/voice");
  };

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="reading-column" style={{ maxWidth: "540px" }}>
        {/* Sequence Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }} aria-label="Step 1 of 2">
          <span style={{ height: "4px", flex: 1, backgroundColor: "var(--peacock)", borderRadius: "var(--r-full)" }} />
          <span style={{ height: "4px", flex: 1, backgroundColor: description ? "var(--peacock)" : "var(--line)", borderRadius: "var(--r-full)", transition: "background-color 0.3s" }} />
        </div>

        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>
          Tell us a little about your day
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "32px", lineHeight: 1.6 }}>
          This helps the advice fit your life. You can change it later.
        </p>

        {/* Step 1: Choice Chips */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{ display: "block", fontSize: "1rem", fontWeight: "600", marginBottom: "16px", color: "var(--text)" }}>
            What do you do?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }} role="radiogroup" aria-label="Profession category">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "var(--r-full)",
                    border: `1px solid ${isSelected ? "var(--peacock)" : "var(--line)"}`,
                    backgroundColor: isSelected ? "var(--surface-raised)" : "transparent",
                    color: isSelected ? "var(--peacock)" : "var(--text)",
                    fontWeight: isSelected ? "600" : "400",
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.15s var(--ease-calm)"
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: About your day */}
        <div className="form-group" style={{ marginBottom: "32px" }}>
          <label htmlFor="onboarding-day" className="form-label" style={{ fontWeight: "600" }}>
            A little about your routine or focus (optional)
          </label>
          <textarea
            id="onboarding-day"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            placeholder="e.g., Working on tight deadlines, managing team pressure, or balancing study with work..."
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <span className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>
              {description.length}/500
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <PrimaryButton
            variant="primary"
            onClick={handleContinue}
            style={{ flex: 1 }}
          >
            Continue
          </PrimaryButton>
          <PrimaryButton
            variant="quiet"
            onClick={handleSkip}
          >
            Skip for now
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
