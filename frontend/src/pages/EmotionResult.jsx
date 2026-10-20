import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { emotionMeta, ORDERED_EMOTIONS } from "../utils/emotion";

const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";

export default function EmotionResult({ session }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showOverrideSheet, setShowOverrideSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const voice = JSON.parse(localStorage.getItem("voiceEmotion") || "null");
  const text = JSON.parse(localStorage.getItem("textEmotion") || "null");
  const initialFinal = JSON.parse(localStorage.getItem("finalEmotion") || "null");
  const [finalResult, setFinalResult] = useState(initialFinal);

  if (!finalResult || !finalResult.final_emotion) {
    return (
      <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="panel" style={{ textAlign: "center", maxWidth: "440px" }}>
          <h2>No emotion analysis found</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", marginBottom: "20px" }}>
            Express your thoughts first to receive guidance from the Gita.
          </p>
          <PrimaryButton variant="primary" onClick={() => navigate("/voice")}>
            Start speaking
          </PrimaryButton>
        </div>
      </main>
    );
  }

  const currentEmotionKey = finalResult.final_emotion.toLowerCase();
  const meta = emotionMeta(currentEmotionKey);

  async function storeEmotion(adviceSummary, emotionUsed) {
    if (!session) return;
    const transcribedText = localStorage.getItem("transcribedText") || "Personal reflection";
    try {
      const res = await fetch(`${API_BASE}/store-emotion`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcribedText,
          advice_summary: adviceSummary,
          final_emotion: emotionUsed,
          emotion_probabilities: finalResult.fused_probabilities || finalResult.probabilities || {}
        })
      });
      const data = await res.json();
      if (data.id) {
        localStorage.setItem("emotionRecordId", String(data.id));
      }
    } catch (err) {
      console.error("Emotion store error:", err);
    }
  }

  async function handleGetGuidance(chosenEmotion = null) {
    const emotionToUse = chosenEmotion || finalResult.final_emotion;
    const transcribedText = localStorage.getItem("transcribedText") || "Personal contemplation";

    try {
      setIsLoading(true);
      setErrorMessage("");

      // 1. Fetch relevant verses from Qdrant via RAG
      const ragResponse = await fetch(`${API_BASE}/rag-gita`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: transcribedText,
          emotion: emotionToUse
        })
      });

      if (!ragResponse.ok) {
        throw new Error("Could not retrieve Gita verses");
      }

      const ragData = await ragResponse.json();
      localStorage.setItem("gitaResults", JSON.stringify(ragData.results || []));

      // 2. Fetch Gemini RAG explanation
      const explainResponse = await fetch(`${API_BASE}/rag-gita-explain`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: transcribedText,
          emotion: emotionToUse,
          verses: ragData.results || [],
          past_context: ragData.past_context || ""
        })
      });

      if (!explainResponse.ok) {
        throw new Error("Could not generate advice explanation");
      }

      const explainData = await explainResponse.json();
      localStorage.setItem("gitaExplanation", explainData.explanation || "");

      // 3. Store reflection asynchronously
      await storeEmotion(explainData.explanation || "", emotionToUse);

      navigate("/guidance");
    } catch (err) {
      console.error("RAG flow error:", err);
      setErrorMessage("Could not connect to the guidance system. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectOverride = (emotionKey) => {
    const updated = {
      ...finalResult,
      final_emotion: emotionKey
    };
    setFinalResult(updated);
    localStorage.setItem("finalEmotion", JSON.stringify(updated));
    setShowOverrideSheet(false);
  };

  // Probabilities breakdown (supports both Array of 7 scores and Object key-value map)
  const probabilities = finalResult.probabilities || finalResult.fused_probabilities || [];
  const LABEL_INDEX_MAP = {
    angry: 0,
    disgust: 1,
    fear: 2,
    happiness: 3,
    neutral: 4,
    confidence: 5,
    sadness: 6
  };
  const sortedProbabilities = ORDERED_EMOTIONS.map((key) => {
    let val = 0;
    if (Array.isArray(probabilities)) {
      val = probabilities[LABEL_INDEX_MAP[key.toLowerCase()]] ?? 0;
    } else if (typeof probabilities === "object" && probabilities !== null) {
      val = probabilities[key] || probabilities[key.toLowerCase()] || 0;
    }
    const itemMeta = emotionMeta(key);
    return {
      key,
      label: itemMeta.label,
      color: itemMeta.color,
      pct: Math.round(val * 100),
      renderIcon: itemMeta.renderIcon
    };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div className="reading-column" style={{ maxWidth: "560px", textAlign: "center" }}>
        
        {/* Top: The Listening Orb, static and filled with dominant emotion color */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "128px",
              height: "128px",
              borderRadius: "50%",
              backgroundColor: meta.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 32px ${meta.color}44`,
              color: "#07202A",
              transition: "background-color 0.4s var(--ease-calm)"
            }}
            aria-hidden="true"
          >
            {meta.renderIcon({ size: 56, color: "#07202A" })}
          </div>
        </div>

        {/* H1: Plain sentence in one style */}
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", marginBottom: "8px" }}>
          You sound {meta.label.toLowerCase()}.
        </h1>

        {/* One-sentence plain description */}
        <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem", lineHeight: 1.6, marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px" }}>
          {meta.description}
        </p>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "400px", margin: "0 auto 32px" }}>
          <PrimaryButton
            variant="primary"
            onClick={() => handleGetGuidance()}
            loading={isLoading}
            style={{ width: "100%" }}
          >
            Get guidance
          </PrimaryButton>

          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setShowOverrideSheet(true)}
            style={{ fontSize: "0.9375rem" }}
          >
            That's not right
          </button>
        </div>

        {errorMessage && (
          <div className="form-error-msg" role="alert" style={{ justifyContent: "center", marginBottom: "20px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* "How we got here" Panel (Collapsed by default per Section 5.6) */}
        <div className="panel" style={{ textAlign: "left", marginTop: "16px" }}>
          <details style={{ cursor: "pointer" }}>
            <summary style={{ fontWeight: "600", fontSize: "0.9375rem", color: "var(--text)", outline: "none", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>How we got here</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Details ▾</span>
            </summary>

            <div style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
              {/* Signal weights */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "var(--surface-raised)", padding: "12px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Your voice (80%)</div>
                  <div style={{ fontWeight: "600", fontSize: "1rem", color: "var(--text)", marginTop: "4px", textTransform: "capitalize" }}>
                    {voice?.emotion || "Neutral"}
                  </div>
                </div>

                <div style={{ background: "var(--surface-raised)", padding: "12px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Your words (20%)</div>
                  <div style={{ fontWeight: "600", fontSize: "1rem", color: "var(--text)", marginTop: "4px", textTransform: "capitalize" }}>
                    {text?.emotion || "Neutral"}
                  </div>
                </div>
              </div>

              {/* Fused Probability Bars */}
              <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "12px", color: "var(--text)" }}>
                Fused emotion distribution
              </div>
              <div className="emotion-bars-container" style={{ marginTop: 0 }}>
                {sortedProbabilities.map((item) => (
                  <div key={item.key} className="emotion-bar-row">
                    <div className="emotion-bar-label">
                      {item.renderIcon({ size: 16, color: item.key === currentEmotionKey ? item.color : "var(--text-faint)" })}
                      <span>{item.label}</span>
                    </div>
                    <div className="emotion-bar-track">
                      <div
                        className="emotion-bar-fill"
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: item.key === currentEmotionKey ? item.color : "var(--line)"
                        }}
                      />
                    </div>
                    <div className="emotion-bar-pct tabular-nums">{item.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>

      </div>

      {/* Manual Override Bottom Sheet / Modal */}
      {showOverrideSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-heading"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(3, 18, 24, 0.75)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowOverrideSheet(false)}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "540px",
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              padding: "24px 24px 36px",
              boxShadow: "var(--shadow-2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 id="override-heading" style={{ fontSize: "1.25rem", margin: 0 }}>
                What best describes how you feel?
              </h2>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setShowOverrideSheet(false)}
                aria-label="Close selection"
                style={{ padding: "4px 8px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "20px" }}>
              Choose the emotion that matches your inner state. We will adapt the Gita's guidance to it.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ORDERED_EMOTIONS.map((key) => {
                const itemMeta = emotionMeta(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectOverride(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 16px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "0.9375rem"
                    }}
                  >
                    <span style={{ color: itemMeta.color }}>
                      {itemMeta.renderIcon({ size: 22, color: itemMeta.color })}
                    </span>
                    <span style={{ fontWeight: "500", flex: 1 }}>{itemMeta.label}</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{itemMeta.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
