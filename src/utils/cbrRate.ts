import {ExchangeRates} from '../types/logistics';

export interface CbrRates extends ExchangeRates {
  date: string;
}

export const DEFAULT_RATES: ExchangeRates = {usdRub: 92.5, eurRub: 108, cnyRub: 13};

function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Fetch CBR rates via our own serverless proxy (/api/cbr).
 * The proxy calls cbr.ru server-side (no CORS issues) and supports any historical date.
 */
export async function fetchCbrRates(isoDate: string, timeoutMs = 10000): Promise<CbrRates> {
  const dmy = isoToDmy(isoDate);
  const url = `/api/cbr?date=${encodeURIComponent(dmy)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {signal: controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.usdRub !== 'number' || data.usdRub <= 0) throw new Error('bad data');
    return {
      date: data.date || isoDate,
      usdRub: data.usdRub,
      eurRub: data.eurRub ?? data.usdRub * 1.08,
      cnyRub: data.cnyRub ?? data.usdRub / 7.1,
    };
  } finally {
    clearTimeout(timer);
  }
}
