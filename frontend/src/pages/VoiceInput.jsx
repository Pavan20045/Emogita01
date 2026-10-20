import React from "react";
import { useNavigate, Link } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";

export default function VoiceInput() {
  const navigate = useNavigate();

  const handleAudioReady = (blob) => {
    // Keep blob in memory/window for processing
    window.lastRecordedAudioBlob = blob;

    // Clear previous reflection transients (preserve session & profile!)
    localStorage.removeItem("voiceEmotion");
    localStorage.removeItem("textEmotion");
    localStorage.removeItem("transcribedText");
    localStorage.removeItem("finalEmotion");
    localStorage.removeItem("gitaResults");
    localStorage.removeItem("gitaExplanation");
    localStorage.removeItem("emotionRecordId");

    navigate("/processing", { state: { hasAudio: true } });
  };

  return (
    <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: "560px" }}>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", marginBottom: "8px" }}>
          How are you feeling today?
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", marginBottom: "24px" }}>
          Speak freely. Let Krishna's wisdom guide your heart.
        </p>

        {/* The Listening Orb */}
        <VoiceRecorder onAudioReady={handleAudioReady} />

        {/* Text alternative link */}
        <div style={{ marginTop: "24px" }}>
          <Link
            to="/text-emotion"
            style={{
              fontSize: "0.9375rem",
              color: "var(--text-muted)",
              textDecoration: "underline",
              textUnderlineOffset: "4px"
            }}
          >
            Prefer to type instead?
          </Link>
        </div>

        {/* Privacy note */}
        <p style={{ color: "var(--text-faint)", fontSize: "0.8125rem", marginTop: "32px", maxWidth: "420px", margin: "32px auto 0" }}>
          Your recording is used to understand how you feel and to write your advice.
        </p>
      </div>
    </main>
  );
}
