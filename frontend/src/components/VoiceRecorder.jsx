import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "./PrimaryButton";

export default function VoiceRecorder({ onAudioReady }) {
  // states: 'idle' | 'permission_prompt' | 'requesting' | 'recording' | 'review' | 'error'
  const [state, setState] = useState("idle");
  const [timer, setTimer] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = (canvas.width / 2) - 12;

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#E0574A"; // flame/recording color

      for (let i = 0; i < bufferLength; i += 2) {
        const v = dataArray[i] / 128.0; // 0 to 2
        const angle = (i / bufferLength) * 2 * Math.PI;
        const offset = (v - 1.0) * 18; // wave deflection
        const r = radius + offset;

        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.stroke();
    };

    render();
  };

  const handleOrbClick = () => {
    if (state === "recording") {
      stopRecording();
      return;
    }

    if (state === "idle" || state === "error") {
      const acknowledged = localStorage.getItem("emogita-mic-ack");
      if (!acknowledged) {
        setState("permission_prompt");
      } else {
        startRecordingFlow();
      }
    }
  };

  const confirmMicAck = () => {
    localStorage.setItem("emogita-mic-ack", "true");
    startRecordingFlow();
  };

  const startRecordingFlow = async () => {
    setErrorMsg("");
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio Analyser for the live circular waveform
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (audioErr) {
        console.warn("Web Audio API not fully supported:", audioErr);
      }

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationSec = (Date.now() - startTimeRef.current) / 1000;

        if (durationSec < 2.0) {
          setErrorMsg("Recording was too short. Speak for at least 2 seconds.");
          setState("error");
          return;
        }

        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("review");
      };

      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setTimer(0);
      setState("recording");

      // Draw waveform
      setTimeout(() => {
        drawWaveform();
      }, 50);

      // Start timer
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev >= 119) {
            // Soft cap at 120s
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Microphone access was denied. Please allow microphone permission in your browser.");
      } else {
        setErrorMsg("Could not access a microphone. Please check your audio inputs.");
      }
      setState("error");
    }
  };

  const stopRecording = () => {
    clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const handleUseRecording = () => {
    if (recordedBlob && onAudioReady) {
      onAudioReady(recordedBlob);
    }
  };

  const handleRecordAgain = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl(null);
    setState("idle");
    setTimer(0);
    setErrorMsg("");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecordedBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setState("review");
  };

  // Format timer into mm:ss
  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="orb-container" role="region" aria-label="Voice recorder">
      {/* Polite Live Region for status changes */}
      <div className="sr-only" aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {state === "recording" && `Recording in progress, ${formatTimer(timer)}`}
        {state === "review" && "Recording complete. Review your audio or record again."}
        {state === "error" && errorMsg}
      </div>

      {/* One-time Privacy Acknowledgement Dialog */}
      {state === "permission_prompt" && (
        <div className="panel" style={{ maxWidth: "460px", marginBottom: "24px", textAlign: "left" }} role="dialog" aria-labelledby="ack-heading">
          <h2 id="ack-heading" style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
            Before you speak
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "20px" }}>
            We'll use your microphone to hear how you feel. Your recording is processed to understand your emotion and write your personalized advice from the Bhagavad Gita.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <PrimaryButton variant="quiet" onClick={() => setState("idle")}>
              Not now
            </PrimaryButton>
            <PrimaryButton variant="primary" onClick={confirmMicAck}>
              Allow and continue
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* The Listening Orb */}
      {state !== "review" && (
        <div style={{ position: "relative", display: "inline-block" }}>
          {state === "recording" && (
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="orb-waveform-canvas"
              aria-hidden="true"
            />
          )}

          <button
            type="button"
            onClick={handleOrbClick}
            disabled={state === "requesting"}
            aria-pressed={state === "recording"}
            aria-label={
              state === "recording"
                ? "Stop recording"
                : state === "requesting"
                ? "Allow microphone access in your browser"
                : "Tap to speak"
            }
            className={`orb-button ${
              state === "recording" ? "orb-recording" : state === "idle" ? "orb-idle" : "orb-dimmed"
            }`}
          >
            {state === "recording" ? (
              // Stop square icon
              <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : state === "requesting" ? (
              <span className="loader-ring" style={{ width: "36px", height: "36px" }} aria-hidden="true" />
            ) : (
              // Microphone icon
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}

            <span className="orb-label">
              {state === "recording"
                ? "Listening..."
                : state === "requesting"
                ? "Allow microphone"
                : "Tap to speak"}
            </span>
          </button>
        </div>
      )}

      {/* State Feedback & Timers */}
      {state === "idle" && (
        <p className="orb-hint">
          Tell me what's on your mind. Take as long as you need.
        </p>
      )}

      {state === "requesting" && (
        <p className="orb-hint">
          Allow microphone access in your browser to begin.
        </p>
      )}

      {state === "recording" && (
        <div style={{ marginTop: "16px" }}>
          <div className="orb-timer tabular-nums">{formatTimer(timer)}</div>
          {timer >= 60 && timer < 120 && (
            <p style={{ color: "var(--marigold)", fontSize: "0.875rem", marginTop: "4px" }}>
              One more minute
            </p>
          )}
          <div style={{ marginTop: "20px" }}>
            <PrimaryButton variant="danger" onClick={stopRecording}>
              Stop recording
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Review State */}
      {state === "review" && (
        <div className="panel" style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "16px" }}>
            Review your reflection
          </h2>

          {audioUrl && (
            <audio
              controls
              src={audioUrl}
              style={{ width: "100%", marginBottom: "24px", outline: "none" }}
            />
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryButton variant="secondary" onClick={handleRecordAgain}>
              Record again
            </PrimaryButton>
            <PrimaryButton variant="primary" onClick={handleUseRecording}>
              Use this recording
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="panel" style={{ maxWidth: "460px", marginTop: "20px", borderLeft: "3px solid var(--danger)", textAlign: "left" }}>
          <p style={{ color: "var(--danger)", fontWeight: "500", marginBottom: "8px" }}>
            {errorMsg}
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
            <PrimaryButton variant="secondary" onClick={() => setState("idle")}>
              Try again
            </PrimaryButton>
            <Link to="/text-emotion" style={{ fontSize: "0.9375rem" }}>
              Prefer to type instead?
            </Link>
          </div>
        </div>
      )}

      {/* File upload option */}
      {state === "idle" && (
        <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <label className="btn btn-quiet" style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--text-faint)" }}>
            Or upload an audio file
            <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
          </label>
        </div>
      )}
    </div>
  );
}
