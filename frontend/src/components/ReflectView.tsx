import type { Account, PlanMonthSummary } from "../api/types";
import { useMockReflect } from "../hooks/useUiOnlyFeatures";
import { formatMilliunits } from "../utils/currency";

export interface ReflectViewProps {
  monthSummary: PlanMonthSummary | null;
  accounts: Account[];
  currencySymbol?: string;
}

export function ReflectView({
  monthSummary,
  accounts,
  currencySymbol = "$",
}: ReflectViewProps) {
  const reflect = useMockReflect(monthSummary, accounts);

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem 2rem",
        overflowY: "auto",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
          Reflect
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          Spending Breakdown & Net Worth Overview
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Spending Breakdown Card */}
        <section
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--separator)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              Spending Breakdown
            </h2>
            <span className="tabular-nums" style={{ fontWeight: 700 }}>
              Total:{" "}
              {formatMilliunits(reflect.totalSpendingMilliunits, {
                currencySymbol,
              })}
            </span>
          </div>

          {reflect.spendingItems.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
              }}
            >
              No spending activity recorded for this month yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {reflect.spendingItems.map((item) => {
                const widthPercent = (
                  item.percentageBasisPoints / 100
                ).toFixed(1);
                return (
                  <div key={item.categoryId}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {item.categoryName}
                      </span>
                      <span className="tabular-nums">
                        {formatMilliunits(item.spentMilliunits, {
                          currencySymbol,
                        })}{" "}
                        ({widthPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        borderRadius: "999px",
                        backgroundColor: "var(--separator)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: "100%",
                          backgroundColor: "var(--action-primary)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Net Worth Card */}
        <section
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--separator)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h2
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.05rem",
              fontWeight: 700,
            }}
          >
            Net Worth
          </h2>

          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              fontSize: "0.9rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid var(--separator)",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Assets</span>
              <span
                className="tabular-nums"
                style={{ fontWeight: 600, color: "var(--pill-positive-text)" }}
              >
                {formatMilliunits(reflect.assetsMilliunits, { currencySymbol })}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid var(--separator)",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Debts</span>
              <span
                className="tabular-nums"
                style={{ fontWeight: 600, color: "var(--pill-negative-text)" }}
              >
                {formatMilliunits(reflect.debtsMilliunits, { currencySymbol })}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "0.25rem",
                fontSize: "1.05rem",
              }}
            >
              <span style={{ fontWeight: 700 }}>Total Net Worth</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>
                {formatMilliunits(reflect.netWorthMilliunits, {
                  currencySymbol,
                })}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
