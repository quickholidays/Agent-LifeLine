"use client";

import React, { useState, useEffect, useRef } from "react";

export default function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Default to today if value is empty
  const selectedDate = value ? new Date(value) : new Date();
  
  // Track the month and year currently viewed in the calendar popover
  const [viewDate, setViewDate] = useState(new Date(selectedDate.getTime()));

  // Close calendar on outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update view when value changes from outside
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    const next = new Date(viewDate.getTime());
    next.setUTCMonth(month - 1);
    setViewDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(viewDate.getTime());
    next.setUTCMonth(month + 1);
    setViewDate(next);
  };

  const handleSelectDay = (dayNum, isCurrentMonth = true) => {
    const target = new Date(Date.UTC(year, isCurrentMonth ? month : (dayNum < 15 ? month + 1 : month - 1), dayNum));
    const formatted = target.toISOString().split("T")[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    onChange(todayStr);
    setIsOpen(false);
  };

  // Generate calendar days grid (42 days)
  const getCalendarDays = () => {
    const days = [];
    
    // First day of current month (0 = Sun, 1 = Mon, etc.)
    const firstDayIndex = new Date(Date.UTC(year, month, 1)).getUTCDay();
    
    // Number of days in current month
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    
    // Number of days in previous month
    const prevTotalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // 1. Previous Month days filling first row
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevTotalDays - i, isCurrent: false });
    }

    // 2. Current Month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrent: true });
    }

    // 3. Next Month days filling last row
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ day: i, isCurrent: false });
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const today = new Date();
  
  // Format current date display (DD/MM/YYYY)
  const formatInputDisplay = () => {
    if (!value) return "";
    const [yr, mo, dy] = value.split("-");
    return `${dy}/${mo}/${yr}`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Date display trigger field */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0.5rem 1.1rem",
          borderRadius: "30px",
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          color: "var(--text-primary)",
          fontSize: "0.82rem",
          cursor: "pointer",
          userSelect: "none",
          boxShadow: "var(--shadow)",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
      >
        <span>{formatInputDisplay()}</span>
        <i className="fa-regular fa-calendar-days" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}></i>
      </div>

      {isOpen && (
        <div 
          style={{
            position: "absolute",
            top: "105%",
            right: 0,
            zIndex: 9999,
            width: "280px",
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
            fontFamily: "var(--font-stack)",
            userSelect: "none"
          }}
        >
          {/* Calendar Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "3px" }}>
              {monthNames[month]} {year} <i className="fa-solid fa-caret-down" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}></i>
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                onClick={handlePrevMonth}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem", padding: "2px" }}
              >
                <i className="fa-solid fa-arrow-up"></i>
              </button>
              <button 
                onClick={handleNextMonth}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem", padding: "2px" }}
              >
                <i className="fa-solid fa-arrow-down"></i>
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          {/* Days Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {calendarDays.map((item, index) => {
              // Determine status of this cell
              const cellDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
              const isSelected = item.isCurrent && value === cellDateStr;
              
              const isTodayCell = 
                item.isCurrent &&
                today.getUTCFullYear() === year &&
                today.getUTCMonth() === month &&
                today.getUTCDate() === item.day;

              return (
                <div
                  key={index}
                  onClick={() => handleSelectDay(item.day, item.isCurrent)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "30px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: isSelected || isTodayCell ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    
                    // Selected highlight (Solid color)
                    background: isSelected 
                      ? "var(--primary)" 
                      : isTodayCell 
                        ? "transparent" 
                        : "transparent",
                    color: isSelected 
                      ? "#ffffff" 
                      : item.isCurrent 
                        ? "var(--text-primary)" 
                        : "var(--text-secondary)",
                    opacity: item.isCurrent ? 1 : 0.45,
                    border: isTodayCell && !isSelected ? "1px solid var(--primary)" : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--table-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {item.day}
                </div>
              );
            })}
          </div>

          {/* Footer Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--card-border)", paddingTop: "0.6rem", fontSize: "0.78rem" }}>
            <button 
              onClick={handleClear}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            >
              Clear
            </button>
            <button 
              onClick={handleToday}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
