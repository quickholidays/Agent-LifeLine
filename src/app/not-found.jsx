"use client";

import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #1e110a 0%, #0d0603 100%)",
        color: "#f8fafc",
        fontFamily: "var(--font-outfit), sans-serif",
        padding: "2rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Glowing Orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "rgba(209, 92, 46, 0.15)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "25%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(79, 70, 229, 0.1)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Glassmorphism Card */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "24px",
          padding: "3.5rem 2.5rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Animated Satellite / Radar Icon */}
        <div style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 2rem auto" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid var(--primary)",
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa-solid fa-satellite-dish" style={{ fontSize: "2.2rem", color: "var(--primary)" }}></i>
          </div>
          {/* Pulsing rings */}
          <div
            style={{
              position: "absolute",
              inset: "-10px",
              borderRadius: "50%",
              border: "2px solid rgba(209, 92, 46, 0.4)",
              animation: "pulseRing 2s infinite ease-out",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "-25px",
              borderRadius: "50%",
              border: "1px dashed rgba(209, 92, 46, 0.2)",
              animation: "pulseRing 2s infinite linear",
              animationDelay: "0.5s",
            }}
          />
        </div>

        {/* 404 Title */}
        <h1
          style={{
            fontFamily: "var(--font-luxury), Georgia, serif",
            fontSize: "4.5rem",
            fontWeight: "normal",
            margin: "0 0 0.5rem 0",
            color: "var(--primary)",
            lineHeight: 1,
            textShadow: "0 4px 12px rgba(209,92,46,0.3)",
          }}
        >
          404
        </h1>

        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 1rem 0", letterSpacing: "0.5px" }}>
          LifeLine Signal Lost
        </h2>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2.5rem 0" }}>
          We scanned the GoHighLevel workspace coordinates but couldn't establish a link to this page. It might have been deleted, moved, or never compiled.
        </p>

        {/* Back Home Button */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.8rem 1.8rem",
            borderRadius: "30px",
            background: "linear-gradient(135deg, var(--primary) 0%, #b2451b 100%)",
            color: "#ffffff",
            fontSize: "0.9rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 15px rgba(209, 92, 46, 0.4)",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(209, 92, 46, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(209, 92, 46, 0.4)";
          }}
        >
          <i className="fa-solid fa-home"></i>
          Return to Dashboard
        </Link>
      </div>

      {/* Styled Animations */}
      <style jsx global>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
