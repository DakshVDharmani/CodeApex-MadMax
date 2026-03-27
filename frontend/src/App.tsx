import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/Auth/Authpage";   // ← unified auth page
import { Dashboard } from "./pages/Dashboard";
import { Misinfo } from "./pages/Misinfo";
import { Settings } from "./pages/Settings";
import YouTubeIngest from "./pages/YouTubeIngest";
import { AuthGuard } from "./components/AuthGuard";
import { AudioProvider } from './context/AudioContext';
import { useEffect } from "react";
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';

import { initExtensionBridge } from "./extensionBridge";

function App() {
  useEffect(() => {
    initExtensionBridge();
  }, []);

  useEffect(() => {
    window.addEventListener("message", (e) => {
      console.log("🌍 Website received message:", e.data);
    });
  }, []);

  return (
    <AudioProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Unified auth — login + signup in one page */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Legacy redirects so old /login and /signup links still work */}
          <Route path="/login"  element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          {/* Protected app */}
          <Route
            path="/home"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="deepfake" element={<Dashboard />} />
            <Route path="misinfo"  element={<Misinfo />} />
            <Route path="youtube" element={<YouTubeIngest />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AudioProvider>
  );
}

export default App;