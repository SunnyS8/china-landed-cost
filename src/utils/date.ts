/** Форматирование ISO-даты (YYYY-MM-DD) в российский вид DD.MM.YYYY */
export function formatIsoRu(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Локальная дата в формате YYYY-MM-DD (без сдвига UTC) */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Прибавляет дни к ISO-дате (YYYY-MM-DD) */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Срок действия ставки по умолчанию: сегодня + 30 дней */
export function defaultValidUntil(days = 30): string {
  return addDaysIso(todayIso(), days);
}

