import React, { useState } from "react";

// INVARIANT: All internal monetary math uses integer milliunits (1000 = $1.00)
export function formatMilliunits(milliunits: number): string {
  const isNegative = milliunits < 0;
  const abs = Math.abs(milliunits);
  const dollars = Math.floor(abs / 1000);
  const cents = Math.round((abs % 1000) / 10);
  const centsStr = cents.toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}$${dollars.toLocaleString()}.${centsStr}`;
}

export function parseInputToMilliunits(input: string): number {
  const sanitized = input.replace(/[$, ]/g, "");
  const parsed = parseFloat(sanitized);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 1000);
}

export default function App(): React.JSX.Element {
  const [readyToAssign] = useState<number>(1540250); // $1,540.25

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <header
        style={{
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0, color: "#1e293b" }}>ynabx</h1>
        <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>
          Zero-Based Envelope Budgeting
        </p>
      </header>

      <main>
        <section
          style={{
            background: readyToAssign >= 0 ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${readyToAssign >= 0 ? "#a7f3d0" : "#fecaca"}`,
            borderRadius: "8px",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "#475569",
              textTransform: "uppercase",
            }}
          >
            Ready to Assign
          </h2>
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              color: readyToAssign >= 0 ? "#059669" : "#dc2626",
              marginTop: "0.5rem",
            }}
          >
            {formatMilliunits(readyToAssign)}
          </div>
        </section>
      </main>
    </div>
  );
}
