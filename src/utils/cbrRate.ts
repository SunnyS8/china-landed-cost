import {ExchangeRates} from '../types/logistics';
import {formatIsoRu, todayIso, addDaysIso} from './date';

export {formatIsoRu, todayIso};

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

/**
 * Прямой источник курса ЦБ РФ — зеркало cbr-xml-daily.ru.
 * В отличие от cbr.ru оно отдаёт CORS-заголовки (`Access-Control-Allow-Origin: *`),
 * поэтому браузер обращается к нему напрямую, без прокси-сервера.
 */
const MIRROR = 'https://www.cbr-xml-daily.ru';
/** Сколько дней назад ищем ближайший торговый день, если архив по дате пуст (выходные/праздники) */
const ARCHIVE_LOOKBACK_DAYS = 6;

interface MirrorPayload {
  /** ISO с временем, например "2026-10-24T11:30:00+03:00" */
  Date?: string;
  Valute?: Record<string, {Nominal?: number; Value?: number}>;
}

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

function valuteRate(payload: MirrorPayload, code: string): number | null {
  const unit = payload.Valute?.[code];
  if (!unit || typeof unit.Value !== 'number') return null;
  const nominal = typeof unit.Nominal === 'number' && unit.Nominal > 0 ? unit.Nominal : 1;
  const rate = unit.Value / nominal;
  return rate > 0 ? rate : null;
}

function isoFromPayloadDate(payload: MirrorPayload, fallback: string): string {
  if (typeof payload.Date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(payload.Date)) {
    return payload.Date.slice(0, 10);
  }
  return fallback;
}

async function fetchJson(url: string, timeoutMs: number): Promise<MirrorPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {signal: controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as MirrorPayload;
  } finally {
    clearTimeout(timer);
  }
}

function toRates(payload: MirrorPayload, requestedDate: string): CbrRates {
  const usd = valuteRate(payload, 'USD');
  if (usd == null) throw new Error('bad data');
  return {
    date: isoFromPayloadDate(payload, requestedDate),
    requestedDate,
    usdRub: usd,
    eurRub: valuteRate(payload, 'EUR') ?? usd * 1.08,
    cnyRub: valuteRate(payload, 'CNY') ?? usd / 7.1,
    source: 'cbr',
  };
}

/**
 * Курс ЦБ РФ на конкретную дату.
 * - на сегодня/будущее: текущий курс (`daily_json.js` — ближайший опубликованный торговый день);
 * - на прошедшую дату: архив по дате, при промахе (выходные/праздники) отступаем назад
 *   до ближайшего опубликованного дня.
 * Фактическая дата курса всегда приходит в поле `date`.
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
  try {
    const rates = await fetchCurrentOrArchive(isoDate, timeoutMs);
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

  if (cached) return fromEntry(cached, isoDate, true);
  throw lastError instanceof Error ? lastError : new Error('CBR unreachable');
}

async function fetchCurrentOrArchive(isoDate: string, timeoutMs: number): Promise<CbrRates> {
  const today = todayIso();
  // На сегодня или будущее — берём текущий опубликованный курс
  if (isoDate >= today) {
    return toRates(await fetchJson(`${MIRROR}/daily_json.js`, timeoutMs), isoDate);
  }

  // Прошедшая дата — архив; если по дате нет (выходной/праздник), отступаем назад
  let lastError: unknown = null;
  for (let i = 0; i <= ARCHIVE_LOOKBACK_DAYS; i++) {
    const day = addDaysIso(isoDate, -i);
    const [y, m, d] = day.split('-');
    try {
      return toRates(await fetchJson(`${MIRROR}/archive/${y}/${m}/${d}/daily_json.js`, timeoutMs), isoDate);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('CBR archive unreachable');
}

/** Сохранённые курсы без обращения к сети (для мгновенного старта) */
export function getCachedCbrRates(isoDate: string): CbrRates | null {
  const entry = readCache()[isoDate];
  return entry ? fromEntry(entry, isoDate) : null;
}
