import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import AudioPlayer from "../components/AudioPlayer";
import PrimaryButton from "../components/PrimaryButton";
import { emotionMeta } from "../utils/emotion";

const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";

export default function Guidance({ session }) {
  const navigate = useNavigate();
  const [verses, setVerses] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [consecutiveNegative, setConsecutiveNegative] = useState(0);

  const finalEmoRaw = localStorage.getItem("finalEmotion");
  const emotionKey = finalEmoRaw ? JSON.parse(finalEmoRaw)?.final_emotion : "neutral";
  const meta = emotionMeta(emotionKey);

  useEffect(() => {
    const storedVerses = localStorage.getItem("gitaResults");
    const storedExplanation = localStorage.getItem("gitaExplanation");

    if (storedVerses) {
      try {
        setVerses(JSON.parse(storedVerses));
      } catch (e) {
        console.error("Failed to parse verses", e);
      }
    }

    if (storedExplanation) {
      setExplanation(storedExplanation);
    }

    // Fetch wellbeing analytics if logged in
    if (session?.access_token) {
      fetch(`${API_BASE}/emotion-analytics`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.streak?.consecutive_negative) {
            setConsecutiveNegative(data.streak.consecutive_negative);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Request audio URL from backend TTS when explanation is loaded
  useEffect(() => {
    if (!explanation) return;

    let isMounted = true;
    setIsAudioLoading(true);

    const recordId = localStorage.getItem("emotionRecordId");

    fetch(`${API_BASE}/tts-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({
        text: explanation.substring(0, 800), // excerpt for concise listening
        emotion: emotionKey,
        record_id: recordId ? parseInt(recordId, 10) : null
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("TTS generation unavailable");
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.audio_url) {
          const fullAudio = data.audio_url.startsWith("http")
            ? data.audio_url
            : `${API_BASE}${data.audio_url}`;
          setAudioUrl(fullAudio);
        }
      })
      .catch((err) => {
        console.log("Audio reflection audio not generated:", err.message);
      })
      .finally(() => {
        if (isMounted) setIsAudioLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [explanation, emotionKey, session]);

  const handleSaveToHistory = () => {
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
    }, 4000);
  };

  const primaryVerse = verses.length > 0 ? verses[0] : null;
  const secondaryVerses = verses.slice(1);

  if (!primaryVerse && !explanation) {
    return (
      <main id="main" className="page-container" style={{ minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="panel" style={{ textAlign: "center", maxWidth: "460px" }}>
          <h2>No reflections found</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", marginBottom: "20px" }}>
            Speak or type your thoughts to hear what the Gita says about it.
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
        {/* Emotion Header Tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "6px 14px", borderRadius: "var(--r-full)", background: "var(--surface)", border: "1px solid var(--line)" }}>
            <span style={{ color: meta.color }}>
              {meta.renderIcon({ size: 18, color: meta.color })}
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text)" }}>
              You sound {meta.label.toLowerCase()}
            </span>
          </div>

          <Link
            to="/voice"
            style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}
          >
            New reflection ↻
          </Link>
        </div>

        {/* Primary Verse Block with 3px Marigold Left Rule */}
        {primaryVerse && (
          <section className="verse-box" aria-label="Selected Gita Verse">
            {primaryVerse.sanskrit && (
              <div className="verse-sanskrit">
                {primaryVerse.sanskrit}
              </div>
            )}
            <blockquote className="verse-english">
              "{primaryVerse.text || primaryVerse.translation}"
            </blockquote>
            <div className="verse-reference">
              Bhagavad Gita {primaryVerse.chapter}.{primaryVerse.verse}
            </div>
          </section>
        )}

        {/* Audio Player (Custom 56px button, seekbar, time, speed toggle) */}
        <div style={{ margin: "32px 0" }}>
          <AudioPlayer src={audioUrl} loading={isAudioLoading} />
        </div>

        {/* Advice Text Formatted with Markdown */}
        {explanation && (
          <article className="guidance-markdown" aria-label="Spiritual guidance reflection">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </article>
        )}

        {/* Expandable "More verses that came up" */}
        {secondaryVerses.length > 0 && (
          <section style={{ marginTop: "48px" }} aria-label="Additional Gita verses">
            <h2 style={{ fontSize: "1.125rem", marginBottom: "16px", color: "var(--text)" }}>
              More verses that came up ({secondaryVerses.length})
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {secondaryVerses.map((v, idx) => (
                <details
                  key={idx}
                  className="panel"
                  style={{ padding: "16px 20px", cursor: "pointer" }}
                >
                  <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "600", fontSize: "0.9375rem", color: "var(--text)", outline: "none" }}>
                    <span>Bhagavad Gita {v.chapter}.{v.verse}</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Read verse ▾</span>
                  </summary>
                  <div style={{ marginTop: "14px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                    {v.sanskrit && (
                      <p style={{ fontFamily: "var(--font-sanskrit)", fontSize: "1.25rem", lineHeight: 1.8, marginBottom: "8px" }}>
                        {v.sanskrit}
                      </p>
                    )}
                    <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--text-muted)", lineHeight: 1.7 }}>
                      "{v.text || v.translation}"
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Wellbeing Guard Panel (if negative streak >= 5) */}
        {consecutiveNegative >= 5 && (
          <section className="panel" style={{ marginTop: "48px", borderLeft: "3px solid var(--lotus)", background: "var(--surface-raised)" }} aria-label="Wellbeing support notice">
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px" }}>A gentle note for you</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "16px" }}>
              You've had a heavy few days. Talking to someone you trust can help, and so can a professional.
            </p>
            <Link to="/support" className="btn btn-secondary" style={{ height: "42px", padding: "0 18px", fontSize: "0.875rem" }}>
              Find support
            </Link>
          </section>
        )}

        {/* Bottom Actions */}
        <div style={{ display: "flex", gap: "16px", marginTop: "48px", flexWrap: "wrap", alignItems: "center" }}>
          <PrimaryButton
            variant="primary"
            onClick={handleSaveToHistory}
          >
            Save to my history
          </PrimaryButton>

          <Link to="/voice" style={{ textDecoration: "none" }}>
            <PrimaryButton variant="secondary">
              New reflection
            </PrimaryButton>
          </Link>
        </div>

        {/* Toast confirmation */}
        {isSavedToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              bottom: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--peacock)",
              color: "var(--bg-deep)",
              padding: "12px 24px",
              borderRadius: "var(--r-full)",
              fontWeight: "600",
              boxShadow: "var(--shadow-2)",
              zIndex: 1000
            }}
          >
            Saved to your history
          </div>
        )}

        {/* Gentle disclaimer note */}
        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", lineHeight: 1.6 }}>
            Gentle note: EmoGita offers reflection inspired by the Bhagavad Gita, not medical or professional care.
          </p>
        </div>
      </div>
    </main>
  );
}
