import {ExtraExpense} from '../types/logistics';
import {EXTRA_EXPENSE_PRESET, EXTRA_VAT_RATE} from '../data/extraExpenses';

const STORAGE_KEY = 'logistics_extra_expenses_v1';

function readSaved(): ExtraExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ExtraExpense =>
        !!e && typeof e.id === 'string' && typeof e.name === 'string',
    );
  } catch {
    return [];
  }
}

export function saveExtraExpenses(expenses: ExtraExpense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    /* переполнение квоты не должно ломать расчёт */
  }
}

/**
 * Загружает статьи: пресет (встроенные позиции) поверх сохранённых значений
 * + пользовательские статьи. Так новые позиции пресета появляются у всех,
 * а заполненные суммы и включения сохраняются между сессиями.
 */
export function loadExtraExpenses(): ExtraExpense[] {
  const saved = readSaved();
  const byId = new Map(saved.map(e => [e.id, e]));
  const custom = saved.filter(e => !EXTRA_EXPENSE_PRESET.some(p => p.id === e.id));

  const merged = EXTRA_EXPENSE_PRESET.map(p => {
    const s = byId.get(p.id);
    if (!s) return {...p};
    return {
      ...p,
      name: s.name || p.name,
      amountRub: Number.isFinite(s.amountRub) ? s.amountRub : 0,
      vat: typeof s.vat === 'boolean' ? s.vat : p.vat,
      enabled: s.enabled === true,
      builtin: true,
    };
  });

  return [...merged, ...custom.map(e => ({...e, builtin: false}))];
}

export interface ExtraExpensesTotals {
  /** Сумма включённых статей, ₽ (с НДС, как в счётах) */
  totalRub: number;
  /** В т.ч. НДС, выделенный из статей с включённым переключателем, ₽ */
  vatRub: number;
  /** База без НДС — на случай отдельной аналитики, ₽ */
  netRub: number;
  /** Сколько статей с ненулевой суммой участвуют */
  activeCount: number;
}

/**
 * Считает блок доп. расходов.
 * Суммы вводятся с НДС (как в счёте), поэтому итог блока — просто сумма включённых статей.
 * НДС-переключатель только выделяет из суммы его часть для отчёта, на итог не влияет.
 */
export function calculateExtraExpenses(
  expenses: ExtraExpense[],
  vatRate: number = EXTRA_VAT_RATE,
): ExtraExpensesTotals {
  const rate = Number.isFinite(vatRate) && vatRate > 0 ? vatRate : 0;
  let totalRub = 0;
  let vatRub = 0;
  let activeCount = 0;

  for (const e of expenses) {
    if (!e.enabled) continue;
    const amount = Number(e.amountRub);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totalRub += amount;
    activeCount += 1;
    if (e.vat && rate > 0) {
      // сумма с НДС -> в т.ч. НДС
      vatRub += (amount * rate) / (100 + rate);
    }
  }

  const total = Math.round(totalRub);
  const vat = Math.round(vatRub);
  return {totalRub: total, vatRub: vat, netRub: total - vat, activeCount};
}
