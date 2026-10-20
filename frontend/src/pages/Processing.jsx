import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import {
  sendAudioForVoiceEmotion,
  speechToText,
  textEmotion,
  fuseEmotion,
} from "../services/api";

const STAGES = [
  { id: 1, label: "Listening to your voice" },
  { id: 2, label: "Reading your words" },
  { id: 3, label: "Synthesizing your feelings" }
];

export default function Processing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStage, setCurrentStage] = useState(1);
  const [isSlow, setIsSlow] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isRunningRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsError(false);
    setIsSlow(false);
    setCurrentStage(1);

    const audioBlob = window.lastRecordedAudioBlob;
    const directText = location.state?.directText || localStorage.getItem("directInputText");

    // Timer for slow notice (12s) and timeout error (45s)
    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 12000);

    const timeoutTimer = setTimeout(() => {
      setIsError(true);
      setErrorMessage("The analysis timed out. The server might be waking up.");
    }, 45000);

    try {
      if (audioBlob) {
        // --- STAGE 1: Listening to your voice ---
        setCurrentStage(1);

        // Helper with 1 silent retry
        const fetchWithRetry = async (fn, arg) => {
          try {
            return await fn(arg);
          } catch (firstErr) {
            console.warn("First attempt failed, retrying once silently:", firstErr);
            return await fn(arg);
          }
        };

        const [voiceRes, sttRes] = await Promise.all([
          fetchWithRetry(sendAudioForVoiceEmotion, audioBlob),
          fetchWithRetry(speechToText, audioBlob)
        ]);

        localStorage.setItem("voiceEmotion", JSON.stringify(voiceRes));
        localStorage.setItem("transcribedText", sttRes.text || "");

        // --- STAGE 2: Reading your words ---
        setCurrentStage(2);
        const textVal = sttRes.text && sttRes.text.trim().length > 0 ? sttRes.text : "peaceful";
        const textRes = await fetchWithRetry(textEmotion, textVal);
        localStorage.setItem("textEmotion", JSON.stringify(textRes));

        // --- STAGE 3: Synthesizing feelings ---
        setCurrentStage(3);
        const fusedRes = await fetchWithRetry(() => fuseEmotion(voiceRes, textRes));
        localStorage.setItem("finalEmotion", JSON.stringify(fusedRes));

        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);

        // Brief calm delay so the user perceives completion
        setTimeout(() => {
          navigate("/emotion");
        }, 500);

      } else if (directText) {
        // Text-only input flow
        setCurrentStage(2);
        const textRes = await textEmotion(directText);
        localStorage.setItem("transcribedText", directText);
        localStorage.setItem("textEmotion", JSON.stringify(textRes));

        // Create fallback neutral voice signal for balanced fusion
        const voiceFallback = {
          emotion: "neutral",
          probabilities: [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0]
        };
        localStorage.setItem("voiceEmotion", JSON.stringify(voiceFallback));

        setCurrentStage(3);
        const fusedRes = await fuseEmotion(voiceFallback, textRes);
        localStorage.setItem("finalEmotion", JSON.stringify(fusedRes));

        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);

        setTimeout(() => {
          navigate("/emotion");
        }, 500);
      } else {
        // Check if results already in localStorage
        const existing = localStorage.getItem("finalEmotion");
        if (existing) {
          clearTimeout(slowTimer);
          clearTimeout(timeoutTimer);
          navigate("/emotion");
          return;
        }

        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);
        navigate("/voice");
      }
    } catch (err) {
      console.error("Processing pipeline error:", err);
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      setIsError(true);
      setErrorMessage("Could not complete analysis right now. Please try again.");
    } finally {
      isRunningRef.current = false;
    }
  }, [location.state, navigate]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  if (isError) {
    return (
      <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="panel" style={{ maxWidth: "460px", textAlign: "center", padding: "36px var(--space-6)" }}>
          <div style={{ color: "var(--danger)", marginBottom: "16px" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.375rem", marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "28px" }}>
            {errorMessage}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <PrimaryButton variant="secondary" onClick={() => navigate("/voice")}>
              Go back
            </PrimaryButton>
            <PrimaryButton variant="primary" onClick={runAnalysis}>
              Try again
            </PrimaryButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="loader-screen" role="status" aria-live="polite">
      {/* Calm Rotating Ring */}
      <div
        className="loader-ring"
        style={{ width: "72px", height: "72px", borderWidth: "3px", marginBottom: "32px" }}
        aria-hidden="true"
      />

      <h1 style={{ fontSize: "1.75rem", marginBottom: "12px" }}>
        Understanding your reflection
      </h1>

      <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", maxWidth: "420px", marginBottom: "36px" }}>
        Listening to both your tone and your words to understand how you truly feel.
      </p>

      {/* Honest Stage Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", width: "100%", maxWidth: "320px" }}>
        {STAGES.map((stage) => {
          const isDone = currentStage > stage.id;
          const isCurrent = currentStage === stage.id;

          return (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                color: isDone ? "var(--text)" : isCurrent ? "var(--peacock)" : "var(--text-faint)",
                fontWeight: isCurrent ? "600" : "400",
                fontSize: "0.9375rem"
              }}
            >
              {/* Status indicator */}
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${isDone ? "var(--peacock)" : isCurrent ? "var(--peacock)" : "var(--line)"}`,
                  backgroundColor: isDone ? "var(--peacock)" : "transparent",
                  color: isDone ? "var(--bg-deep)" : "currentColor",
                  flexShrink: 0
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isCurrent ? (
                  <span
                    className="loader-ring"
                    style={{ width: "12px", height: "12px", borderWidth: "2px" }}
                    aria-hidden="true"
                  />
                ) : (
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--line)" }} />
                )}
              </span>

              <span>{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Slow backend reassurance text (> 12s) */}
      {isSlow && (
        <p style={{ color: "var(--marigold)", fontSize: "0.875rem", marginTop: "32px", animation: "fadeIn 0.3s" }}>
          This is taking a little longer than usual. Hang tight.
        </p>
      )}
    </main>
  );
}
