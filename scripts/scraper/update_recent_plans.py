with open('frontend/src/components/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                        <div className="menu-heading">Recent Plans</div>
                        {plans.map((p) => {
                          const isCurrent = p.id === activePlan?.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`menu-item js-menu-item recent-budgets-budget-open ${isCurrent ? "is-selected" : ""}`}
                              onClick={() => {
                                onSelectPlan(p.id);
                                setPlanMenuOpen(false);
                                setOpenPlanSubmenu(false);
                              }}
                            >
                              <svg className="ynab-new-icon" width="16" height="16">
                                <use href="#icon_sprite_document"></use>
                              </svg>
                              <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", marginRight: isCurrent ? "4px" : "0" }}>
                                {p.currency_code}
                              </span>
                              {isCurrent && (
                                <svg className="ynab-new-icon" width="12" height="12" style={{ color: "var(--actionPrimary, #545bfe)" }}>
                                  <use href="#icon_sprite_check"></use>
                                </svg>
                              )}
                            </button>
                          );
                        })}"""

replacement = """                        <div className="menu-heading">Recent Plans</div>
                        {(() => {
                          const otherPlans = plans.filter((p) => p.id !== activePlan?.id);
                          if (otherPlans.length === 0) {
                            return (
                              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "var(--labelSecondary)", fontStyle: "italic" }}>
                                No other plans
                              </div>
                            );
                          }
                          return otherPlans.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="menu-item js-menu-item recent-budgets-budget-open"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setPlanMenuOpen(false);
                                setOpenPlanSubmenu(false);
                              }}
                            >
                              <svg className="ynab-new-icon" width="16" height="16">
                                <use href="#icon_sprite_document"></use>
                              </svg>
                              <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
                            </button>
                          ));
                        })()}"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

if target_norm in content_norm:
    content_norm = content_norm.replace(target_norm, replacement_norm)
    with open('frontend/src/components/Sidebar.tsx', 'w', encoding='utf-8', newline='\n') as f:
        f.write(content_norm)
    print("Updated Recent Plans in Sidebar.tsx successfully!")
else:
    print("Target not found in content!")
