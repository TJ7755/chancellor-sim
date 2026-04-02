const BUDGET_DRAFT_STORAGE_KEY = 'chancellor-budget-draft-v2';
const BUDGET_DRAFT_EVENT = 'chancellor:budget-draft-updated';

export interface BudgetDraftTaxChange {
  id: string;
  name: string;
  currentRate: number;
  proposedRate: number;
  currentRevenue: number;
  projectedRevenue: number;
  unit: string;
}

export interface BudgetDraftSpendingChange {
  id: string;
  department: string;
  programme?: string;
  currentBudget: number;
  proposedBudget: number;
  type: 'resource' | 'capital';
}

export interface BudgetDraft {
  turn: number;
  taxes: [string, BudgetDraftTaxChange][];
  spending: [string, BudgetDraftSpendingChange][];
}

function emitBudgetDraftUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUDGET_DRAFT_EVENT));
}

export function readBudgetDraft(turn?: number): BudgetDraft | null {
  try {
    const raw = localStorage.getItem(BUDGET_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.taxes) || !Array.isArray(parsed.spending)) {
      return null;
    }

    if (typeof turn === 'number' && parsed.turn !== turn) {
      return null;
    }

    return parsed as BudgetDraft;
  } catch {
    return null;
  }
}

export function writeBudgetDraft(draft: BudgetDraft): void {
  try {
    localStorage.setItem(BUDGET_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    emitBudgetDraftUpdate();
  } catch {
    // Ignore storage failures; draft state remains in memory.
  }
}

export function clearBudgetDraft(): void {
  try {
    localStorage.removeItem(BUDGET_DRAFT_STORAGE_KEY);
    emitBudgetDraftUpdate();
  } catch {
    // Ignore storage failures; clearing the persisted draft is best-effort.
  }
}

export function subscribeBudgetDraft(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(BUDGET_DRAFT_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(BUDGET_DRAFT_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
