import { CostComponent, Currency, ForwarderQuote } from '../types/logistics';

export interface ParsedSnapshot {
  id: string;
  timestamp: number;
  date: string;
  source: string;
  quotes: ForwarderQuote[];
  fileNames: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PriceChange {
  carrier: string;
  destination: string;
  oldPriceUsd: number;
  newPriceUsd: number;
  changeUsd: number;
  changePercent: number;
}

// --- Validation rules ---
const VALID_RANGES = {
  oceanFreightUsd: { min: 500, max: 15000, label: 'Морской фрахт' },
  railFreightRub: { min: 0, max: 600000, label: 'Ж/Д доставка' },
  truckDeliveryRub: { min: 0, max: 300000, label: 'Автовывоз' },
  forwardingFeeRub: { min: 0, max: 200000, label: 'Вознаграждение' },
  terminalExpensesRub: { min: 0, max: 150000, label: 'Терминальные' },
  transitDays: { min: 10, max: 70, label: 'Срок доставки' },
};

export function validateQuote(q: ForwarderQuote): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!q.forwarderName?.trim()) warnings.push({ field: 'forwarderName', message: 'Не указано название перевозчика', severity: 'error' });
  if (!q.destination) warnings.push({ field: 'destination', message: 'Не указан склад назначения', severity: 'error' });
  if (!q.routeDescription?.trim()) warnings.push({ field: 'routeDescription', message: 'Не указано описание маршрута', severity: 'warning' });

  // At least one cost component must be > 0
  const hasCosts = q.oceanFreight.amount > 0 || q.railFreight.amount > 0;
  if (!hasCosts) warnings.push({ field: 'costs', message: 'Нет данных о стоимости (фрахт и ЖД = 0)', severity: 'error' });

  // Range checks
  const checks = [
    { val: q.oceanFreight.amount, range: VALID_RANGES.oceanFreightUsd },
    { val: q.railFreight.amount, range: VALID_RANGES.railFreightRub },
    { val: q.truckDelivery.amount, range: VALID_RANGES.truckDeliveryRub },
    { val: q.forwarderFee.amount, range: VALID_RANGES.forwardingFeeRub },
    { val: q.terminalExpenses.amount, range: VALID_RANGES.terminalExpensesRub },
  ];

  checks.forEach(({ val, range }) => {
    if (val > 0 && val < range.min) {
      warnings.push({ field: range.label, message: `${range.label}: ${val.toLocaleString('ru-RU')} — кажется слишком низким (мин. ~${range.min.toLocaleString('ru-RU')})`, severity: 'warning' });
    }
    if (val > range.max) {
      warnings.push({ field: range.label, message: `${range.label}: ${val.toLocaleString('ru-RU')} — кажется слишком высоким (макс. ~${range.max.toLocaleString('ru-RU')})`, severity: 'warning' });
    }
  });

  // Transit days
  if (q.transitDaysMin > 0 && q.transitDaysMin < VALID_RANGES.transitDays.min) {
    warnings.push({ field: 'transitDays', message: `Срок ${q.transitDaysMin} дн. — подозрительно мало`, severity: 'warning' });
  }
  if (q.transitDaysMax > VALID_RANGES.transitDays.max) {
    warnings.push({ field: 'transitDays', message: `Срок ${q.transitDaysMax} дн. — слишком долго`, severity: 'warning' });
  }

  // Valid until check
  if (q.validUntil) {
    const validDate = new Date(q.validUntil);
    if (validDate < new Date()) {
      warnings.push({ field: 'validUntil', message: `Ставка просрочена (${q.validUntil})`, severity: 'warning' });
    }
  }

  return warnings;
}

export function validateAllQuotes(quotes: ForwarderQuote[]): Map<string, ValidationWarning[]> {
  const result = new Map<string, ValidationWarning[]>();
  quotes.forEach(q => {
    const warnings = validateQuote(q);
    if (warnings.length > 0) result.set(q.id, warnings);
  });
  return result;
}

// --- Migration of old-structure quotes ---
export function normalizeQuote(q: Partial<ForwarderQuote>): ForwarderQuote {
  const is20 = (q.containerSize === '20GP') || /20\s*['']?\s*GP/i.test(q.equipment || '');
  const cost = (c: Partial<CostComponent> | undefined, defaultCurrency: Currency): CostComponent => ({
    amount: Number(c?.amount) || 0,
    currency: c?.currency || defaultCurrency,
  });
  return {
    forwarderName: q.forwarderName ?? '',
    destination: q.destination || 'Серпухов',
    originPort: q.originPort || 'Шанхай',
    routeType: q.routeType || 'sea_vvo_rail_truck',
    transitHub: q.transitHub || '',
    routeDescription: q.routeDescription || '',
    oceanFreight: cost(q.oceanFreight, 'USD'),
    railFreight: cost(q.railFreight, 'RUB'),
    truckDelivery: cost(q.truckDelivery, 'RUB'),
    forwarderFee: cost(q.forwarderFee, 'RUB'),
    terminalExpenses: cost(q.terminalExpenses, 'RUB'),
    transitDaysMin: q.transitDaysMin || 25,
    transitDaysMax: q.transitDaysMax || 40,
    equipment: q.equipment || (is20 ? "20'GP" : "40'HC"),
    containerSize: is20 ? '20GP' : (q.containerSize || '40HC'),
    weightTons: q.weightTons ?? 26,
    maxWeightTons: q.maxWeightTons ?? (is20 ? 21 : 20),
    overweightRateRub: q.overweightRateRub ?? 2000,
    vatRate: q.vatRate ?? 20,
    validUntil: q.validUntil || '2026-10-31',
    comments: q.comments || '',
    favorite: q.favorite,
    note: q.note,
  } as ForwarderQuote;
}

