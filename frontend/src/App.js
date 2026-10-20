import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import VoiceInput from "./pages/VoiceInput";
import Processing from "./pages/Processing";
import EmotionResult from "./pages/EmotionResult";
import Guidance from "./pages/Guidance";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import TextEmotion from "./pages/TextEmotion";
import VoiceEmotionPage from "./pages/VoiceEmotionPage";

import Register from "./pages/Register";
import Login from "./pages/Login";
import ProfileOnboarding from "./pages/ProfileOnboarding";
import Dashboard from "./pages/Dashboard";

import "./styles/app.css";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem("emogita-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const checkSession = () => {
      const storedSession = localStorage.getItem("emogita_session");
      if (storedSession) {
        try {
          setSession(JSON.parse(storedSession));
        } catch (e) {
          localStorage.removeItem("emogita_session");
          setSession(null);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    checkSession();

    window.addEventListener("storage", checkSession);
    window.addEventListener("emogita_auth_change", checkSession);

    return () => {
      window.removeEventListener("storage", checkSession);
      window.removeEventListener("emogita_auth_change", checkSession);
    };
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar session={session} />

        <div className="main-content">
          <Routes>
            {/* Root Route */}
            <Route
              path="/"
              element={session ? <Navigate to="/dashboard" replace /> : <Landing />}
            />

            {/* Public & Functional Flow Routes */}
            <Route path="/text-emotion" element={<TextEmotion />} />
            <Route path="/voice-emotion" element={<VoiceEmotionPage />} />
            <Route path="/processing" element={<Processing />} />

            {/* Auth Routes */}
            <Route
              path="/register"
              element={!session ? <Register /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/login"
              element={!session ? <Login /> : <Navigate to="/dashboard" replace />}
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/voice"
              element={session ? <VoiceInput /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/emotion"
              element={session ? <EmotionResult session={session} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/guidance"
              element={session ? <Guidance session={session} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/onboarding/profile"
              element={session ? <ProfileOnboarding /> : <Navigate to="/login" replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
