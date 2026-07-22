"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PhoneCall, 
  Clock, 
  Activity, 
  Bell,
  Coffee,
  Home,
  Paperclip,
  Award,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  ChevronLeft
} from "lucide-react";

// Notification Toast Item Component
const Notification = ({ text, id, removeNotif }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotif(id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [id, removeNotif]);

  return (
    <motion.div
      layout
      initial={{ y: -20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        borderRadius: "8px",
        gap: "0.6rem",
        fontSize: "0.8rem",
        fontWeight: 700,
        boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
        color: "#FFF",
        background: "#7D2B16", 
        pointerEvents: "auto",
        border: "1px solid rgba(198, 172, 143, 0.2)"
      }}
    >
      <i className="fa-solid fa-circle-exclamation" style={{ color: "#F5CE56" }} />
      <span style={{ flex: 1 }}>{text}</span>
      <button 
        onClick={() => removeNotif(id)}
        style={{
          background: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          opacity: 0.8
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </motion.div>
  );
};

const FloatingElement = ({ children, targetX, targetY, initialRotate, animStep, isHoveredParent, isFeatured, isMobile, showLoginSplit, isSpecialAlign }) => {
  const getAnimateState = () => {
    // Separate horizontal and vertical scale factors to fit the right 60% aspect ratio column when login is active
    const xFactor = isMobile ? (showLoginSplit ? 0.82 : 0.82) : (showLoginSplit ? 0.55 : 1.0);
    const yFactor = isMobile ? (showLoginSplit ? 1.25 : 1.25) : (showLoginSplit ? 0.90 : 1.0);
    
    // Hide special aligned logo/name on mobile when login is open to avoid overlapping form
    if (showLoginSplit && isSpecialAlign && isMobile) {
      return {
        opacity: 0,
        scale: 0,
        x: 0,
        y: 0,
        zIndex: 0,
        rotate: 0
      };
    }

    // Special align for logo & name when login is open on desktop
    if (showLoginSplit && isSpecialAlign) {
      return {
        opacity: 1,
        scale: 1.25,
        x: `${targetX * xFactor}vw`,
        y: `${targetY * yFactor}vh`,
        zIndex: 120,
        rotate: 0
      };
    }

    // Mount loading stages
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
    
    // Scattered (standard state)
    if (isHoveredParent) {
      if (isFeatured) {
        return {
          opacity: 1,
          scale: 1.15,
          x: 0,
          y: isMobile ? -85 : -130,
          zIndex: 100,
          rotate: 0
        };
      } else {
        return {
          opacity: 0,
          scale: 0,
          x: 0,
          y: 0,
          zIndex: 0,
          rotate: 0
        };
      }
    } else {
      return {
        opacity: 1,
        scale: isMobile ? 0.65 : (showLoginSplit ? 0.8 : 1.0),
        x: `${targetX * xFactor}vw`,
        y: `${targetY * yFactor}vh`,
        zIndex: 1,
        rotate: initialRotate
      };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={getAnimateState()}
      whileHover={(!isHoveredParent && animStep === "scattered") ? { 
        scale: 1.12, 
        zIndex: 50
      } : {}}
      transition={{
        type: "spring",
        stiffness: isHoveredParent ? (showLoginSplit ? 48 : 130) : 160, 
        damping: isHoveredParent ? 16 : 11,
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
        animate={(!isHoveredParent && animStep === "scattered") ? { y: [0, -6, 0], rotate: [-0.5, 0.5, -0.5] } : {}}
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

export default function HeroSection({ isLoggedIn, onLoginSuccess, onEnterWorkspace, loading }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [activeHoverElementIdx, setActiveHoverElementIdx] = useState(0);
  
  // Staged load: "text-only" -> "stacked" -> "scattered"
  const [animStep, setAnimStep] = useState("text-only");
  
  // Morph to split screen layout
  const [showLoginSplit, setShowLoginSplit] = useState(false);

  // Login form state variables
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Custom toast notification manager
  const [notifications, setNotifications] = useState([]);

  const removeNotif = useCallback((id) => {
    setNotifications((pv) => pv.filter((n) => n.id !== id));
  }, []);

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

  // 2-second timer loop for highlighting a single card when hovered
  useEffect(() => {
    let interval;
    if (isHoveringButton) {
      interval = setInterval(() => {
        setActiveHoverElementIdx(prev => {
          let nextIdx = (prev + 1) % elements.length;
          while (nextIdx === 0 || nextIdx === 1) {
            nextIdx = (nextIdx + 1) % elements.length;
          }
          return nextIdx;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isHoveringButton]);

  const handleMouseEnter = () => {
    if (animStep !== "scattered" || showLoginSplit) return;
    setIsHoveringButton(true);
    let randomIdx = Math.floor(Math.random() * elements.length);
    while (randomIdx === 0 || randomIdx === 1) {
      randomIdx = Math.floor(Math.random() * elements.length);
    }
    setActiveHoverElementIdx(randomIdx);
  };

  const handleMouseLeave = () => {
    setIsHoveringButton(false);
  };

  const handleCentralButtonClick = () => {
    if (animStep !== "scattered") return;
    if (isLoggedIn) {
      onEnterWorkspace();
    } else {
      setIsHoveringButton(false); // Reset hover state so elements spread out on login screen
      setShowLoginSplit(true);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Store auth session locally
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role);
      
      if (onLoginSuccess) {
        onLoginSuccess(data.role);
      }
    } catch (err) {
      setNotifications(pv => [
        { id: Math.random(), text: err.message || "Invalid credentials. Try again." },
        ...pv
      ]);
    } finally {
      setLoginLoading(false);
    }
  };

  const elements = [
    // 0. Logo element (Special Center Align in Login Split)
    {
      targetX: showLoginSplit ? 0 : -22,
      targetY: showLoginSplit ? -5 : -10,
      initialRotate: -6,
      isSpecialAlign: true,
      content: (
        <div style={{ background: "transparent", border: "none", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "62px", height: "62px", objectFit: "contain" }} />
        </div>
      )
    },
    // 1. Name element (Special Center Align in Login Split)
    {
      targetX: showLoginSplit ? 0 : 22,
      targetY: showLoginSplit ? 5 : 10,
      initialRotate: 4,
      isSpecialAlign: true,
      content: (
        <div style={{
          fontSize: "1.75rem",
          fontWeight: 900,
          color: "var(--text-primary, #0A0908)",
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: "-0.03em",
          background: "transparent",
          border: "none",
          boxShadow: "none"
        }}>
          LifeLine
        </div>
      )
    },

    // 2. Puzzle Stack (Top-Left)
    {
      targetX: -36,
      targetY: -28,
      initialRotate: -8,
      content: (
        <div style={{ position: "relative", width: "95px", height: "70px" }}>
          <div style={{ position: "absolute", top: "8px", left: "8px", background: "#EAE0D5", opacity: 0.5, border: "1px solid #C6AC8F", width: "75px", height: "45px", borderRadius: "4px", transform: "rotate(4deg)" }} />
          <div style={{ position: "absolute", top: "4px", left: "4px", background: "#EAE0D5", opacity: 0.7, border: "1px solid #C6AC8F", width: "75px", height: "45px", borderRadius: "4px", transform: "rotate(-2deg)" }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "#EAE0D5",
            border: "1px solid #C6AC8F",
            color: "#0A0908",
            width: "75px",
            height: "45px",
            borderRadius: "4px",
            padding: "0.3rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontSize: "0.55rem",
            fontWeight: 800,
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)"
          }}>
            <div>OUTBOUND</div>
            <div style={{ color: "#5E503F", fontSize: "0.48rem" }}>Sprints Active</div>
          </div>
        </div>
      )
    },
    // 3. Cloud Call Hours (Mid-Left)
    {
      targetX: -28,
      targetY: -18,
      initialRotate: 4,
      content: (
        <div style={{
          background: "#829AA6",
          color: "#FFF",
          borderRadius: "20px 20px 20px 20px",
          padding: "0.5rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          fontSize: "0.68rem",
          fontWeight: 700
        }}>
          <PhoneCall size={11} /> 48 Calls Today
        </div>
      )
    },
    // 4. Red Ribbon (Left Edge)
    {
      targetX: -41,
      targetY: -2,
      initialRotate: -90,
      content: (
        <div style={{
          background: "#7D2B16",
          color: "#FFF",
          padding: "0.3rem 0.6rem",
          fontSize: "0.58rem",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          boxShadow: "0 3px 6px rgba(0,0,0,0.2)"
        }}>
          99% Connected
        </div>
      )
    },
    // 5. Green Sticky Note with Red Paperclip (Mid-Left Lower)
    {
      targetX: -30,
      targetY: 8,
      initialRotate: -3,
      content: (
        <div style={{
          background: "#2C4A3E",
          color: "#EAE0D5",
          border: "1px solid rgba(198,172,143,0.15)",
          borderRadius: "6px",
          padding: "0.6rem",
          paddingTop: "0.9rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          width: "90px",
          boxShadow: "0 5px 12px rgba(0,0,0,0.25)",
          fontSize: "0.62rem",
          position: "relative"
        }}>
          {/* Red paperclip */}
          <div style={{
            position: "absolute",
            top: "-6px",
            left: "12px",
            width: "8px",
            height: "18px",
            border: "2px solid #EF4444",
            borderRadius: "10px",
            transform: "rotate(15deg)"
          }} />
          <div style={{ fontFamily: "monospace", opacity: 0.85 }}>Notes logged</div>
          <div style={{ fontSize: "1rem", fontWeight: 900 }}>124</div>
        </div>
      )
    },
    // 6. Small Pink Ribbon (Left Edge Lower)
    {
      targetX: -41,
      targetY: 22,
      initialRotate: 0,
      content: (
        <div style={{
          background: "#FAEFEC",
          color: "#7D2B16",
          padding: "0.25rem 0.5rem",
          borderRadius: "2px 8px 8px 2px",
          fontSize: "0.58rem",
          fontWeight: 800,
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
        }}>
          Avg talk: 2.3m
        </div>
      )
    },
    // 7. Orange Paper Plane (Bottom-Left)
    {
      targetX: -28,
      targetY: 26,
      initialRotate: 12,
      content: (
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {/* Plane triangle vector */}
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
            To: Jessica (Active)
          </span>
        </div>
      )
    },
    // 8. Teal Circle Badge (Top-Left Center)
    {
      targetX: -24,
      targetY: -34,
      initialRotate: 5,
      content: (
        <div style={{
          background: "rgba(77, 166, 153, 0.12)",
          border: "2px dashed #4DA699",
          color: "#4DA699",
          borderRadius: "50%",
          width: "52px",
          height: "52px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.6rem",
          fontWeight: 900,
          textAlign: "center"
        }}>
          <span>+24%</span>
          <span style={{ fontSize: "0.45rem", opacity: 0.8 }}>MARGIN</span>
        </div>
      )
    },
    // 9. Beige Folded Card (Top-Center Left)
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
          <div style={{ fontSize: "0.5rem", opacity: 0.8 }}>Active Sprint</div>
          <div style={{ marginTop: "0.3rem", fontWeight: 800 }}>• Checked</div>
        </div>
      )
    },
    // 10. Employment Document (Top-Center)
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
            <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "#7D2B16" }} /> Agent logs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.25rem", opacity: 0.8 }}>
            <div>• Database verified</div>
            <div>• Backup clean</div>
          </div>
        </div>
      )
    },
    // 11. Gold Bell (Top-Center Right)
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
          <span style={{ fontSize: "0.45rem", fontWeight: 900, marginTop: "0.1rem" }}>ALERT</span>
        </div>
      )
    },
    // 12. Lavender Oval (Top-Right Center)
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
          Outbound Synced
        </div>
      )
    },
    // 13. Grey Tag (Top-Right)
    {
      targetX: +30,
      targetY: -22,
      initialRotate: -12,
      content: (
        <div style={{
          background: "#ADACAA",
          color: "#0A0908",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.1)",
          position: "relative"
        }}>
          <div style={{ position: "absolute", top: "4px", width: "4px", height: "4px", borderRadius: "50%", background: "#0A0908" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 900 }}>30</span>
          <span style={{ fontSize: "0.4rem", opacity: 0.8 }}>OPPS</span>
        </div>
      )
    },
    // 14. Brown Tag (Right Edge Top)
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
          Won / Closed
        </div>
      )
    },
    // 15. Flight Ticket (Mid-Right)
    {
      targetX: +20,
      targetY: -15,
      initialRotate: -1,
      content: (
        <div style={{
          background: "#064789",
          color: "#EAE0D5",
          borderRadius: "6px",
          padding: "0.5rem 0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          fontSize: "0.72rem",
          fontWeight: 700
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.55rem", opacity: 0.6 }}>PKT 11:45</span>
            <span style={{ fontWeight: 800 }}>SARA</span>
          </div>
          <i className="fa-solid fa-arrow-right-long" style={{ color: "#EAE0D5" }}></i>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.55rem", opacity: 0.6 }}>AGENT</span>
            <span style={{ fontWeight: 800 }}>BELL</span>
          </div>
        </div>
      )
    },
    // 16. Design Ticket (Mid-Right Lower)
    {
      targetX: +34,
      targetY: -10,
      initialRotate: 6,
      content: (
        <div style={{
          background: "#FAEDA7",
          color: "#22333B",
          borderRadius: "8px",
          padding: "0.5rem 0.7rem",
          width: "90px",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          fontSize: "0.62rem",
          fontWeight: 700
        }}>
          <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "0.15rem", display: "flex", justifyContent: "space-between" }}>
            <span>AGENT BELLA</span>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22333B" }} />
          </div>
          <div style={{ fontSize: "0.55rem", opacity: 0.8 }}>Active Sprint</div>
          <div style={{ color: "#71a758", fontSize: "0.58rem" }}>Confirmed</div>
        </div>
      )
    },
    // 17. Brown Fold Tag (Mid-Right Bottom)
    {
      targetX: +36,
      targetY: 6,
      initialRotate: -5,
      content: (
        <div style={{
          background: "#B36D45",
          color: "#FFF",
          borderRadius: "6px 0 6px 6px",
          padding: "0.45rem 0.8rem",
          fontSize: "0.68rem",
          fontWeight: 800,
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
        }}>
          GHL Log Ready
        </div>
      )
    },
    // 18. Blue House (Bottom-Right)
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
          <Home size={12} /> Staging Live
        </div>
      )
    },
    // 19. Wavy Seal Stamp (Bottom-Right Corner)
    {
      targetX: +40,
      targetY: 28,
      initialRotate: 15,
      content: (
        <div style={{
          background: "rgba(148, 209, 140, 0.12)",
          border: "2px dashed #94D18C",
          color: "#94D18C",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.55rem",
          fontWeight: 900,
          textAlign: "center"
        }}>
          SYNCED
        </div>
      )
    },
    // 20. Stacked Coffee Cups (Bottom-Center Left)
    {
      targetX: -6,
      targetY: 25,
      initialRotate: -6,
      content: (
        <div style={{
          background: "#8A7366",
          color: "#EAE0D5",
          borderRadius: "6px",
          padding: "0.4rem 0.65rem",
          fontSize: "0.68rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          boxShadow: "0 3px 8px rgba(0,0,0,0.15)"
        }}>
          <Coffee size={12} /> Daniel / Jessica
        </div>
      )
    },
    // 21. Pink Folded Card (Bottom-Center Right)
    {
      targetX: +10,
      targetY: 24,
      initialRotate: 4,
      content: (
        <div style={{
          background: "#EBB3C4",
          color: "#0A0908",
          width: "90px",
          height: "55px",
          borderRadius: "4px",
          padding: "0.4rem",
          fontSize: "0.62rem",
          fontWeight: 800,
          position: "relative",
          boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
          transform: "rotate(3deg)"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "12px",
            height: "12px",
            background: "linear-gradient(135deg, transparent 50%, #C996A5 50%)"
          }} />
          <div style={{ paddingLeft: "10px" }}>
            <div>Database</div>
            <div style={{ color: "#7A4D5B", fontSize: "0.55rem" }}>• Backups OK</div>
          </div>
        </div>
      )
    },
    // 22. Peach Circle Badge (Bottom-Center Edge)
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
          2026 Operations
        </div>
      )
    },
    // 23. Daniel Booked Leads
    {
      targetX: -16,
      targetY: 14,
      initialRotate: 5,
      content: (
        <div style={{
          background: "rgba(198, 172, 143, 0.15)",
          border: "2px dotted var(--primary, #C6AC8F)",
          color: "var(--primary, #C6AC8F)",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.65rem",
          fontWeight: 800
        }}>
          Daniel: +5 Booked
        </div>
      )
    },
    // 24. Outbound Phone Call Badge
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
          <Activity size={14} />
        </div>
      )
    },
    // 25. GHL Connection Ratio Tag
    {
      targetX: +20,
      targetY: 16,
      initialRotate: 8,
      content: (
        <div style={{
          background: "rgba(113, 167, 88, 0.08)",
          border: "1px solid rgba(113, 167, 88, 0.3)",
          color: "#71a758",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.65rem",
          fontWeight: 800
        }}>
          GHL Active (100%)
        </div>
      )
    },
    // 26. Conversion Sprint Report
    {
      targetX: -10,
      targetY: -15,
      initialRotate: -4,
      content: (
        <div style={{
          background: "#AFA5D9",
          color: "#0A0908",
          borderRadius: "4px",
          padding: "0.4rem 0.6rem",
          fontSize: "0.6rem",
          fontWeight: 700,
          width: "85px",
          boxShadow: "var(--shadow)"
        }}>
          Weekly Conversion Report: Complete
        </div>
      )
    },
    // 27. Peak Shift Indicator
    {
      targetX: +11,
      targetY: -12,
      initialRotate: 3,
      content: (
        <div style={{
          background: "#F7B394",
          color: "#7D2B16",
          borderRadius: "4px",
          padding: "0.3rem 0.6rem",
          fontSize: "0.6rem",
          fontWeight: 800
        }}>
          Shift: Active
        </div>
      )
    },
    // 28. Peak Talk Time Indicator
    {
      targetX: +32,
      targetY: -35,
      initialRotate: -8,
      content: (
        <div style={{
          background: "rgba(175, 165, 217, 0.12)",
          border: "1px dashed #AFA5D9",
          color: "#AFA5D9",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.6rem",
          fontWeight: 700
        }}>
          Peak Talk Time
        </div>
      )
    },
    // 29. Active Sprints Badge
    {
      targetX: -8,
      targetY: -16,
      initialRotate: 2,
      content: (
        <div style={{
          background: "#C6AC8F",
          color: "#0A0908",
          borderRadius: "4px",
          padding: "0.3rem 0.6rem",
          fontSize: "0.6rem",
          fontWeight: 800
        }}>
          Active Sprints: 6
        </div>
      )
    },
    // 30. Queue metrics indicator
    {
      targetX: -14,
      targetY: 26,
      initialRotate: -5,
      content: (
        <div style={{
          background: "#829AA6",
          color: "#FFF",
          borderRadius: "30px",
          padding: "0.35rem 0.75rem",
          fontSize: "0.6rem",
          fontWeight: 700
        }}>
          Queue: 0 waiting
        </div>
      )
    },
    // 31. Talk Time Target
    {
      targetX: +18,
      targetY: -26,
      initialRotate: 6,
      content: (
        <div style={{
          background: "rgba(94, 80, 63, 0.1)",
          border: "1.5px dashed #5E503F",
          color: "#5E503F",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.6rem",
          fontWeight: 800
        }}>
          Target: 3.5m
        </div>
      )
    },
    // 32. Database Status
    {
      targetX: +26,
      targetY: -2,
      initialRotate: -3,
      content: (
        <div style={{
          background: "rgba(113, 167, 88, 0.12)",
          border: "1px solid #71a758",
          color: "#71a758",
          borderRadius: "4px",
          padding: "0.35rem 0.7rem",
          fontSize: "0.62rem",
          fontWeight: 800
        }}>
          DB Status: Healthy
        </div>
      )
    },
    // 33. Total Online Pill
    {
      targetX: -32,
      targetY: -9,
      initialRotate: 4,
      content: (
        <div style={{
          background: "rgba(77, 166, 153, 0.15)",
          border: "1px solid #4DA699",
          color: "#4DA699",
          borderRadius: "30px",
          padding: "0.4rem 0.8rem",
          fontSize: "0.62rem",
          fontWeight: 800
        }}>
          18 Agents Online
        </div>
      )
    }
  ];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100vh",
      background: "#EAE0D5", 
      backgroundImage: "radial-gradient(rgba(34, 51, 59, 0.12) 1px, transparent 1px)", 
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

      {/* Slide-In Toast Notification System */}
      <div style={{
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "280px",
        zIndex: 9999,
        pointerEvents: "none"
      }}>
        <AnimatePresence>
          {notifications.map((n) => (
            <Notification key={n.id} text={n.text} id={n.id} removeNotif={removeNotif} />
          ))}
        </AnimatePresence>
      </div>

      {/* Right Column: Scattered Element Canvas (Constantly visible behind the mobile drawer!) */}
      <motion.div 
        animate={{ 
          x: (showLoginSplit && !isMobile) ? "20vw" : 0
        }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          zIndex: 1
        }}
      >
        {/* Scattered elements absolute wrappers */}
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
                isHoveredParent={isHoveringButton}
                isFeatured={activeHoverElementIdx === idx}
                isMobile={isMobile}
                showLoginSplit={showLoginSplit}
                isSpecialAlign={el.isSpecialAlign}
              >
                {el.content}
              </FloatingElement>
            );
          })}
        </div>

        {/* Central Hover Zone for Logo & Name (Only active when login split is open on Desktop) */}
        {showLoginSplit && !isMobile && (
          <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "180px",
              height: "160px",
              zIndex: 150,
              cursor: "pointer",
              background: "transparent"
            }}
          />
        )}

        {/* Central Content column inside canvas */}
        {!showLoginSplit && (
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
            {/* Animated Subtitle */}
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
              <Activity size={12} style={{ display: "inline-block", marginRight: "0.3rem", marginTop: "-2px" }} /> Operations Intel Portal
            </motion.div>

            {/* Central Pill Button Wrapper (Hover Zone & Click Enter Zone) */}
            <div 
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleCentralButtonClick}
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
                {loading ? "Preparing Workspace..." : "Got Metrics?"}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Animate Split login columns */}
      <AnimatePresence>
        {showLoginSplit && (
          <motion.div
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: isMobile ? "100%" : "40%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: isMobile ? "1.5rem" : "3.5rem",
              borderRight: isMobile ? "none" : "1px solid rgba(34, 51, 59, 0.12)",
              // Remove solid black background and backdrop-filter blur on mobile
              background: isMobile ? "transparent" : "#0A0908",
              backdropFilter: "none",
              boxSizing: "border-box",
              zIndex: 20
            }}
          >
            {/* Glassmorphic card container only on mobile to blur background behind the form */}
            <div style={isMobile ? {
              background: "rgba(234, 224, 213, 0.75)",
              backdropFilter: "blur(4px)",
              borderRadius: "16px",
              border: "1px solid rgba(34, 51, 59, 0.06)",
              padding: "2rem 1.5rem",
              boxShadow: "0 12px 32px rgba(34, 51, 59, 0.05)",
              width: "100%"
            } : { width: "100%" }}>
              {/* Back to intro link */}
              <motion.button
                whileHover={{ x: -4, color: isMobile ? "#22333B" : "#EAE0D5" }}
                onClick={() => {
                  setIsHoveringButton(false);
                  setShowLoginSplit(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isMobile ? "#22333B" : "#C6AC8F",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginBottom: isMobile ? "1.5rem" : "2.5rem",
                  padding: "0.4rem 0",
                  borderBottom: isMobile ? "1px solid rgba(34,51,59,0.15)" : "1px solid rgba(198,172,143,0.15)",
                  alignSelf: "flex-start",
                  transition: "color 0.2s ease"
                }}
              >
                <ChevronLeft size={14} /> Back to Intro
              </motion.button>

            {/* Mobile Header Brand (Logo and Name on top of mobile login inputs) */}
            {isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <img src="/logo.png" alt="Logo" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#22333B", fontFamily: "'Outfit', sans-serif" }}>
                  LifeLine
                </span>
              </div>
            )}

            {/* Headline */}
            <h2 style={{
              margin: 0,
              fontSize: isMobile ? "1.8rem" : "2.2rem",
              fontWeight: 900,
              color: isMobile ? "#22333B" : "#EAE0D5",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.03em",
              lineHeight: 1.1
            }}>
              Workspace Login<span style={{ color: isMobile ? "#5E503F" : "#C6AC8F" }}>.</span>
            </h2>
            <p style={{
              margin: "0.75rem 0 2.25rem 0",
              fontSize: "0.88rem",
              color: isMobile ? "#5E503F" : "#C6AC8F",
              lineHeight: 1.6,
              opacity: 0.7
            }}>
              Enter your administrative credentials to open the sales tracking dashboard.
            </p>

            {/* Login form */}
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.35rem", width: "100%" }}>
              {/* Username field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, color: isMobile ? "rgba(34,51,59,0.6)" : "rgba(198, 172, 143, 0.6)", letterSpacing: "0.15em" }}>USERNAME</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <UserIcon size={16} style={{ position: "absolute", left: "1rem", color: isMobile ? "#22333B" : "#C6AC8F", opacity: 0.6 }} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    style={{
                      width: "100%",
                      background: isMobile ? "#FFFFFF" : "rgba(34, 51, 59, 0.4)",
                      border: isMobile ? "1px solid rgba(34,51,59,0.15)" : "1px solid rgba(198,172,143,0.2)",
                      borderRadius: "8px",
                      padding: "0.85rem 1rem 0.85rem 2.6rem",
                      color: isMobile ? "#0A0908" : "#EAE0D5",
                      fontSize: "0.88rem",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = isMobile ? "#22333B" : "#C6AC8F"}
                    onBlur={(e) => e.target.style.borderColor = isMobile ? "rgba(34,51,59,0.15)" : "rgba(198,172,143,0.2)"}
                  />
                </div>
              </div>

              {/* Password field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, color: isMobile ? "rgba(34,51,59,0.6)" : "rgba(198, 172, 143, 0.6)", letterSpacing: "0.15em" }}>PASSWORD</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <KeyRound size={16} style={{ position: "absolute", left: "1rem", color: isMobile ? "#22333B" : "#C6AC8F", opacity: 0.6 }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      background: isMobile ? "#FFFFFF" : "rgba(34, 51, 59, 0.4)",
                      border: isMobile ? "1px solid rgba(34,51,59,0.15)" : "1px solid rgba(198,172,143,0.2)",
                      borderRadius: "8px",
                      padding: "0.85rem 2.6rem 0.85rem 2.6rem",
                      color: isMobile ? "#0A0908" : "#EAE0D5",
                      fontSize: "0.88rem",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = isMobile ? "#22333B" : "#C6AC8F"}
                    onBlur={(e) => e.target.style.borderColor = isMobile ? "rgba(34,51,59,0.15)" : "rgba(198,172,143,0.2)"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "1rem",
                      background: "transparent",
                      border: "none",
                      color: isMobile ? "#22333B" : "#C6AC8F",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      opacity: 0.8
                    }}
                  >
                    {showPassword ? <EyeOff size={16} style={{ color: isMobile ? "#22333B" : "#C6AC8F" }} /> : <Eye size={16} style={{ color: isMobile ? "#22333B" : "#C6AC8F" }} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loginLoading}
                whileHover={{ 
                  scale: 1.02,
                  backgroundColor: isMobile ? "#0A0908" : "#EAE0D5",
                  boxShadow: "0 8px 20px rgba(234, 224, 213, 0.15)"
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%",
                  background: isMobile ? "#22333B" : "#C6AC8F",
                  color: isMobile ? "#EAE0D5" : "#0A0908",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.9rem",
                  fontSize: "0.8rem",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: isMobile ? "0 6px 15px rgba(34,51,59,0.15)" : "0 6px 15px rgba(198, 172, 143, 0.15)",
                  marginTop: "0.6rem",
                  transition: "background-color 0.25s ease, box-shadow 0.25s ease"
                }}
              >
                {loginLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Sign In <ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