export function normalizeQuotes(quotes: ForwarderQuote[]): ForwarderQuote[] {
  return (quotes || []).map(q => normalizeQuote(q));
}

// --- History / Snapshots ---
const STORAGE_KEY = 'logistics_parse_history';

export function getHistory(): ParsedSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Ремонтируем старые снимки: заполняем недостающие поля и статьи затрат
    return (parsed || []).map((s: ParsedSnapshot) => ({
      ...s,
      quotes: normalizeQuotes(s.quotes || []),
    }));
  } catch {
    return [];
  }
}

export function saveSnapshot(quotes: ForwarderQuote[], fileNames: string[]): ParsedSnapshot {
  const history = getHistory();
  const snapshot: ParsedSnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('ru-RU'),
    source: fileNames.join(', '),
    quotes,
    fileNames,
  };
  history.unshift(snapshot);
  // Keep max 20 snapshots
  if (history.length > 20) history.splice(20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return snapshot;
}

export function deleteSnapshot(id: string) {
  const history = getHistory().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function compareSnapshots(oldSnap: ParsedSnapshot, newSnap: ParsedSnapshot): PriceChange[] {
  const changes: PriceChange[] = [];

  newSnap.quotes.forEach(nq => {
    const oq = oldSnap.quotes.find(
      o => o.forwarderName === nq.forwarderName && o.destination === nq.destination && o.routeType === nq.routeType
    );
    if (oq) {
      const oldTotal = calcTotal(oq);
      const newTotal = calcTotal(nq);
      const diff = newTotal - oldTotal;
      if (Math.abs(diff) > 1) {
        changes.push({
          carrier: nq.forwarderName,
          destination: nq.destination,
          oldPriceUsd: oldTotal,
          newPriceUsd: newTotal,
          changeUsd: diff,
          changePercent: oldTotal > 0 ? Math.round((diff / oldTotal) * 100) : 0,
        });
      }
    }
  });

  return changes;
}

function calcTotal(q: ForwarderQuote): number {
  const rate = 92.5; // approximation for comparison
  const toUsd = (amt: number, cur: string) => cur === 'USD' ? amt : amt / rate;
  return Math.round(
    toUsd(q.oceanFreight.amount, q.oceanFreight.currency) +
    toUsd(q.railFreight.amount, q.railFreight.currency) +
    toUsd(q.truckDelivery.amount, q.truckDelivery.currency) +
    toUsd(q.forwarderFee.amount, q.forwarderFee.currency) +
    toUsd(q.terminalExpenses.amount, q.terminalExpenses.currency)
  );
}

/** Сравнение текущих ставок с последним снимком — для уведомлений и графика */
export function compareNewToLast(
  quotes: ForwarderQuote[],
  prev: ParsedSnapshot | undefined
): PriceChange[] {
  if (!prev) return [];
  const current: ParsedSnapshot = { id: 'current', timestamp: Date.now(), date: 'сейчас', source: 'текущие ставки', quotes, fileNames: [] };
  return compareSnapshots(prev, current);
}

// --- Sync: export/import of all app settings between browsers ---
export const APP_STORAGE_KEYS = [
  'logistics_quotes_v1',
  'logistics_usd_rate',
  'logistics_eur_rub_rate',
  'logistics_cny_rub_rate',
  'logistics_report_date',
  'logistics_parse_history',
];

export function exportAllData(): string {
  const data: Record<string, unknown> = { __app: 'china-rf-logistics', __version: 2 };
  APP_STORAGE_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (value != null) {
      try { data[key] = JSON.parse(value); } catch { data[key] = value; }
    }
  });
  return JSON.stringify(data, null, 2);
}

export function importAllData(raw: string): string[] {
  const data = JSON.parse(raw);
  if (data?.__app && data.__app !== 'china-rf-logistics') {
    throw new Error('Файл не является архивом приложения');
  }
  const restored: string[] = [];
  APP_STORAGE_KEYS.forEach(key => {
    if (data[key] !== undefined) {
      const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
      localStorage.setItem(key, value);
      restored.push(key);
    }
  });
  return restored;
}
