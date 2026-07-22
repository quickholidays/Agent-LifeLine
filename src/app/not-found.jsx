"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  PhoneCall, 
  Award, 
  CheckCircle, 
  Calendar, 
  User, 
  Clock, 
  Activity, 
  Database,
  Home,
  Paperclip,
  Bell,
  XCircle,
  HelpCircle,
  Link2Off,
  Compass
} from "lucide-react";

const FloatingElement = ({ children, targetX, targetY, initialRotate, animStep, isMobile }) => {
  const getAnimateState = () => {
    const scaleFactor = isMobile ? 0.32 : 1.0;
    
    if (animStep === "text-only") {
      return {
        opacity: 0,
        scale: 0,
        x: 0,
        y: 0,
        zIndex: 0,
        rotate: 0
      };
    }
    
    if (animStep === "stacked") {
      return {
        opacity: 0.85,
        scale: 0.8,
        x: 0,
        y: 0,
        zIndex: 5,
        rotate: initialRotate * 2
      };
    }
    
    return {
      opacity: 1,
      scale: isMobile ? 0.65 : 1.0,
      x: `${targetX * scaleFactor}vw`,
      y: `${targetY * scaleFactor}vh`,
      zIndex: 1,
      rotate: initialRotate
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={getAnimateState()}
      whileHover={{ 
        scale: 1.12, 
        zIndex: 50
      }}
      transition={{
        type: "spring",
        stiffness: 160,
        damping: 11,
        delay: 0,
      }}
      style={{ 
        position: "absolute",
        cursor: "pointer",
        userSelect: "none",
        background: "transparent",
        boxShadow: "none",
        border: "none"
      }}
    >
      <motion.div
        animate={animStep === "scattered" ? { y: [0, -6, 0], rotate: [-0.5, 0.5, -0.5] } : {}}
        transition={{ 
          repeat: Infinity, 
          duration: 4.5 + Math.random() * 3, 
          ease: "easeInOut" 
        }}
        style={{
          background: "transparent",
          boxShadow: "none",
          border: "none"
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default function NotFound() {
  const [isMobile, setIsMobile] = useState(false);
  const [animStep, setAnimStep] = useState("text-only");

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    
    // Trigger sequence stages
    const timer1 = setTimeout(() => setAnimStep("stacked"), 400);
    const timer2 = setTimeout(() => setAnimStep("scattered"), 1100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const elements = [
    // 1. Error 404 (Red Ribbon)
    {
      targetX: -36,
      targetY: -28,
      initialRotate: -8,
      content: (
        <div style={{
          background: "#7D2B16",
          color: "#FFF",
          padding: "0.4rem 0.8rem",
          fontSize: "0.68rem",
          fontWeight: 900,
          borderRadius: "4px",
          boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem"
        }}>
          <XCircle size={12} /> ERROR 404
        </div>
      )
    },
    // 2. Signal Lost (Slate Blue Cloud)
    {
      targetX: -28,
      targetY: -18,
      initialRotate: 4,
      content: (
        <div style={{
          background: "#829AA6",
          color: "#FFF",
          borderRadius: "20px",
          padding: "0.5rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          fontSize: "0.68rem",
          fontWeight: 700
        }}>
          Signal Lost
        </div>
      )
    },
    // 3. Wavy Dotted Check URL Tag
    {
      targetX: -24,
      targetY: -34,
      initialRotate: 5,
      content: (
        <div style={{
          background: "rgba(34, 51, 59, 0.08)",
          border: "2px dashed #22333B",
          color: "#22333B",
          borderRadius: "50%",
          width: "55px",
          height: "55px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.6rem",
          fontWeight: 800,
          textAlign: "center"
        }}>
          <span>CHECK</span>
          <span style={{ fontSize: "0.45rem", opacity: 0.8 }}>URL</span>
        </div>
      )
    },
    // 4. Broken Link (Beige sticky tag)
    {
      targetX: -15,
      targetY: -25,
      initialRotate: -4,
      content: (
        <div style={{
          background: "#C6B086",
          color: "#0A0908",
          width: "80px",
          height: "65px",
          borderRadius: "4px",
          padding: "0.4rem",
          fontSize: "0.65rem",
          fontWeight: 700,
          position: "relative",
          boxShadow: "0 3px 8px rgba(0,0,0,0.15)"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "12px",
            height: "12px",
            background: "linear-gradient(225deg, transparent 50%, #A38F69 50%)"
          }} />
          <div style={{ fontSize: "0.5rem", opacity: 0.8 }}>Route</div>
          <div style={{ marginTop: "0.3rem", fontWeight: 800 }}>• Missing</div>
        </div>
      )
    },
    // 5. Document Scan Fail checklist
    {
      targetX: -3,
      targetY: -28,
      initialRotate: 1,
      content: (
        <div style={{
          background: "#D1CEBF",
          color: "#22333B",
          borderRadius: "6px",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: "0.5rem",
          width: "100px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          fontSize: "0.62rem"
        }}>
          <div style={{ fontWeight: 800, borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: "0.15rem", display: "flex", gap: "0.2rem", alignItems: "center" }}>
            <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "#7D2B16" }} /> 404 Audit
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.25rem", opacity: 0.8 }}>
            <div>• Scanner failure</div>
            <div>• Broken link</div>
          </div>
        </div>
      )
    },
    // 6. Gold Warning Bell (Top-Center Right)
    {
      targetX: +8,
      targetY: -25,
      initialRotate: -6,
      content: (
        <div style={{
          background: "#F5CE56",
          color: "#0A0908",
          borderRadius: "50% 50% 4px 4px",
          width: "48px",
          height: "48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          position: "relative"
        }}>
          <Bell size={14} />
          <span style={{ fontSize: "0.45rem", fontWeight: 900, marginTop: "0.1rem" }}>404</span>
        </div>
      )
    },
    // 7. Lavender Oval (Top-Right Center)
    {
      targetX: +17,
      targetY: -34,
      initialRotate: 3,
      content: (
        <div style={{
          background: "rgba(175, 165, 217, 0.12)",
          border: "2px dashed #AFA5D9",
          color: "#AFA5D9",
          borderRadius: "50%",
          width: "75px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.58rem",
          fontWeight: 800,
          textAlign: "center"
        }}>
          Out of Bounds
        </div>
      )
    },
    // 8. Offline House
    {
      targetX: +28,
      targetY: 25,
      initialRotate: 2,
      content: (
        <div style={{
          background: "#1F7A8C",
          color: "#EAE0D5",
          borderRadius: "8px",
          padding: "0.5rem 0.8rem",
          fontSize: "0.72rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          boxShadow: "0 5px 12px rgba(0,0,0,0.2)"
        }}>
          <Home size={12} /> Link Offline
        </div>
      )
    },
    // 9. Staging Path Missing Plane
    {
      targetX: -28,
      targetY: 26,
      initialRotate: 12,
      content: (
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none">
            <path d="M0,40 L100,20 L30,25 Z" fill="#F5C542" />
            <path d="M30,25 L100,20 L35,27 Z" fill="#D4A72A" />
          </svg>
          <span style={{
            position: "absolute",
            bottom: "6px",
            left: "10px",
            fontSize: "0.52rem",
            fontWeight: 800,
            color: "#6B510A"
          }}>
            Path: missing
          </span>
        </div>
      )
    },
    // 10. Access Denied Brown Tag
    {
      targetX: +40,
      targetY: -23,
      initialRotate: 90,
      content: (
        <div style={{
          background: "#855C3E",
          color: "#FFF",
          padding: "0.3rem 0.6rem",
          fontSize: "0.58rem",
          fontWeight: 850,
          textTransform: "uppercase",
          boxShadow: "0 3px 6px rgba(0,0,0,0.15)"
        }}>
          Access Denied
        </div>
      )
    },
    // 11. Broken Link Icon
    {
      targetX: -20,
      targetY: 1,
      initialRotate: -6,
      content: (
        <div style={{
          background: "var(--card-bg, #22333B)",
          border: "1px solid var(--accent, #5E503F)",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--primary)",
          boxShadow: "var(--shadow)"
        }}>
          <Link2Off size={14} />
        </div>
      )
    },
    // 12. Peach Badge Year
    {
      targetX: +3,
      targetY: 36,
      initialRotate: 0,
      content: (
        <div style={{
          background: "#F7B394",
          color: "#7D2B16",
          borderRadius: "30px 30px 0 0",
          padding: "0.4rem 1rem",
          fontSize: "0.62rem",
          fontWeight: 900,
          boxShadow: "0 -3px 6px rgba(0,0,0,0.1)",
          textTransform: "uppercase"
        }}>
          Code: 404 Error
        </div>
      )
    },

    // NEW DENSITY CARDS:
    // 13. Timeout Indicator
    {
      targetX: -18,
      targetY: 14,
      initialRotate: 5,
      content: (
        <div style={{
          background: "#EBB3C4",
          color: "#7A4D5B",
          borderRadius: "4px",
          padding: "0.35rem 0.7rem",
          fontSize: "0.62rem",
          fontWeight: 800
        }}>
          Timeout: 404
        </div>
      )
    },
    // 14. Ping failure
    {
      targetX: -10,
      targetY: -15,
      initialRotate: -4,
      content: (
        <div style={{
          background: "rgba(220, 38, 38, 0.08)",
          border: "1.5px dashed #dc2626",
          color: "#dc2626",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.6rem",
          fontWeight: 700
        }}>
          Ping Failed (GHL)
        </div>
      )
    },
    // 15. System unreachable
    {
      targetX: +20,
      targetY: 16,
      initialRotate: 8,
      content: (
        <div style={{
          background: "#C6AC8F",
          color: "#0A0908",
          borderRadius: "4px",
          padding: "0.35rem 0.7rem",
          fontSize: "0.62rem",
          fontWeight: 800
        }}>
          Unreachable
        </div>
      )
    },
    // 16. Session Expired
    {
      targetX: +11,
      targetY: -12,
      initialRotate: 3,
      content: (
        <div style={{
          background: "#829AA6",
          color: "#FFF",
          borderRadius: "30px",
          padding: "0.35rem 0.75rem",
          fontSize: "0.6rem",
          fontWeight: 700
        }}>
          Session Reset
        </div>
      )
    },
    // 17. Dead route tag
    {
      targetX: +32,
      targetY: -35,
      initialRotate: -8,
      content: (
        <div style={{
          background: "#855C3E",
          color: "#FFF",
          borderRadius: "4px",
          padding: "0.3rem 0.6rem",
          fontSize: "0.6rem",
          fontWeight: 800
        }}>
          Dead End
        </div>
      )
    },
    // 18. Locked 403 route
    {
      targetX: -32,
      targetY: -9,
      initialRotate: 4,
      content: (
        <div style={{
          background: "#F5CE56",
          color: "#0A0908",
          borderRadius: "4px",
          padding: "0.35rem 0.7rem",
          fontSize: "0.62rem",
          fontWeight: 800
        }}>
          403 Locked
        </div>
      )
    }
  ];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#EAE0D5", // Explicit light background
      backgroundImage: "radial-gradient(rgba(34, 51, 59, 0.12) 1px, transparent 1px)", // Visible grid dots
      backgroundSize: "24px 24px",
      overflow: "hidden"
    }}>
      {/* Background radial soft light gradient */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60vw",
        height: "60vh",
        background: "radial-gradient(circle, rgba(94, 80, 63, 0.05) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Scattered Elements Wrapper */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1
      }}>
        {elements.map((el, idx) => {
          return (
            <FloatingElement 
              key={idx} 
              targetX={el.targetX} 
              targetY={el.targetY} 
              initialRotate={el.initialRotate}
              animStep={animStep}
              isMobile={isMobile}
            >
              {el.content}
            </FloatingElement>
          );
        })}
      </div>

      {/* Central Content Column */}
      <div style={{
        zIndex: 10,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
        maxWidth: "600px",
        padding: "0 1.5rem"
      }}>
        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            fontSize: isMobile ? "0.68rem" : "0.78rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#22333B"
          }}
        >
          <Activity size={12} style={{ display: "inline-block", marginRight: "0.3rem", marginTop: "-2px" }} /> Operations Portal
        </motion.div>

        {/* Central Pill Button Wrapper (Click Link Zone) */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div 
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "0.5rem" : "1rem",
              background: "transparent",
              padding: "0.5rem 1rem",
              borderRadius: "50px"
            }}
          >
            {/* Dashboard growing bar graph SVG widget */}
            {animStep === "scattered" && (
              <motion.div
                initial={{ opacity: 0, x: -30, scale: 0.6 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 10 }}
                style={{ 
                  width: isMobile ? "32px" : "44px", 
                  height: isMobile ? "44px" : "44px", 
                  flexShrink: 0 
                }}
              >
                <svg viewBox="0 0 100 100" fill="none" style={{ width: "100%", height: "100%" }}>
                  <path d="M15,85 L85,85 M15,15 L15,85" stroke="#22333B" strokeWidth="4" opacity="0.4" strokeLinecap="round" />
                  <motion.rect
                    initial={{ height: 0, y: 85 }}
                    animate={{ height: 35, y: 50 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                    x="28" width="10" fill="#5E503F" rx="2"
                  />
                  <motion.rect
                    initial={{ height: 0, y: 85 }}
                    animate={{ height: 60, y: 25 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 100 }}
                    x="48" width="10" fill="#22333B" rx="2"
                  />
                  <motion.rect
                    initial={{ height: 0, y: 85 }}
                    animate={{ height: 45, y: 40 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                    x="68" width="10" fill="#7D2B16" rx="2"
                  />
                </svg>
              </motion.div>
            )}

            {/* Dotted border pill button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isMobile ? "0.6rem 1.8rem" : "0.85rem 2.5rem",
                borderRadius: "50px",
                background: "#22333B",
                border: "2px dashed #C6AC8F",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: isMobile ? "1.1rem" : "1.6rem",
                color: "#EAE0D5",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                transition: "all 0.3s ease"
              }}
            >
              Signal Lost — 404
            </div>
          </div>
        </Link>

        {/* Short Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          style={{
            margin: 0,
            fontSize: isMobile ? "0.82rem" : "0.95rem",
            color: "#5E503F",
            lineHeight: 1.5,
            fontWeight: 500,
            opacity: 0.85
          }}
        >
          We couldn't establish a link to this page coordinates. Click the button above to return to the home dashboard workspace.
        </motion.p>
      </div>
    </div>
  );
}
