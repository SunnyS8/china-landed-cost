import {
  ContainerSize,
  CostComponent,
  Currency,
  DestinationWarehouse,
  ForwarderQuote,
  RouteType,
} from '../types/logistics';
import { defaultValidUntil, todayIso } from './date';

export interface ParsedIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface ParsedQuoteDraft {
  id: string;
  /** Исходный фрагмент текста, из которого собрана ставка */
  source: string;
  forwarderName: string;
  destination: DestinationWarehouse;
  originPort: string;
  routeType: RouteType;
  routeDescription: string;
  oceanFreight: CostComponent;
  railFreight: CostComponent;
  truckDelivery: CostComponent;
  forwarderFee: CostComponent;
  terminalExpenses: CostComponent;
  transitDaysMin: number;
  transitDaysMax: number;
  containerSize: ContainerSize;
  weightTons: number;
  maxWeightTons: number;
  overweightRateRub: number;
  vatRate: number;
  validUntil: string;
  comments: string;
  issues: ParsedIssue[];
}

type CostField = 'ocean' | 'rail' | 'truck' | 'fee' | 'terminal';

const COST_LABELS: Record<CostField, string> = {
  ocean: 'фрахт',
  rail: 'Ж/Д',
  truck: 'автовывоз',
  fee: 'комиссия',
  terminal: 'терминал',
};

/* ────────────────────────────  Суммы  ──────────────────────────── */

const MONEY_RE =
  /(\d[\d\s.,]*\d|\d)\s*(USD|US\$|RUB|EUR|CNY|RMB|\$|€|¥|₽|доллар[а-я]*|долл\.?|юан[а-я]*|руб[а-я]*|р\.)/gi;

function parseMoneyNumber(raw: string): number {
  let s = raw.replace(/[\s\u00a0]/g, '');
  // 210,000 / 210.000 — это тысячи, а не дробь
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function detectCurrency(symbol: string): Currency {
  const s = symbol.toLowerCase();
  if (s.includes('usd') || s.includes('$') || s.includes('долл')) return 'USD';
  if (s.includes('eur') || s.includes('€')) return 'EUR';
  if (s.includes('cny') || s.includes('rmb') || s.includes('¥') || s.includes('юан')) return 'CNY';
  return 'RUB';
}

const COST_PATTERNS: Array<{ field: CostField | 'skip'; re: RegExp }> = [
  { field: 'skip', re: /перевес|демередж|детеншн|штраф|неустойк|ндс|vat|страхов|стоимост[ьи] товар/gi },
  // Ж/Д раньше общего «фрахт», иначе «Ж/Д фрахт» уедет в море
  { field: 'rail', re: /ж\s*\/?\s*д|ж-д|железнодорож|ржд|rail|забайкальск|ворсино|до москвы|до ростов|до краснодар|до тимашевск|до екатеринбург/gi },
  { field: 'ocean', re: /океан|морск|море|фрахт|freight|fob|фоб|ocean|до владивостока|до новоросс|линия/gi },
  { field: 'truck', re: /авто|вывоз|доставк|последн|last\s*mile|трак|фур[аы]|машин|до склада/gi },
  { field: 'fee', re: /экспедир|вознагражд|комисси|агентск|fee|forwarding|услуги агент/gi },
  { field: 'terminal', re: /терминал|dthc|thc|свх|растамож|таможенн|порт[о ]?сбор|погруз|выгруз|хранен/gi },
];

/** Определяет статью по ближайшему ключевому слову перед суммой */
function detectCostField(prefix: string): CostField | 'skip' | null {
  let best: { field: CostField | 'skip'; pos: number } | null = null;

  for (const pattern of COST_PATTERNS) {
    const re = new RegExp(pattern.re.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(prefix)) !== null) {
      if (m.index === re.lastIndex) re.lastIndex++;
      if (!best || m.index > best.pos) best = { field: pattern.field, pos: m.index };
    }
  }

  return best ? best.field : null;
}

interface ExtractedCost extends CostComponent {
  field: CostField | null;
  raw: string;
}

