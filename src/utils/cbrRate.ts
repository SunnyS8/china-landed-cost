import {ExchangeRates} from '../types/logistics';

export interface CbrRates extends ExchangeRates {
  /** Дата, на которую ЦБ РФ фактически опубликовал курс (ISO) */
  date: string;
  /** Дата, которую запрашивали (ISO) */
  requestedDate: string;
  /** Курс получен с сервера ЦБ или из локального кэша */
  source: 'cbr' | 'cache';
  /** true, если кэш старше допустимого и сеть недоступна */
  stale?: boolean;
}

export const DEFAULT_RATES: ExchangeRates = {usdRub: 92.5, eurRub: 108, cnyRub: 13};

/** Локальная дата в формате YYYY-MM-DD (без сдвига UTC) */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function dmyToIso(dmy: string): string {
  const [d, m, y] = dmy.split('.');
  return `${y}-${m}-${d}`;
}

export function formatIsoRu(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return isoToDmy(iso);
}

/**
 * Прокси нужен потому, что cbr.ru не отдаёт CORS-заголовки, а приложение
 * развёрнуто как статика на GitHub Pages. Первый доступный адрес выигрывает.
 */
const ENDPOINTS: string[] = [
  import.meta.env.VITE_CBR_API_URL,          // свой прокси, если задан в .env
  import.meta.env.DEV ? '/api/cbr' : '',     // dev-плагин Vite
  'https://china-rf-logistics.vercel.app/api/cbr', // резервный прокси
].filter((url): url is string => Boolean(url));

const CACHE_KEY = 'logistics_cbr_cache_v1';
/** Для прошедших дат курс неизменен, для текущей — обновляем несколько раз в день */
const TODAY_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  date: string;
  usdRub: number;
  eurRub: number;
  cnyRub: number;
  fetchedAt: number;
}

type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Cache : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* переполнение квоты не должно ломать расчёт */
  }
}

function isFresh(entry: CacheEntry, requestedIso: string): boolean {
  if (requestedIso < todayIso()) return true;
  return Date.now() - entry.fetchedAt < TODAY_TTL_MS;
}

function fromEntry(entry: CacheEntry, requestedDate: string, stale = false): CbrRates {
  return {
    date: entry.date,
    requestedDate,
    usdRub: entry.usdRub,
    eurRub: entry.eurRub,
    cnyRub: entry.cnyRub,
    source: 'cache',
    stale,
  };
}

async function fetchFrom(endpoint: string, isoDate: string, timeoutMs: number): Promise<CbrRates> {
  const dmy = isoToDmy(isoDate);
  const url = `${endpoint}?date=${encodeURIComponent(dmy)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {signal: controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.usdRub !== 'number' || data.usdRub <= 0) throw new Error('bad data');
    return {
      date: typeof data.date === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(data.date)
        ? dmyToIso(data.date)
        : isoDate,
      requestedDate: isoDate,
      usdRub: data.usdRub,
      eurRub: data.eurRub ?? data.usdRub * 1.08,
      cnyRub: data.cnyRub ?? data.usdRub / 7.1,
      source: 'cbr',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Курс ЦБ РФ на конкретную дату.
 * 1. Свежий кэш по этой дате — без сети.
 * 2. Прокси (свой → dev-плагин → резервный Vercel).
 * 3. Устаревший кэш, если сеть недоступна.
 * Для выходных и праздников ЦБ возвращает курс ближайшего торгового дня —
 * фактическая дата всегда приходит в поле `date`.
 */
const inFlight = new Map<string, Promise<CbrRates>>();

export function fetchCbrRates(isoDate: string, timeoutMs = 8000): Promise<CbrRates> {
  const running = inFlight.get(isoDate);
  if (running) return running;
  const request = loadCbrRates(isoDate, timeoutMs).finally(() => inFlight.delete(isoDate));
  inFlight.set(isoDate, request);
  return request;
}

async function loadCbrRates(isoDate: string, timeoutMs: number): Promise<CbrRates> {
  const cache = readCache();
  const cached = cache[isoDate];
  if (cached && isFresh(cached, isoDate)) return fromEntry(cached, isoDate);

  let lastError: unknown = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const rates = await fetchFrom(endpoint, isoDate, timeoutMs);
      writeCache({
        ...cache,
        [isoDate]: {
          date: rates.date,
          usdRub: rates.usdRub,
          eurRub: rates.eurRub,
          cnyRub: rates.cnyRub,
          fetchedAt: Date.now(),
        },
      });
      return rates;
    } catch (e) {
      lastError = e;
    }
  }

  if (cached) return fromEntry(cached, isoDate, true);
  throw lastError instanceof Error ? lastError : new Error('CBR unreachable');
}

/** Сохранённые курсы без обращения к сети (для мгновенного старта) */
export function getCachedCbrRates(isoDate: string): CbrRates | null {
  const entry = readCache()[isoDate];
  return entry ? fromEntry(entry, isoDate) : null;
}
