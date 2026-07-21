"use client";

import React, { useState, useRef } from "react";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoPoster, setVideoPoster] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const videoRef = useRef(null);

  const handleVideoLoaded = (e) => {
    const video = e.target;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setVideoPoster(dataUrl);
    } catch (err) {
      console.warn("Could not capture first frame client-side:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Save session role and notify parent
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role);
      onSuccess(data.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      width: "100vw",
      backgroundColor: "#0d0f12",
      color: "#f3f4f6",
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      overflow: "hidden"
    }}>
      {/* Google Font Outfit Loader */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
      `}} />

      {/* Left Column: Login Form (40% width, Premium Dark Theme) */}
      <div style={{
        flex: "0 0 40%",
        width: "40%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4rem",
        background: "linear-gradient(135deg, #11141a 0%, #0d0f12 100%)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        boxShadow: "10px 0 30px rgba(0, 0, 0, 0.3)",
        zIndex: 10
      }}>
        <div style={{ width: "100%", maxWidth: "380px", margin: "0 auto" }}>
          {/* Logo / Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", marginBottom: "3rem" }}>
            <img src="/logo.png" alt="LifeLine Logo" style={{ height: "60px", width: "auto" }} />
            <h1 style={{ 
              margin: 0, 
              fontSize: "2.4rem", 
              fontWeight: 900, 
              letterSpacing: "-0.04em", 
              color: "white",
              fontFamily: "'Outfit', sans-serif"
            }}>
              LifeLine
            </h1>
          </div>

          <h2 style={{ 
            fontSize: "2.1rem", 
            fontWeight: 800, 
            marginBottom: "0.6rem", 
            color: "white", 
            letterSpacing: "-0.02em",
            fontFamily: "'Outfit', sans-serif" 
          }}>
            Welcome Back
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: "2.5rem", lineHeight: "1.5" }}>
            Enter your administrator credentials to access the tracking dashboard.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            {error && (
              <div style={{
                padding: "0.85rem 1.1rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "10px",
                color: "#f87171",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.02)"
              }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#9ca3af" }}>
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                style={{
                  width: "100%",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "10px",
                  background: "#161b22",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#9ca3af" }}>
                Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "0.85rem 3rem 0.85rem 1.1rem",
                    borderRadius: "10px",
                    background: "#161b22",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "white",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    background: "transparent",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    outline: "none"
                  }}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="animated-btn"
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "10px",
                backgroundColor: "#d15c2e",
                color: "white",
                fontWeight: 700,
                fontSize: "0.95rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.6rem",
                marginTop: "0.6rem",
                outline: "none",
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Verifying Session...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          <footer style={{ marginTop: "4.5rem", fontSize: "0.78rem", color: "#4b5563", textAlign: "center" }}>
            LifeLine Systems &copy; {new Date().getFullYear()}. Secure administrator access.
          </footer>
        </div>
      </div>

      {/* Right Column: Logo Animation Video (60% width, no text overlays) */}
      <div style={{
        flex: "0 0 60%",
        width: "60%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        overflow: "hidden"
      }}>
        {/* Background Animation Video scaled up for prominence */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <video
            ref={videoRef}
            src="/logo-animation.mp4"
            poster={videoPoster || undefined}
            onLoadedData={handleVideoLoaded}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: "scale(1.35)", // Scale up to make the logo and name extremely prominent
              filter: "contrast(1.08) brightness(1.08)", // Slight enhancement filter
              transformOrigin: "center center"
            }}
          />
        </div>
      </div>

      {/* Input Focus & Animated Button Styles */}
      <style jsx global>{`
        input:focus {
          border-color: #d15c2e !important;
          box-shadow: 0 0 0 3px rgba(209, 92, 46, 0.15) !important;
          background-color: #1c212a !important;
        }
        
        /* Premium Micro-Animated Sign In Button */
        .animated-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #e26939 0%, #d15c2e 100%) !important;
          box-shadow: 0 4px 14px rgba(209, 92, 46, 0.35);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .animated-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          transition: 0.75s ease-in-out;
          opacity: 0;
        }

        .animated-btn:hover {
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 8px 20px rgba(209, 92, 46, 0.55) !important;
          background: linear-gradient(135deg, #d15c2e 0%, #b84b20 100%) !important;
        }

        .animated-btn:hover::after {
          left: 125%;
          opacity: 1;
          transition: all 0.6s ease-in-out;
        }

        .animated-btn:active {
          transform: translateY(0) scale(0.985);
          box-shadow: 0 4px 10px rgba(209, 92, 46, 0.3) !important;
        }
      `}</style>
    </div>
  );
}