function extractCosts(block: string): { costs: ExtractedCost[]; unassigned: string[] } {
  const costs: ExtractedCost[] = [];
  const unassigned: string[] = [];
  MONEY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = MONEY_RE.exec(block)) !== null) {
    const raw = `${match[1]} ${match[2]}`;
    if (seen.has(raw)) continue;
    seen.add(raw);

    const amount = parseMoneyNumber(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    // «40HC 26тн» и прочие габариты отсекаем: суммы меньше 100 без валюты ₽/$ обычно не деньги
    const prefix = block.slice(Math.max(0, match.index - 60), match.index);
    const field = detectCostField(prefix);
    if (field === 'skip') continue;

    const currency = detectCurrency(match[2]);
    if (field === null && amount < 100) continue;

    costs.push({ amount, currency, field, raw });
    if (field === null) unassigned.push(raw);
  }

  return { costs, unassigned };
}

/* ────────────────────────────  Маршрут  ──────────────────────────── */

function detectDestination(text: string): DestinationWarehouse | null {
  const s = text.toLowerCase();
  if (/ставрополь|став\./.test(s)) return 'Ставрополь';
  if (/серпухов|москв|мск|ворсино|подольск|дёгтино|дегтино/.test(s)) return 'Серпухов';
  return null;
}

function detectOriginPort(text: string): string {
  const s = text.toLowerCase();
  if (/циндао|qingdao/.test(s)) return 'Циндао';
  if (/нинбо|нингбо|ningbo/.test(s)) return 'Нинбо';
  if (/шанхай|shanghai/.test(s)) return 'Шанхай';
  return 'Шанхай';
}

function detectRouteType(text: string): RouteType {
  const s = text.toLowerCase();
  if (/новоросс|нутеп|deep\s*sea|ч[её]рн[оы][емг]? мор/.test(s)) return 'deep_sea_novorossiysk';
  if (/прям(ое|ой|ым|ой)?\s*(ж\s*\/?\s*д|жд|поезд|контейнерн)|direct\s*rail|прямой поезд/.test(s)) {
    return 'direct_rail_truck';
  }
  return 'sea_vvo_rail_truck';
}

