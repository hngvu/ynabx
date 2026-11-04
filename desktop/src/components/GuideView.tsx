import React, { useState, useEffect, useCallback } from "react";
import { buildCircleProgressArcPath } from "../utils/targetUtils";
import { YnabIcon } from "./common/YnabIcon";

export type GuideSectionId =
  | "overview"
  | "philosophy"
  | "setup"
  | "plan-grid"
  | "credit-cards"
  | "transactions"
  | "rollover-reconcile"
  | "faq";

export interface GuideViewProps {
  onBack?: () => void;
  onNavigateToPlan?: () => void;
  onNavigateToAccounts?: () => void;
}

interface SlideData {
  id: GuideSectionId;
  stepNumber: number;
  badge: string;
  category: string;
  title: string;
  subtitle: string;
}

const SLIDES: SlideData[] = [
  {
    id: "philosophy",
    stepNumber: 1,
    badge: "Core Method",
    category: "The Philosophy",
    title: "The 4 Rules of Zero-Based Budgeting",
    subtitle: "Forget guessing future paychecks. You only budget money that is already sitting safely in your bank account today.",
  },
  {
    id: "setup",
    stepNumber: 2,
    badge: "Day 1 Setup",
    category: "Getting Started",
    title: "Connect Accounts & Your First Inflow",
    subtitle: "Setting up takes 2 minutes: configure your currency, add your bank balances, and watch your initial cash pool flow into Ready to Assign.",
  },
  {
    id: "plan-grid",
    stepNumber: 3,
    badge: "Core Visuals",
    category: "Budget Envelopes",
    title: "The Budget Grid & Target Progress Bars",
    subtitle: "Every envelope follows one formula: Available = Rollover + Assigned + Activity. Understand striped spent bars and colorful status pills at a glance.",
  },
  {
    id: "credit-cards",
    stepNumber: 4,
    badge: "Smart Automation",
    category: "Credit Cards",
    title: "Credit Cards & The 'Magic Shift'",
    subtitle: "Never fear credit card debt again. YNAB treats cards as payment instruments and automatically shifts money into your payment reserve.",
  },
  {
    id: "transactions",
    stepNumber: 5,
    badge: "Daily Routine",
    category: "Account Register",
    title: "Tracking Transactions & The Verification Flow",
    subtitle: "Record daily receipts in seconds, split shopping bills, and advance transactions from Uncleared to Cleared to Reconciled.",
  },
  {
    id: "rollover-reconcile",
    stepNumber: 6,
    badge: "Long-term Success",
    category: "Routines & Auditing",
    title: "Month Rollovers & Reconcile Account",
    subtitle: "Keep your books 100% bulletproof: learn how cash vs credit overspending transitions at month-end, and audit your accounts in under a minute.",
  },
];

