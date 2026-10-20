import React from "react";
import { useNavigate } from "react-router-dom";
import EmotionCard from "../components/EmotionCard";
import PrimaryButton from "../components/PrimaryButton";

export default function VoiceEmotionPage() {
  const navigate = useNavigate();
  const voiceRaw = localStorage.getItem("voiceEmotion");
  const voiceData = voiceRaw ? JSON.parse(voiceRaw) : null;

  if (!voiceData) {
    return (
      <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="panel" style={{ textAlign: "center", maxWidth: "420px" }}>
          <h2>No voice analysis available</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", marginBottom: "20px" }}>
            Record your voice first to see the emotional tone analysis.
          </p>
          <PrimaryButton variant="primary" onClick={() => navigate("/voice")}>
            Start speaking
          </PrimaryButton>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="page-container">
      <div className="reading-column">
        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>
          Voice Tone Analysis
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "28px" }}>
          How your tone of voice sounded to the acoustic emotion model.
        </p>

        <EmotionCard
          emotion={voiceData.emotion}
          probabilities={voiceData.probabilities || {}}
          title="Voice Signal"
          subtitle="Acoustic pattern extracted from speech rhythm and pitch"
        />

        <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
          <PrimaryButton
            variant="primary"
            onClick={() => navigate("/emotion")}
          >
            Continue to fused result
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
