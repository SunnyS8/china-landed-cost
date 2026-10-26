import {BUILTIN_HS_CODES, HsCodeEntry} from '../data/hsCodes';

export const HS_CODES_STORAGE_KEY = 'logistics_hs_codes_v1';

/** Оставляем только цифры и ограничиваем длину 10 знаками */
export function normalizeHsCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

/** 8708299000 → 8708 29 900 0 */
export function formatHsCode(raw: string): string {
  const code = normalizeHsCode(raw);
  if (code.length !== 10) return code;
  return `${code.slice(0, 4)} ${code.slice(4, 6)} ${code.slice(6, 9)} ${code.slice(9)}`;
}

/** Возвращает текст ошибки или null, если код корректен */
export function validateHsCode(raw: string): string | null {
  const code = normalizeHsCode(raw);
  if (!code) return 'Укажите HS-код (10 цифр)';
  if (code.length !== 10) return `Код должен содержать 10 цифр, сейчас ${code.length}`;
  return null;
}

export function loadCustomHsCodes(): HsCodeEntry[] {
  try {
    const raw = localStorage.getItem(HS_CODES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): HsCodeEntry | null => {
        const code = normalizeHsCode(String(item?.code ?? ''));
        if (code.length !== 10) return null;
        const dutyRate = Number(item?.dutyRate);
        return {
          code,
          title: String(item?.title ?? '').trim() || 'Код из справочника пользователя',
          dutyRate: Number.isFinite(dutyRate) ? dutyRate : null,
          vatRate: Number.isFinite(Number(item?.vatRate)) ? Number(item.vatRate) : undefined,
          source: 'Справочник пользователя',
          warning: item?.warning ? String(item.warning) : undefined,
          custom: true,
        };
      })
      .filter((item): item is HsCodeEntry => item !== null);
  } catch {
    return [];
  }
}

function persistCustomHsCodes(entries: HsCodeEntry[]): void {
  const payload = entries.map(({code, title, dutyRate, vatRate, warning}) => ({
    code, title, dutyRate, vatRate, warning,
  }));
  localStorage.setItem(HS_CODES_STORAGE_KEY, JSON.stringify(payload));
}

/** Коды пользователя перекрывают встроенные записи с тем же кодом */
export function allHsCodes(): HsCodeEntry[] {
  const custom = loadCustomHsCodes();
  const customByCode = new Map(custom.map(entry => [entry.code, entry]));
  const merged = BUILTIN_HS_CODES.map(entry => customByCode.get(entry.code) ?? entry);
  const extra = custom.filter(entry => !BUILTIN_HS_CODES.some(builtin => builtin.code === entry.code));
  return [...merged, ...extra];
}

export function findHsCode(raw: string): HsCodeEntry | undefined {
  const code = normalizeHsCode(raw);
  if (code.length !== 10) return undefined;
  return allHsCodes().find(entry => entry.code === code);
}

/** Поиск для подсказок: по цифрам кода или по названию */
export function searchHsCodes(query: string, limit = 8): HsCodeEntry[] {
  const q = query.trim().toLowerCase();
  const digits = normalizeHsCode(query);
  return allHsCodes()
    .filter(entry => {
      if (digits.length > 0) return entry.code.startsWith(digits);
      if (q.length > 0) return entry.title.toLowerCase().includes(q);
      return true;
    })
    .slice(0, limit);
}

export function saveCustomHsCode(entry: HsCodeEntry): void {
  const code = normalizeHsCode(entry.code);
  if (code.length !== 10) throw new Error('HS-код должен содержать 10 цифр');
  const custom = loadCustomHsCodes().filter(item => item.code !== code);
  custom.push({
    code,
    title: entry.title.trim() || 'Код из справочника пользователя',
    dutyRate: entry.dutyRate,
    vatRate: entry.vatRate,
    warning: entry.warning,
    custom: true,
  });
  persistCustomHsCodes(custom);
}

export function removeCustomHsCode(raw: string): void {
  const code = normalizeHsCode(raw);
  const custom = loadCustomHsCodes().filter(item => item.code !== code);
  persistCustomHsCodes(custom);
}

export function isCustomHsCode(raw: string): boolean {
  const code = normalizeHsCode(raw);
  return loadCustomHsCodes().some(item => item.code === code);
}