export function GuideView({
  onBack,
  onNavigateToPlan,
  onNavigateToAccounts: _onNavigateToAccounts,
}: GuideViewProps): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const totalSlides = SLIDES.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx);
  };

  // Keyboard navigation: Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleExit = onBack || onNavigateToPlan;

  return (
    <div
      className="guide-page-standalone"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--backgroundPrimary, #f8f6f2)",
        color: "var(--labelPrimary, #191818)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: 'var(--font-sans, "Figtree", system-ui, sans-serif)',
        zIndex: 1000,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Sleek, Minimal Top Navbar - Exactly 1 exit action, zero clutter */}
      <header
        style={{
          height: "64px",
          borderBottom: "1px solid var(--separatorStandard, #d2d8de)",
          backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5rem",
          position: "sticky",
          top: 0,
          zIndex: 200,
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)",
          flexShrink: 0,
        }}
      >
        {/* Left: Brand Identity */}
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--labelPrimary, #191818)" }}>
          User Guide
        </div>

        {/* Right: Exactly ONE clean exit button */}
        <div>
          {handleExit && (
            <button
              type="button"
              onClick={handleExit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--separatorStandard, #d2d8de)",
                backgroundColor: "var(--backgroundSecondary, #f6f4ee)",
                color: "var(--labelPrimary, #191818)",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              title="Go to App"
            >
              Go to App
            </button>
          )}
        </div>
      </header>

      {/* Main Slide Carousel Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          maxWidth: "1320px",
          width: "100%",
          margin: "0 auto",
          padding: "2rem 2.5rem 2.5rem",
          boxSizing: "border-box",
          minHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Horizontal Slide Overflow Viewport */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            borderRadius: "18px",
            width: "100%",
          }}
        >
            {/* Sliding Track containing all 6 slides */}
            <div
              style={{
                display: "flex",
                width: `${totalSlides * 100}%`,
                transform: `translateX(-${(currentSlide * 100) / totalSlides}%)`,
                transition: "transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)",
              }}
            >
              {/* ===================== SLIDE 1: 4 RULES ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 1 OF 6 • CORE METHOD
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      The 4 Rules of Zero-Based Budgeting
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Forget guessing future paychecks. You only budget money that is already sitting safely in your bank account today.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--actionPrimary, #545bfe)", marginTop: "7px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)" }}>
                          <strong>Rule 1: Give Every Dollar a Job:</strong> Assign money until Ready to Assign reaches $0.00.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--actionPrimary, #545bfe)", marginTop: "7px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)" }}>
                          <strong>Rule 2: Embrace Your True Expenses:</strong> Turn large annual bills into friendly monthly targets.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--actionPrimary, #545bfe)", marginTop: "7px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)" }}>
                          <strong>Rule 3: Roll With the Punches:</strong> Overspent? Easily shift funds between categories anytime.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--actionPrimary, #545bfe)", marginTop: "7px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)" }}>
                          <strong>Rule 4: Age Your Money:</strong> Break the paycheck-to-paycheck cycle and spend last month&apos;s cash.
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(84, 91, 254, 0.08)", border: "1px solid rgba(84, 91, 254, 0.25)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: "4px", backgroundColor: "rgba(84, 91, 254, 0.15)", color: "var(--actionPrimary, #545bfe)", flexShrink: 0 }}>TIP</span>
                      <div style={{ fontSize: "0.825rem", color: "var(--actionPrimary, #545bfe)", lineHeight: 1.45 }}>
                        Zero-based budgeting means every dollar has a name before you spend it.
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)", borderRadius: "14px", padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--actionPrimary, #545bfe)", lineHeight: 1, marginBottom: "8px", letterSpacing: "-0.03em" }}>01</div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--labelPrimary)", marginBottom: "4px" }}>Give Every Dollar a Job</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)", lineHeight: 1.4 }}>Ready to Assign = $0.00. Assign only the cash you already have.</div>
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--actionPrimary, #545bfe)", lineHeight: 1, marginBottom: "8px", letterSpacing: "-0.03em" }}>02</div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--labelPrimary)", marginBottom: "4px" }}>Embrace True Expenses</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)", lineHeight: 1.4 }}>Break large annual bills into predictable monthly targets.</div>
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--actionPrimary, #545bfe)", lineHeight: 1, marginBottom: "8px", letterSpacing: "-0.03em" }}>03</div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--labelPrimary)", marginBottom: "4px" }}>Roll With the Punches</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)", lineHeight: 1.4 }}>When overspent, effortlessly move money between envelopes.</div>
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--actionPrimary, #545bfe)", lineHeight: 1, marginBottom: "8px", letterSpacing: "-0.03em" }}>04</div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--labelPrimary)", marginBottom: "4px" }}>Age Your Money</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)", lineHeight: 1.4 }}>Break the paycheck cycle and spend last month&apos;s income.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================== SLIDE 2: DAY 1 SETUP ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 2 OF 6 • ONBOARDING
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      Connect Accounts & Your First Inflow
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Setting up takes 2 minutes: configure your currency, add your bank balances, and watch your initial cash pool flow into Ready to Assign.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--labelPrimary)" }}>1. Plan Settings</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)" }}>Choose currency symbol (USD, EUR, VND...), placement, and date format.</div>
                      </div>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--labelPrimary)" }}>2. Add Real Accounts</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)" }}>Opening balances in Checking or Savings automatically populate <strong>Ready to Assign</strong>.</div>
                      </div>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--labelPrimary)" }}>3. Credit Card Auto-Pairing</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)" }}>Adding a Credit Card automatically creates a paired payment category on your budget grid.</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)", borderRadius: "14px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Real UI Preview 1: The Ready to Assign Banner */}
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", padding: "1rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labelSecondary)" }}>Budget Header</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--labelSecondary)" }}>October 2026</span>
                      </div>

                      <div style={{ backgroundColor: "rgba(174, 232, 101, 0.25)", border: "1.5px solid #aee865", borderRadius: "10px", padding: "0.85rem 1.15rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0d6832", lineHeight: 1.1, fontFamily: "Figtree, system-ui, sans-serif" }}>
                            $2,500.00
                          </div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0d6832", marginTop: "3px" }}>
                            Ready to Assign
                          </div>
                        </div>
                        <div style={{ padding: "0.35rem 0.85rem", borderRadius: "6px", backgroundColor: "#0d6832", color: "#ffffff", fontSize: "0.78rem", fontWeight: 700 }}>
                          Assign
                        </div>
                      </div>
                    </div>

                    {/* Visual Connection Arrow */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--actionPrimary, #545bfe)", fontSize: "0.78rem", fontWeight: 700 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                      <span>Opening bank balances flow directly into Ready to Assign</span>
                    </div>

                    {/* Real UI Preview 2: The Account Register Row */}
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid var(--separatorStandard, #d2d8de)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                      <div style={{ padding: "0.55rem 0.9rem", backgroundColor: "var(--backgroundSecondary)", borderBottom: "1px solid var(--separatorStandard)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--labelPrimary)" }}>Checking Account Register</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--labelSecondary)" }}>Cleared: $2,500.00</span>
                      </div>

                      {/* Register Header */}
                      <div style={{ display: "grid", gridTemplateColumns: "70px 1.3fr 1.5fr 90px 35px", padding: "0.45rem 0.9rem", backgroundColor: "#fafbfc", borderBottom: "1px solid #eaecef", fontSize: "0.68rem", fontWeight: 800, color: "var(--labelSecondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span>Date</span>
                        <span>Payee</span>
                        <span>Category</span>
                        <span style={{ textAlign: "right" }}>Inflow</span>
                        <span style={{ textAlign: "center" }}>C</span>
                      </div>

                      {/* Register Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "70px 1.3fr 1.5fr 90px 35px", padding: "0.6rem 0.9rem", alignItems: "center", fontSize: "0.78rem" }}>
                        <span style={{ color: "var(--labelSecondary)", fontSize: "0.75rem" }}>Today</span>
                        <span style={{ fontWeight: 700, color: "var(--labelPrimary)" }}>Starting Balance</span>
                        <span style={{ color: "#0d6832", fontWeight: 600, fontSize: "0.75rem" }}>Inflow: Ready to Assign</span>
                        <span style={{ textAlign: "right", fontWeight: 800, color: "#0d6832" }}>+$2,500.00</span>
                        <span style={{ display: "flex", justifyContent: "center", color: "#0d6832" }}>
                          <YnabIcon name="cleared_circle_fill" size={16} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================== SLIDE 3: BUDGET GRID & PROGRESS BARS ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 3 OF 6 • CORE VISUALS
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      The Budget Grid & Target Progress Bars
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Every envelope follows one formula: Available = Rollover + Assigned + Activity. Understand striped spent bars and colorful status pills at a glance.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(174, 232, 101, 0.2)", border: "1px solid #aee865" }}>
                        <span style={{ fontWeight: 700, color: "#0d6832" }}>Green Pill / Solid Bar:</span>
                        <span style={{ fontSize: "0.83rem", color: "var(--labelPrimary)", marginLeft: "6px" }}>Fully funded & ready to spend with peace of mind.</span>
                      </div>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(248, 214, 85, 0.25)", border: "1px solid #f8d655" }}>
                        <span style={{ fontWeight: 700, color: "#8e5b00" }}>Yellow Pill / Arc Chart:</span>
                        <span style={{ fontSize: "0.83rem", color: "var(--labelPrimary)", marginLeft: "6px" }}>Underfunded target; needs more cash assigned before month ends.</span>
                      </div>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(250, 173, 165, 0.25)", border: "1px solid #faada5" }}>
                        <span style={{ fontWeight: 700, color: "#bf2e3b" }}>Red Pill / Striped Bar:</span>
                        <span style={{ fontSize: "0.83rem", color: "var(--labelPrimary)", marginLeft: "6px" }}>Cash overspending! Click to move money and cover it immediately.</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid var(--separatorStandard, #d2d8de)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                    {/* Table Column Headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.55rem 0.9rem", backgroundColor: "var(--backgroundSecondary, #f6f4ee)", borderBottom: "1px solid var(--separatorStandard)", fontSize: "0.7rem", fontWeight: 800, color: "var(--labelSecondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>Category</span>
                      <span style={{ textAlign: "right" }}>Assigned</span>
                      <span style={{ textAlign: "right" }}>Activity</span>
                      <span style={{ textAlign: "right" }}>Available</span>
                    </div>

                    {/* Category Group Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.45rem 0.9rem", backgroundColor: "#fafbfc", borderBottom: "1px solid #eaecef", fontSize: "0.78rem", fontWeight: 800, color: "var(--labelPrimary)", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        <span>Bills & Everyday Living</span>
                      </div>
                      <span style={{ textAlign: "right", color: "var(--labelSecondary)", fontWeight: 700 }}>$560.00</span>
                      <span style={{ textAlign: "right", color: "var(--labelSecondary)", fontWeight: 700 }}>-$225.00</span>
                      <span style={{ textAlign: "right", color: "#0d6832", fontWeight: 800 }}>$440.00</span>
                    </div>

                    {/* Row 1: Groceries */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.6rem 0.9rem", alignItems: "center", borderBottom: "1px solid #f0f2f5" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px", width: "96%" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--labelPrimary)" }}>Groceries</span>
                          <span style={{ fontSize: "0.68rem", color: "#0d6832", fontWeight: 600 }}>Funded • Spent $120 of $500</span>
                        </div>
                        <figure className="ynab-new-budget-bar-v2" style={{ margin: 0, width: "96%" }}>
                          <div className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded" style={{ flexBasis: "100%" }}>
                            <div className="ynab-new-budget-bar-v2-segment is-fully-funded-spending" style={{ width: "24%" }} />
                            <div className="ynab-new-budget-bar-v2-segment is-fully-funded" style={{ width: "76%" }} />
                          </div>
                        </figure>
                      </div>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelPrimary)", fontWeight: 600 }}>$500.00</span>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelSecondary)", fontWeight: 600 }}>-$120.00</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span className="ynab-new-budget-available-number positive pill-positive currency" style={{ padding: "2px 7px", fontSize: "0.78rem", fontWeight: 700 }}>
                          $380.00
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Internet Bill */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.6rem 0.9rem", alignItems: "center", borderBottom: "1px solid #f0f2f5" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px", width: "96%" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--labelPrimary)" }}>Internet Bill</span>
                          <span style={{ fontSize: "0.68rem", color: "var(--labelSecondary)", fontWeight: 600 }}>Fully Spent</span>
                        </div>
                        <figure className="ynab-new-budget-bar-v2" style={{ margin: 0, width: "96%" }}>
                          <div className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded" style={{ flexBasis: "100%" }}>
                            <div className="ynab-new-budget-bar-v2-segment is-fully-funded-spending" style={{ width: "100%" }} />
                          </div>
                        </figure>
                      </div>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelPrimary)", fontWeight: 600 }}>$60.00</span>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelSecondary)", fontWeight: 600 }}>-$60.00</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span className="ynab-new-budget-available-number zero pill-zero currency" style={{ padding: "2px 7px", fontSize: "0.78rem", fontWeight: 700 }}>
                          $0.00
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Auto Insurance */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.6rem 0.9rem", alignItems: "center", borderBottom: "1px solid #f0f2f5" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px", width: "96%" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--labelPrimary)" }}>Auto Insurance</span>
                          <span style={{ fontSize: "0.68rem", color: "#8e5b00", fontWeight: 600 }}>$150 more needed</span>
                        </div>
                        <figure className="ynab-new-budget-bar-v2" style={{ margin: 0, width: "96%" }}>
                          <div className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded" style={{ flexBasis: "100%" }}>
                            <div className="ynab-new-budget-bar-v2-segment is-partially-funded" style={{ width: "50%" }} />
                          </div>
                        </figure>
                      </div>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelPrimary)", fontWeight: 600 }}>$0.00</span>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelSecondary)", fontWeight: 600 }}>$0.00</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span className="ynab-new-budget-available-number cautious has-goal pill-warning currency" style={{ padding: "2px 7px", fontSize: "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <svg className="ynab-new-icon icon-circle-progress" viewBox="0 0 16 16" width="10" height="10">
                            <path className="circle" d="M 8 1 a 7 7 0 1 1 0 14 a 7 7 0 1 1 0 -14" fill="none" strokeWidth="2" stroke="currentColor" />
                            <path className="progress" d={buildCircleProgressArcPath(0.5)} fill="currentColor" />
                          </svg>
                          <bdi>$105.00</bdi>
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Dining Out */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 80px 80px 105px", padding: "0.6rem 0.9rem", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px", width: "96%" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--labelPrimary)" }}>Dining Out</span>
                          <span style={{ fontSize: "0.68rem", color: "#bf2e3b", fontWeight: 600 }}>Overspent</span>
                        </div>
                        <figure className="ynab-new-budget-bar-v2" style={{ margin: 0, width: "96%" }}>
                          <div className="ynab-new-budget-bar-v2-section ynab-new-budget-bar-v2-section-funded" style={{ flexBasis: "100%" }}>
                            <div className="ynab-new-budget-bar-v2-segment is-fully-funded-spending" style={{ width: "69%" }} />
                            <div className="ynab-new-budget-bar-v2-segment is-overspent" style={{ width: "31%" }} />
                          </div>
                        </figure>
                      </div>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelPrimary)", fontWeight: 600 }}>$0.00</span>
                      <span style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--labelSecondary)", fontWeight: 600 }}>-$45.00</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span className="ynab-new-budget-available-number negative pill-negative currency" style={{ padding: "2px 7px", fontSize: "0.78rem", fontWeight: 700 }}>
                          -$45.00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================== SLIDE 4: CREDIT CARD MAGIC SHIFT ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 4 OF 6 • CARD AUTOMATION
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      Credit Cards & The &ldquo;Magic Shift&rdquo;
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Never fear credit card debt again. YNAB treats cards as payment instruments and automatically shifts money into your payment reserve.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ fontSize: "0.88rem", lineHeight: 1.5, color: "var(--labelPrimary)" }}>
                        <strong>The Magic Shift in Action:</strong>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--labelSecondary)", lineHeight: 1.6 }}>
                        <li>You have $100 funded in your <em>Groceries</em> envelope.</li>
                        <li>You swipe your credit card for $40 at checkout.</li>
                        <li>YNABx automatically transfers $40 from <em>Groceries</em> into <strong>Credit Card Payment: Visa</strong>.</li>
                        <li>Your money stays safe in Checking until you pay your monthly credit card statement!</li>
                      </ol>
                    </div>
                    <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(84, 91, 254, 0.08)", border: "1px solid rgba(84, 91, 254, 0.25)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: "4px", backgroundColor: "rgba(84, 91, 254, 0.15)", color: "var(--actionPrimary, #545bfe)", flexShrink: 0 }}>TIP</span>
                      <div style={{ fontSize: "0.825rem", color: "var(--actionPrimary, #545bfe)", lineHeight: 1.45 }}>
                        Pay your card bill via Transfer from Checking—no expense category needed.
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)", borderRadius: "14px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem", color: "var(--actionPrimary, #545bfe)" }}>
                      The Credit Card Magic Shift Flow
                    </div>

                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--separatorStandard)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", textTransform: "uppercase" }}>Category Envelope</div>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Groceries</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ textDecoration: "line-through", color: "var(--labelSecondary)", marginRight: "8px", fontSize: "0.85rem" }}>$100.00</span>
                          <span style={{ fontWeight: 800, color: "#0d6832", fontSize: "1rem" }}>$60.00 Available</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "var(--actionPrimary, #545bfe)", fontWeight: 700 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                      <span style={{ fontSize: "0.825rem", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)", padding: "4px 14px", borderRadius: "12px", fontWeight: 700 }}>
                        Automatic Shift: +$40.00
                      </span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                    </div>

                    <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "10px", border: "2px solid var(--actionPrimary, #545bfe)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "var(--actionPrimary, #545bfe)", textTransform: "uppercase", fontWeight: 700 }}>Payment Category</div>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Credit Card: Visa</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 800, color: "var(--actionPrimary, #545bfe)", fontSize: "1.1rem" }}>+$40.00 Ready to Pay</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", textAlign: "center" }}>
                      Cash never leaves your bank until you pay the statement!
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================== SLIDE 5: TRANSACTIONS & REGISTERS ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 5 OF 6 • DAILY ROUTINE
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      Tracking Transactions & The Verification Flow
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Record daily receipts in seconds, split shopping bills, and advance transactions through Uncleared, Cleared, and Reconciled states.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)", lineHeight: 1.5 }}>
                        <strong>Daily Tracking Superpowers:</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--labelSecondary)", lineHeight: 1.6 }}>
                        <li><strong>Split Transaction:</strong> Divide one big supermarket receipt into Groceries, Cleaning, and Pharmacy.</li>
                        <li><strong>Account Transfer:</strong> Moving money from Checking to Savings requires no category assignment.</li>
                        <li><strong>Three Verification Flags:</strong> Uncleared (Grey C) → Cleared (Green C) → Reconciled (Lock icon).</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(84, 91, 254, 0.08)", border: "1px solid rgba(84, 91, 254, 0.25)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: "4px", backgroundColor: "rgba(84, 91, 254, 0.15)", color: "var(--actionPrimary, #545bfe)", flexShrink: 0 }}>TIP</span>
                      <div style={{ fontSize: "0.825rem", color: "var(--actionPrimary, #545bfe)", lineHeight: 1.45 }}>
                        Reconcile your accounts once a week so discrepancies never pile up.
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)", borderRadius: "14px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem", color: "var(--labelSecondary)" }}>
                      Transaction Verification Cycle
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ backgroundColor: "#ffffff", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--separatorStandard)", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--labelSecondary, #6e7a88)" }}>
                          <YnabIcon name="cleared_circle" size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--labelPrimary)" }}>Uncleared (Muted C)</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)" }}>Pending or freshly entered receipt before bank settlement</div>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--labelSecondary)", fontWeight: 600 }}>-$25.50</span>
                      </div>

                      <div style={{ backgroundColor: "#ffffff", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--separatorStandard)", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d6832" }}>
                          <YnabIcon name="cleared_circle_fill" size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0d6832" }}>Cleared by Bank (Green C)</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)" }}>Matches official online bank statement</div>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#0d6832", fontWeight: 700 }}>Cleared</span>
                      </div>

                      <div style={{ backgroundColor: "#ffffff", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid var(--separatorStandard)", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--actionPrimary, #545bfe)" }}>
                          <YnabIcon name="lock" size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--actionPrimary, #545bfe)" }}>Reconciled & Locked</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)" }}>Audited against bank statement balance and locked</div>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--actionPrimary, #545bfe)", fontWeight: 700 }}>Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================== SLIDE 6: ROLLOVER & RECONCILE ===================== */}
              <div
                style={{
                  width: `${100 / totalSlides}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    minHeight: "540px",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    borderRadius: "18px",
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr",
                    gap: "2.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(84, 91, 254, 0.12)", color: "var(--actionPrimary, #545bfe)" }}>
                      STEP 6 OF 6 • LONG-TERM SUCCESS
                    </span>
                    <h1 style={{ margin: "0.75rem 0 0.85rem 0", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.25, color: "var(--labelPrimary, #191818)" }}>
                      Month Rollovers & Reconcile Account
                    </h1>
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--labelSecondary, #6e7a88)" }}>
                      Keep your books 100% bulletproof: learn how cash vs credit overspending transitions at month-end, and audit your accounts in under a minute.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ fontSize: "0.88rem", color: "var(--labelPrimary)", lineHeight: 1.5 }}>
                        <strong>Month-End Master Rules:</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--labelSecondary)", lineHeight: 1.6 }}>
                        <li><strong>Positive Available (&gt; 0):</strong> Automatically rolls over 100% into next month&apos;s envelope.</li>
                        <li><strong>Cash Overspent (&lt; 0):</strong> Resets to $0 and deducts directly from next month&apos;s Ready to Assign.</li>
                        <li><strong>Credit Overspent (&lt; 0):</strong> Resets to $0 and converts into credit debt on the card.</li>
                        <li><strong>Reconcile Account:</strong> Match your Cleared balance with your bank statement to lock historical data.</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "rgba(84, 91, 254, 0.08)", border: "1px solid rgba(84, 91, 254, 0.25)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: "4px", backgroundColor: "rgba(84, 91, 254, 0.15)", color: "var(--actionPrimary, #545bfe)", flexShrink: 0 }}>TIP</span>
                      <div style={{ fontSize: "0.825rem", color: "var(--actionPrimary, #545bfe)", lineHeight: 1.45 }}>
                        Click any negative Available pill to open the instant Move Money cover dialog.
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--backgroundSecondary, #f6f4ee)", border: "1px solid var(--separatorStandard, #d2d8de)", borderRadius: "14px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem", color: "var(--labelSecondary)" }}>
                      Month Rollover Behavior Matrix
                    </div>

                    <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid var(--separatorStandard)", overflow: "hidden", fontSize: "0.8rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", padding: "0.6rem 0.85rem", backgroundColor: "var(--backgroundSecondary)", fontWeight: 700, borderBottom: "1px solid var(--separatorStandard)" }}>
                        <span>Status in Month M</span>
                        <span>Transition in Month M+1</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", padding: "0.6rem 0.85rem", borderBottom: "1px solid #e5e5e5", color: "#0d6832", fontWeight: 600 }}>
                        <span>Available &gt; $0.00</span>
                        <span>Rolls over 100% to next month</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", padding: "0.6rem 0.85rem", borderBottom: "1px solid #e5e5e5", color: "#bf2e3b", fontWeight: 600 }}>
                        <span>Cash Overspent</span>
                        <span>Deducted from new Ready to Assign</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", padding: "0.6rem 0.85rem", color: "#8e5b00", fontWeight: 600 }}>
                        <span>Credit Overspent</span>
                        <span>Turns into Credit Card debt</span>
                      </div>
                    </div>

                    {onNavigateToPlan && (
                      <button
                        type="button"
                        onClick={onNavigateToPlan}
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.75rem 1.5rem",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          border: "none",
                          backgroundColor: "var(--actionPrimary, #545bfe)",
                          color: "#ffffff",
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(84, 91, 254, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "transform 0.1s ease",
                        }}
                      >
                        Start Budgeting Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Integrated Bottom Navigation & Progress Dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1.75rem",
            padding: "0 0.5rem",
          }}
        >
          {/* Prev button */}
          <button
            type="button"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              border: "1px solid var(--separatorStandard, #d2d8de)",
              backgroundColor: "#ffffff",
              color: "var(--labelPrimary, #191818)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: currentSlide === 0 ? "not-allowed" : "pointer",
              opacity: currentSlide === 0 ? 0.35 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            Previous
          </button>

          {/* Central Dots & Current Slide Badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  style={{
                    width: idx === currentSlide ? "28px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    backgroundColor: idx === currentSlide ? "var(--actionPrimary, #545bfe)" : "#d2d8de",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.25s ease",
                  }}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--labelSecondary, #6e7a88)" }}>
              Slide {currentSlide + 1} of {totalSlides}
            </span>
          </div>

          {/* Next or Finish button */}
          {currentSlide < totalSlides - 1 ? (
            <button
              type="button"
              onClick={nextSlide}
              style={{
                padding: "0.5rem 1.35rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--actionPrimary, #545bfe)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(84, 91, 254, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              Next Slide
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateToPlan}
              style={{
                padding: "0.5rem 1.35rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0d6832",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(13, 104, 50, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              Start Budgeting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
