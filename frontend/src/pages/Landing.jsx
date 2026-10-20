import React from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

// Stylized peacock-feather motif SVG (eye with radiating barbs in peacock & marigold)
function PeacockFeatherDivider({ size = 64 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "40px 0" }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Outer feather shaft & vane curves */}
        <path d="M50 95 C50 65 30 35 50 5 C70 35 50 65 50 95" stroke="var(--peacock)" strokeWidth="1.5" strokeOpacity="0.4" />
        <path d="M50 95 C45 60 20 40 40 20" stroke="var(--peacock)" strokeWidth="1" strokeOpacity="0.3" />
        <path d="M50 95 C55 60 80 40 60 20" stroke="var(--peacock)" strokeWidth="1" strokeOpacity="0.3" />
        {/* Peacock eye outer */}
        <circle cx="50" cy="35" r="18" fill="var(--surface-raised)" stroke="var(--peacock)" strokeWidth="2" />
        {/* Peacock eye inner - marigold ring */}
        <circle cx="50" cy="35" r="11" fill="none" stroke="var(--marigold)" strokeWidth="2.5" />
        {/* Deep Yamuna pupil */}
        <circle cx="50" cy="35" r="5" fill="var(--peacock-strong)" />
      </svg>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <main id="main">
      {/* Hero Section */}
      <section className="page-container" style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "center", gap: "48px" }}>
          
          {/* Left / Top: Headline & Pitch */}
          <div>
            <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", fontWeight: "500", lineHeight: 1.15, marginBottom: "20px", letterSpacing: "-0.02em" }}>
              Say what's weighing on you.<br />
              Hear what the Gita says about it.
            </h1>

            <p style={{ fontSize: "1.125rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "480px" }}>
              EmoGita gently listens to your voice and your words, detects your emotional state, and offers grounded spiritual guidance from Krishna.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <PrimaryButton
                variant="primary"
                onClick={() => navigate("/voice")}
                style={{ fontSize: "1.0625rem", padding: "0 28px", height: "54px" }}
              >
                Start speaking
              </PrimaryButton>

              <a
                href="#how-it-works"
                style={{ color: "var(--text-muted)", fontSize: "0.9375rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                How it works ↓
              </a>
            </div>
          </div>

          {/* Right: Decorative breathing Listening Orb */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              className="orb-button orb-idle"
              style={{ cursor: "pointer", pointerEvents: "auto" }}
              onClick={() => navigate("/voice")}
              title="Click to start speaking"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span className="orb-label" style={{ fontSize: "1.125rem" }}>
                Tap to speak
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Characteristic Moment: Gita Verse 2.47 */}
      <section style={{ background: "var(--bg-deep)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "var(--space-12) var(--space-4)" }}>
        <div className="reading-column">
          <div className="verse-box" style={{ margin: 0 }}>
            <div className="verse-sanskrit" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
              कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।
            </div>
            <blockquote className="verse-english" style={{ fontSize: "1.25rem", margin: "16px 0 8px" }}>
              "You have a right to your actions, never to their fruits."
            </blockquote>
            <div className="verse-reference">
              Bhagavad Gita 2.47
            </div>
          </div>
        </div>
      </section>

      <PeacockFeatherDivider size={56} />

      {/* How it works Section (3 steps true sequence) */}
      <section id="how-it-works" className="page-container" style={{ paddingBottom: "var(--space-18)" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "12px" }}>How it works</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "500px", margin: "0 auto" }}>
            A calm, 3-step loop from expression to insight
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          
          <div className="panel">
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "var(--peacock)", marginBottom: "16px" }}>
              1
            </div>
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px" }}>Speak</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Share what is on your mind using the Listening Orb or type your thoughts freely without judgment.
            </p>
          </div>

          <div className="panel">
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "var(--peacock)", marginBottom: "16px" }}>
              2
            </div>
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px" }}>We listen to voice & words</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Our acoustic model analyzes voice inflection while language models interpret contextual meaning.
            </p>
          </div>

          <div className="panel">
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "var(--peacock)", marginBottom: "16px" }}>
              3
            </div>
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px" }}>You get a verse and guidance</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Discover timeless verses paired with thoughtful, compassionate advice and narrated reflections.
            </p>
          </div>

        </div>

        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.875rem", marginTop: "32px" }}>
          Note: EmoGita is an aid for contemplation, not a replacement for medical therapy or mental health care.
        </p>
      </section>

      {/* Footer */}
      <footer className="app-footer" role="contentinfo">
        <div className="footer-disclaimer">
          <p>
            EmoGita offers reflection inspired by the Bhagavad Gita. It is not medical advice or a substitute for professional care.
          </p>
          <p style={{ marginTop: "12px", fontSize: "0.8125rem", color: "var(--text-faint)" }}>
            © {new Date().getFullYear()} EmoGita — Night at the Yamuna
          </p>
        </div>
      </footer>
    </main>
  );
}
