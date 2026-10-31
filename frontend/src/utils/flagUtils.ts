export type FlagColor = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE" | "PURPLE";

export const FLAG_OPTIONS: { name: string; color: FlagColor; key: string }[] = [
  { name: "Red", color: "RED", key: "1" },
  { name: "Orange", color: "ORANGE", key: "2" },
  { name: "Yellow", color: "YELLOW", key: "3" },
  { name: "Green", color: "GREEN", key: "4" },
  { name: "Blue", color: "BLUE", key: "5" },
  { name: "Purple", color: "PURPLE", key: "6" },
];

export function getStoredFlags(planId: string): Record<string, FlagColor> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(`ynabx_tx_flags_${planId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredFlags(planId: string, flags: Record<string, FlagColor>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`ynabx_tx_flags_${planId}`, JSON.stringify(flags));
  } catch {
    // Ignore storage errors in private browsing
  }
}

export function setStoredTransactionFlag(
  planId: string,
  txId: string,
  color: FlagColor | null,
): Record<string, FlagColor> {
  const current = getStoredFlags(planId);
  if (color) {
    current[txId] = color;
  } else {
    delete current[txId];
  }
  saveStoredFlags(planId, current);
  return { ...current };
}

export function setStoredBatchTransactionFlags(
  planId: string,
  txIds: string[],
  color: FlagColor | null,
): Record<string, FlagColor> {
  const current = getStoredFlags(planId);
  for (const id of txIds) {
    if (color) {
      current[id] = color;
    } else {
      delete current[id];
    }
  }
  saveStoredFlags(planId, current);
  return { ...current };
}