function detectContainer(text: string): ContainerSize {
  return /20\s*(?:gp|фут|ft|')/i.test(text) ? '20GP' : '40HC';
}

function detectWeight(text: string): number | null {
  const m = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:тн|тонн|т\b)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function detectMaxWeight(text: string): number | null {
  const m = text.match(/(?:включ[её]н\w*|до)\s*(\d{1,2}(?:[.,]\d)?)\s*(?:тн|тонн|т\b)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function detectOverweightRate(text: string): number | null {
  const m = text.match(/перевес[^\d]{0,25}(\d[\d\s]{0,7})\s*(?:₽|руб|р\.)/i);
  if (!m) return null;
  const n = parseMoneyNumber(m[1]);
  return n > 0 ? n : null;
}

function detectVat(text: string): number | null {
  const s = text.toLowerCase();
  if (/без\s*ндс/.test(s)) return 0;
  const m = s.match(/ндс\s*[:\-]?\s*(\d{1,2})\s*%?/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 0 && n <= 30 ? n : null;
}

function detectDays(text: string): [number, number] | null {
  const range = text.match(/(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:дн|дней|дня|сут)/i);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    if (a > 0 && b >= a) return [a, b];
  }
  const single = text.match(/(?:срок|транзит|доставк)[^\d]{0,20}(\d{1,3})\s*(?:дн|дней|сут)?/i)
    || text.match(/(\d{1,3})\s*(?:дн|дней)/i);
  if (single) {
    const a = parseInt(single[1], 10);
    if (a > 0) return [a, a + 5];
  }
  return null;
}

function detectValidUntil(text: string): string | null {
  const m = text.match(/(?:ставка\s*)?(?:действ[а-я]*|до)\s*(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const now = new Date();
  let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
  if (year < 100) year += 2000;

  let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // дата без года, которая уже прошла — значит, следующий год
  if (!m[3] && iso < todayIso()) {
    iso = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return iso;
}

function detectForwarderName(block: string, lines: string[]): string | null {
  return detectExplicitCarrier(block) ?? detectHeaderCarrier(block, lines);
}

/* ────────────────────────────  Разбиение  ──────────────────────────── */

function hasMoney(line: string): boolean {
  MONEY_RE.lastIndex = 0;
  return MONEY_RE.test(line);
}

/** «Перевозчик: ООО Логистика» — только с двоеточием/тире, иначе ловит «экспедитора 15 000 руб» */
function detectExplicitCarrier(block: string): string | null {
  const m = block.match(/(?:перевозчик|экспедитор|компания|фирма)\s*[:\-–—]\s*([^,\n;|]{2,60})/i);
  if (!m) return null;
  const name = m[1].replace(/[«»"']/g, '').replace(/[.,;:]+$/, '').trim();
  if (!name || /^\d/.test(name) || !/[а-яёa-z]{2,}/i.test(name)) return null;
  // Строка вида «экспедитора: 15 000 руб» — это цена, а не название
  if (hasMoney(name) || /(руб|usd|eur|cny|₽)/i.test(name)) return null;
  return name;
}

/** Название из первой строки блока, если это не маршрут, не сумма и не подпись */
function detectHeaderCarrier(block: string, lines: string[]): string | null {
  const first = (lines[0] ?? '').trim();
  if (!first || first.length > 60) return null;
  if (/^\d/.test(first)) return null;
  if (/^(маршрут|route|добр|здравств|коммерческ|предложени|ставк|срок|итог)/i.test(first) || /^кп(?![a-zа-яё])/i.test(first)) return null;
  if (hasMoney(first) || /фрахт|руб|\busd\b|\bcny\b|€|₽|тыс\.?\s*руб/i.test(first)) return null;

  const name = first
    .replace(/^(?:перевозчик|компания)\s*[:\-–—]\s*/i, '')
    .replace(/[«»"']/g, '')
    // «ИГЛ Логистика, коммерческое предложение от 24.10.2026» → «ИГЛ Логистика»
    .split(/[,;|]/)[0]
    .replace(/\s+(?:[-–—]\s*)?(?:кп|коммерческ\w*|предложени\w*).*/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();
  if (name.length < 2 || !/[а-яёa-z]{2,}/i.test(name)) return null;
  return name;
}

function hasDestination(line: string): boolean {
  return /серпухов|ставрополь|москв|мск|ворсино/i.test(line);
}

function splitIntoBlocks(raw: string): string[] {
  const text = raw.replace(/\r/g, '').trim();
  if (!text) return [];

  const paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
  const blocks: string[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      blocks.push(paragraph);
      continue;
    }

    // Один абзац может содержать несколько маршрутов: режем по строкам-заголовкам
    let current = '';
    for (const line of lines) {
      const startsNew =
        /^\s*\d+[.)]\s+/.test(line) || /^(маршрут|route)(?![a-zа-яё])/i.test(line) || (hasMoney(line) && hasDestination(line));
      if (startsNew && current.trim()) {
        blocks.push(current.trim());
        current = line;
      } else {
        current = current ? `${current} ${line}` : line;
      }
    }
    if (current.trim()) blocks.push(current.trim());
  }

  return blocks.length > 0 ? blocks : [text];
}

/* ────────────────────────────  Основная функция  ──────────────────────────── */

export function parseQuotesText(raw: string): ParsedQuoteDraft[] {
  const blocks = splitIntoBlocks(raw);
  const drafts: ParsedQuoteDraft[] = [];
  // Название из строки-шапки (например, «ООО ИГЛ Логистика» перед таблицей маршрутов)
  let sectionCarrier: string | null = null;

  blocks.forEach((block, index) => {
    // Слишком короткие обрывки (подписи, телефоны) пропускаем
    if (block.replace(/[^\wа-яё]/gi, '').length < 8) return;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const { costs, unassigned } = extractCosts(block);
    if (costs.length === 0) {
      // Абзац без сумм — возможно, шапка с названием компании
      const headerName = detectForwarderName(block, lines);
      if (headerName && headerName.length <= 60) sectionCarrier = headerName;
      return;
    }

    const destination = detectDestination(block);
    const containerSize = detectContainer(block);
    const routeType = detectRouteType(block);
    const days = detectDays(block);
    const forwarderName = detectForwarderName(block, lines) ?? sectionCarrier;

    const issues: ParsedIssue[] = [];

    // Раскладываем суммы по статьям
    const values: Record<CostField, CostComponent> = {
      ocean: { amount: 0, currency: 'USD' },
      rail: { amount: 0, currency: 'RUB' },
      truck: { amount: 0, currency: 'RUB' },
      fee: { amount: 0, currency: 'RUB' },
      terminal: { amount: 0, currency: 'RUB' },
    };
    const order: CostField[] = ['ocean', 'rail', 'truck', 'fee', 'terminal'];
    let fallbackUsed = false;

    for (const cost of costs) {
      let field = cost.field;
      if (!field) {
        // Без ключевого слова: валюту в USD/CNY/EUR считаем фрахтом,
        // рубли раскладываем по порядку статей
        const candidates: CostField[] =
          cost.currency === 'RUB'
            ? ['rail', 'truck', 'fee', 'terminal']
            : ['ocean', 'rail', 'truck', 'fee', 'terminal'];
        field = candidates.find(f => values[f].amount === 0) ?? null;
        if (field) fallbackUsed = true;
      }
      if (!field) {
        issues.push({
          severity: 'warning',
          message: `Сумма ${cost.raw} не отнесена к статье — проверьте`,
        });
        continue;
      }
      if (values[field].amount === 0) {
        values[field] = { amount: cost.amount, currency: cost.currency };
      }
    }

    const totalLogistics =
      values.ocean.amount + values.rail.amount + values.truck.amount + values.fee.amount + values.terminal.amount;
    if (totalLogistics <= 0) {
      issues.push({ severity: 'error', message: 'Не удалось определить ни одной суммы' });
    }

    if (!forwarderName) {
      issues.push({ severity: 'error', message: 'Не указан перевозчик — впишите название' });
    }
    if (!destination) {
      issues.push({ severity: 'warning', message: 'Склад не распознан — проверьте Серпухов/Ставрополь' });
    }
    if (!days) {
      issues.push({ severity: 'warning', message: 'Срок не распознан — указан 25–35 дней' });
    }
    if (fallbackUsed) {
      issues.push({ severity: 'warning', message: 'Суммы распределены по порядку — сверьте статьи' });
    }
    if (unassigned.length > 0 && !fallbackUsed) {
      issues.push({ severity: 'warning', message: `Не отнесены суммы: ${unassigned.join(', ')}` });
    }

    const weight = detectWeight(block) ?? 26;
    const maxWeight = detectMaxWeight(block) ?? (containerSize === '20GP' ? 21 : 20);
    const overweight = detectOverweightRate(block);
    const vat = detectVat(block);

    drafts.push({
      id: `pasted-${index}-${Math.random().toString(36).slice(2, 6)}`,
      source: block,
      forwarderName: forwarderName ?? '',
      destination: destination ?? 'Серпухов',
      originPort: detectOriginPort(block),
      routeType,
      routeDescription: block.replace(/\s+/g, ' ').slice(0, 180),
      oceanFreight: values.ocean,
      railFreight: values.rail,
      truckDelivery: values.truck,
      forwarderFee: values.fee,
      terminalExpenses: values.terminal,
      transitDaysMin: days ? days[0] : 25,
      transitDaysMax: days ? days[1] : 35,
      containerSize,
      weightTons: weight,
      maxWeightTons: maxWeight,
      overweightRateRub: overweight ?? 2000,
      vatRate: vat ?? 20,
      validUntil: detectValidUntil(block) ?? defaultValidUntil(),
      comments: '',
      issues,
    });
  });

  // Пустая ставка без единой суммы не нужна
  return drafts.filter(d => d.oceanFreight.amount + d.railFreight.amount + d.truckDelivery.amount + d.forwarderFee.amount + d.terminalExpenses.amount > 0);
}

export function draftToQuote(draft: ParsedQuoteDraft, index: number): ForwarderQuote {
  return {
    id: `text-${Date.now()}-${index}`,
    forwarderName: draft.forwarderName.trim() || 'Перевозчик (из КП)',
    destination: draft.destination,
    originPort: draft.originPort,
    routeType: draft.routeType,
    routeDescription: draft.routeDescription,
    transitHub: '',
    containerSize: draft.containerSize,
    weightTons: draft.weightTons,
    maxWeightTons: draft.maxWeightTons,
    overweightRateRub: draft.overweightRateRub,
    vatRate: draft.vatRate,
    oceanFreight: draft.oceanFreight,
    railFreight: draft.railFreight,
    truckDelivery: draft.truckDelivery,
    forwarderFee: draft.forwarderFee,
    terminalExpenses: draft.terminalExpenses,
    transitDaysMin: draft.transitDaysMin,
    transitDaysMax: draft.transitDaysMax,
    equipment: draft.containerSize === '20GP' ? "20'GP" : "40'HC",
    validUntil: draft.validUntil,
    comments: draft.comments,
  };
}

/** Человекочитаемые названия статей — для подсказок в интерфейсе */
export const COST_FIELD_LABELS = COST_LABELS;
