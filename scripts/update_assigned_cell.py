with open('desktop/src/components/BudgetWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
i = 0
found = False
while i < len(lines):
    line = lines[i]
    if '{/* Assigned Cell */}' in line and not found:
        found = True
        out.append(line)
        # Scan until {/* Activity Cell */}
        j = i + 1
        while j < len(lines) and '{/* Activity Cell */}' not in lines[j]:
            j += 1
        
        replacement = """                              <div
                                className={`budget-table-cell-budgeted budget-table-row-li ${
                                  isEditing ? "is-editing" : ""
                                }`}
                                role="cell"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditing) startEditingAssigned(cat);
                                }}
                              >
                                {isEditing ? (
                                  <div className="ynab-new-currency-input is-editing is-focused">
                                    <div className="input-wrapper">
                                      <input
                                        type="text"
                                        autoFocus
                                        className="ember-text-field assigned-cell-input tabular-nums"
                                        value={editingInput}
                                        onChange={(e) =>
                                          setEditingInput(e.target.value)
                                        }
                                        onBlur={() => void commitAssignedEdit(cat)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            void commitAssignedEdit(cat);
                                          } else if (e.key === "ArrowDown") {
                                            e.preventDefault();
                                            void commitAssignedEdit(cat, "DOWN");
                                          } else if (e.key === "ArrowUp") {
                                            e.preventDefault();
                                            void commitAssignedEdit(cat, "UP");
                                          } else if (e.key === "Tab") {
                                            e.preventDefault();
                                            void commitAssignedEdit(
                                              cat,
                                              e.shiftKey ? "UP" : "DOWN",
                                            );
                                          } else if (e.key === "Escape") {
                                            setEditingCategoryId(null);
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="user-data currency tabular-nums assigned-cell-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingAssigned(cat);
                                    }}
                                  >
                                    <bdi>
                                      {formatMilliunits(cat.assigned_milliunits)}
                                    </bdi>
                                  </button>
                                )}
                              </div>
"""
        out.append(replacement)
        i = j
    else:
        out.append(line)
        i += 1

with open('desktop/src/components/BudgetWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out)
print("UPDATED SUCCESSFULLY")
