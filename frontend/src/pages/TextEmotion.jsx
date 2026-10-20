import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

export default function TextEmotion() {
  const navigate = useNavigate();
  const initialText = localStorage.getItem("transcribedText") || "";
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    if (!text.trim()) {
      setError("Please write a few words about what you are experiencing.");
      return;
    }

    localStorage.setItem("directInputText", text.trim());
    localStorage.setItem("transcribedText", text.trim());
    navigate("/processing", { state: { directText: text.trim() } });
  };

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="reading-column" style={{ maxWidth: "600px" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>
          {initialText ? "Review what we heard" : "Express yourself in words"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "28px" }}>
          {initialText
            ? "What we heard. Fix anything that's wrong before finding guidance."
            : "Write about what is weighing on you or what you are feeling right now."}
        </p>

        <div className="form-group">
          <label htmlFor="text-input-field" className="form-label" style={{ fontWeight: "600" }}>
            Your thoughts
          </label>
          <textarea
            id="text-input-field"
            rows={7}
            maxLength={1000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            placeholder="I have been feeling overwhelmed by choices and duties, and I am not sure which direction to take..."
            className="form-textarea"
            style={{ fontSize: "1.0625rem", lineHeight: 1.7 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            {error ? (
              <span className="form-error-msg" role="alert">
                {error}
              </span>
            ) : <span />}
            <span className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>
              {text.length}/1000
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <PrimaryButton
            variant="secondary"
            onClick={() => navigate("/voice")}
          >
            Voice recorder
          </PrimaryButton>
          <PrimaryButton
            variant="primary"
            onClick={handleAnalyze}
            style={{ flex: 1 }}
          >
            Analyze words
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
