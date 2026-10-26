import * as XLSX from 'xlsx';
import { ExchangeRates, ForwarderQuote, ProductQuote } from '../types/logistics';
import {
  calculateLandedCost,
  getLandedCostInputError,
  logisticsFromQuote,
  toRub,
} from './calculations';
import { findHsCode, formatHsCode, normalizeHsCode } from './hsCode';
import { formatIsoRu } from './date';

export interface ExcelReportOptions {
  product: ProductQuote;
  quotes: ForwarderQuote[];
  rates: ExchangeRates;
  /** Дата расчёта, ISO (YYYY-MM-DD) */
  reportDate: string;
  /** Фактическая дата курса ЦБ, ISO */
  rateDate?: string | null;
  rateSource?: 'cbr' | 'cache' | 'manual';
  selectedQuoteId?: string | null;
}

const ROUTE_TYPE_LABELS: Record<ForwarderQuote['routeType'], string> = {
  sea_vvo_rail_truck: 'Море ВВО + Ж/Д + авто',
  direct_rail_truck: 'Прямое Ж/Д + авто',
  deep_sea_novorossiysk: 'Море Новороссийск + авто',
};

const MONEY = '#,##0';
const MONEY2 = '#,##0.00';

function money(value: number): number {
  return Math.round(value);
}

/** Форматирует числа в колонках как денежные (без изменения значений) */
function applyNumberFormat(ws: XLSX.WorkSheet, cols: number[], fmt = MONEY): void {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (const c of cols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (cell && cell.t === 'n') cell.z = fmt;
    }
  }
}

function setCols(ws: XLSX.WorkSheet, widths: number[]): void {
  ws['!cols'] = widths.map(wch => ({ wch }));
}

interface RouteRow {
  quote: ForwarderQuote;
  landed: ReturnType<typeof calculateLandedCost>;
  overweightRUB: number;
  serviceVatRUB: number;
  logisticsTotalRUB: number;
  oceanRUB: number;
  railRUB: number;
  truckRUB: number;
  feeRUB: number;
  terminalRUB: number;
}

function buildRouteRows(options: ExcelReportOptions): RouteRow[] {
  return options.quotes.map(quote => {
    const input = logisticsFromQuote(quote, options.rates);
    const landed = calculateLandedCost(options.product, input, options.rates);
    const serviceVatRUB = landed.serviceVatRUB;
    const logisticsTotalRUB =
      landed.freightRUB + landed.deliveryRUB + landed.otherRUB + landed.overweightRUB + serviceVatRUB;
    return {
      quote,
      landed,
      overweightRUB: landed.overweightRUB,
      serviceVatRUB,
      logisticsTotalRUB,
      oceanRUB: toRub(quote.oceanFreight, options.rates),
      railRUB: toRub(quote.railFreight, options.rates),
      truckRUB: toRub(quote.truckDelivery, options.rates),
      feeRUB: toRub(quote.forwarderFee, options.rates),
      terminalRUB: toRub(quote.terminalExpenses, options.rates),
    };
  });
}

function buildSummarySheet(options: ExcelReportOptions, rows: RouteRow[]) {
  const { product, rates, reportDate, rateDate, rateSource, selectedQuoteId } = options;
  const hsCode = normalizeHsCode(product.hsCode);
  const hsEntry = findHsCode(hsCode);
  const supplier = product.supplier.trim() || '—';

  const aoa: (string | number | null)[][] = [];
  aoa.push(['ПОЛНЫЙ РАСЧЁТ СЕБЕСТОИМОСТИ ИМПОРТА (LANDED COST)']);
  aoa.push([]);
  aoa.push(['Дата расчёта', formatIsoRu(reportDate)]);
  aoa.push([
    'Курс ЦБ РФ',
    rateDate
      ? `${formatIsoRu(rateDate)}${rateSource === 'cache' ? ' (из локального кэша)' : ''}`
      : 'не загружен — используются ручные значения',
  ]);
  aoa.push(['USD / EUR / CNY', `${rates.usdRub.toFixed(4)} / ${rates.eurRub.toFixed(4)} / ${rates.cnyRub.toFixed(4)} ₽`]);
  aoa.push([]);
  aoa.push(['ТОВАР']);
  aoa.push(['Поставщик', supplier]);
  aoa.push(['HS-код (ТН ВЭД)', formatHsCode(hsCode) || '—']);
  aoa.push(['Наименование по коду', hsEntry?.title ?? 'нет в справочнике']);
  aoa.push(['Ставка пошлины, %', product.customsRate]);
  aoa.push(['Ставка импортного НДС, %', product.vatRate]);
  aoa.push(['Цена за 1 м², CNY', product.pricePerM2CNY]);
  aoa.push(['Цена за 1 м², ₽', money(product.pricePerM2CNY * rates.cnyRub)]);
  aoa.push(['Цена за короб, CNY', product.pricePerBoxCNY]);
  aoa.push(['Площадь контейнера, м²', product.containerM2]);
  aoa.push(['Вес контейнера, кг', product.containerWeightKg]);
  aoa.push(['Вес 1 пог.м, кг', product.weightPerM]);
  if (product.note) aoa.push(['Примечание к товару', product.note]);
  aoa.push([]);

  const bestSerpukhov = rows
    .filter(r => r.quote.destination === 'Серпухов')
    .sort((a, b) => a.landed.totalPerM2 - b.landed.totalPerM2)[0];
  const bestStavropol = rows
    .filter(r => r.quote.destination === 'Ставрополь')
    .sort((a, b) => a.landed.totalPerM2 - b.landed.totalPerM2)[0];
  const selected = rows.find(r => r.quote.id === selectedQuoteId);

  aoa.push(['ЛУЧШИЕ ВАРИАНТЫ И ВЫБРАННЫЙ МАРШРУТ']);
  aoa.push(['Вариант', 'Экспедитор', 'Маршрут', 'Срок, дн', 'Итого ₽', '₽/м²', '₽/кг']);
  const pushBest = (label: string, row?: RouteRow) => {
    if (!row) {
      aoa.push([label, '—', 'нет ставок', '—', null, null, null]);
      return;
    }
    aoa.push([
      label,
      row.quote.forwarderName,
      row.quote.routeDescription,
      `${row.quote.transitDaysMin}–${row.quote.transitDaysMax}`,
      row.landed.totalRUB,
      row.landed.totalPerM2,
      row.landed.totalPerKg,
    ]);
  };
  pushBest('Серпухов — лучшая цена', bestSerpukhov);
  pushBest('Ставрополь — лучшая цена', bestStavropol);
  if (selected) pushBest('Выбранный маршрут', selected);
  aoa.push([]);
  aoa.push([
    'Итог включает: продукт, пошлину, морской и Ж/Д фрахт, автовывоз, комиссию и терминал, перевес,',
  ]);
  aoa.push([
    'импортный НДС и НДС на российские услуги. Подробная расшифровка — на листах «Маршруты» и «Выбранный маршрут».',
  ]);
  aoa.push(['HS-код и ставку пошлины перед подачей декларации подтверждает таможенный брокер.']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setCols(ws, [34, 42, 60, 12, 16, 14, 14]);
  applyNumberFormat(ws, [4, 5, 6]);
  return ws;
}

function buildRoutesSheet(rows: RouteRow[], options: ExcelReportOptions) {
  const header = [
    '№',
    'Выбран',
    'Экспедитор',
    'Склад',
    'Порт отправки',
    'Тип маршрута',
    'Схема маршрута',
    'Оборудование',
    'Срок, дн',
    'Ставка действует до',
    'Фрахт (море + Ж/Д), ₽',
    'в т.ч. Ж/Д, ₽',
    'Автовывоз, ₽',
    'Комиссия, ₽',
    'Терминал, ₽',
    'Перевес, ₽',
    'НДС на рос. услуги, ₽',
    'Логистика итого, ₽',
    'Продукт, ₽',
    'Пошлина, ₽',
    'НДС импорта, ₽',
    'ЛЕДЖЕД ИТОГО, ₽',
    '₽/м²',
    '₽/кг',
    'Место по ₽/м²',
  ];

  const sorted = [...rows].sort((a, b) => a.landed.totalPerM2 - b.landed.totalPerM2);
  const aoa: (string | number | null)[][] = [header];

  sorted.forEach((row, i) => {
    const q = row.quote;
    aoa.push([
      i + 1,
      q.id === options.selectedQuoteId ? '✓' : '',
      q.forwarderName,
      q.destination,
      q.originPort,
      ROUTE_TYPE_LABELS[q.routeType] ?? q.routeType,
      q.routeDescription,
      q.equipment || q.containerSize,
      `${q.transitDaysMin}–${q.transitDaysMax}`,
      q.validUntil || '',
      row.landed.freightRUB,
      money(row.railRUB),
      row.landed.deliveryRUB,
      money(row.feeRUB),
      money(row.terminalRUB),
      row.landed.overweightRUB,
      row.serviceVatRUB,
      row.logisticsTotalRUB,
      row.landed.productRUB,
      row.landed.customsRUB,
      row.landed.importVatRUB,
      row.landed.totalRUB,
      row.landed.totalPerM2,
      row.landed.totalPerKg,
      i + 1,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setCols(ws, [4, 8, 20, 12, 16, 26, 62, 12, 10, 14, 18, 14, 14, 12, 12, 12, 16, 18, 14, 14, 14, 18, 12, 12, 12]);
  applyNumberFormat(ws, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  applyNumberFormat(ws, [23, 24], MONEY2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: header.length - 1 } }) };
  return ws;
}

function buildSelectedSheet(row: RouteRow | undefined, options: ExcelReportOptions) {
  const aoa: (string | number | null)[][] = [];

  if (!row) {
    aoa.push(['Маршрут не выбран']);
    aoa.push(['Выберите маршрут в приложении, чтобы получить детальную расшифровку.']);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    setCols(ws, [50]);
    return ws;
  }

  const q = row.quote;
  aoa.push(['ДЕТАЛЬНАЯ РАСШИФРОВКА ВЫБРАННОГО МАРШРУТА']);
  aoa.push([]);
  aoa.push(['Экспедитор', q.forwarderName]);
  aoa.push(['Склад назначения', q.destination]);
  aoa.push(['Порт отправки', q.originPort]);
  aoa.push(['Схема маршрута', q.routeDescription]);
  aoa.push(['Срок доставки, дн', `${q.transitDaysMin}–${q.transitDaysMax}`]);
  aoa.push(['Оборудование', q.equipment || q.containerSize]);
  aoa.push(['Вес груза / включено по ставке, т', `${q.weightTons} / ${q.maxWeightTons}`]);
  aoa.push(['Ставка перевеса, ₽/т', q.overweightRateRub]);
  aoa.push(['НДС на рос. услуги, %', q.vatRate]);
  aoa.push(['Ставка действует до', q.validUntil || '—']);
  aoa.push([]);
  aoa.push(['Статья', 'Сумма, ₽', '₽/м²', 'Комментарий']);
  aoa.push([
    'Продукт (закупка)',
    row.landed.productRUB,
    row.landed.productPerM2,
    `${options.product.pricePerM2CNY} CNY/м² × ${options.rates.cnyRub.toFixed(2)} ₽`,
  ]);
  aoa.push([
    'Таможенная пошлина',
    row.landed.customsRUB,
    row.landed.customsPerM2,
    `${options.product.customsRate}% от (продукт + фрахт)`,
  ]);
  aoa.push([
    'Морской и Ж/Д фрахт',
    row.landed.freightRUB,
    row.landed.freightPerM2,
    `${q.forwarderName} → ${q.destination}`,
  ]);
  aoa.push(['Автовывоз', row.landed.deliveryRUB, money(row.landed.deliveryRUB / options.product.containerM2), 'до склада получателя']);
  aoa.push(['Комиссия и терминал', row.landed.otherRUB, money(row.landed.otherRUB / options.product.containerM2), 'экспедирование, терминал, растаможка']);
  aoa.push([
    'Перевес сверх включённого тоннажа',
    row.landed.overweightRUB,
    money(row.landed.overweightRUB / options.product.containerM2),
    `${Math.max(0, Math.ceil(q.weightTons - q.maxWeightTons))} т × ${q.overweightRateRub} ₽/т`,
  ]);
  aoa.push([
    'Импортный НДС',
    row.landed.importVatRUB,
    money(row.landed.importVatRUB / options.product.containerM2),
    `${options.product.vatRate}% от (товар + фрахт + пошлина)`,
  ]);
  aoa.push([
    'НДС на российские услуги',
    row.landed.serviceVatRUB,
    money(row.landed.serviceVatRUB / options.product.containerM2),
    `${q.vatRate}% от Ж/Д, автовывоза, комиссии, терминала и перевеса`,
  ]);
  aoa.push(['ИТОГО ЛАНДЕД-КОСТ', row.landed.totalRUB, row.landed.totalPerM2, 'с НДС']);
  aoa.push([]);
  aoa.push(['Справочно, ₽/кг', row.landed.totalPerKg]);
  aoa.push(['Площадь контейнера, м²', options.product.containerM2]);
  aoa.push(['Вес контейнера, кг', options.product.containerWeightKg]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setCols(ws, [38, 18, 14, 60]);
  applyNumberFormat(ws, [1, 2]);
  return ws;
}

function buildRawRatesSheet(rows: RouteRow[]) {
  const header = [
    '№',
    'Экспедитор',
    'Склад',
    'Порт',
    'Контейнер',
    'Вес, т',
    'Макс. вес по ставке, т',
    'Фрахт',
    'Валюта фрахта',
    'Ж/Д',
    'Валюта Ж/Д',
    'Автовывоз',
    'Валюта авто',
    'Комиссия',
    'Валюта комиссии',
    'Терминал',
    'Валюта терминала',
    'НДС услуг, %',
    'Ставка действует до',
    'Комментарий',
    'Примечание',
  ];
  const aoa: (string | number | null)[][] = [header];
  rows.forEach(({ quote: q }, i) => {
    aoa.push([
      i + 1,
      q.forwarderName,
      q.destination,
      q.originPort,
      q.equipment || q.containerSize,
      q.weightTons,
      q.maxWeightTons,
      q.oceanFreight.amount,
      q.oceanFreight.currency,
      q.railFreight.amount,
      q.railFreight.currency,
      q.truckDelivery.amount,
      q.truckDelivery.currency,
      q.forwarderFee.amount,
      q.forwarderFee.currency,
      q.terminalExpenses.amount,
      q.terminalExpenses.currency,
      q.vatRate,
      q.validUntil || '',
      q.comments || '',
      q.note || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setCols(ws, [4, 20, 12, 16, 12, 10, 18, 12, 14, 14, 12, 14, 12, 14, 14, 14, 14, 12, 14, 40, 40]);
  applyNumberFormat(ws, [7, 9, 11, 13, 15]);
  applyNumberFormat(ws, [5, 6], MONEY2);
  return ws;
}

function buildMethodSheet(options: ExcelReportOptions) {
  const aoa: (string | number | null)[][] = [
    ['МЕТОДИКА РАСЧЁТА'],
    [],
    ['1. Курс валют', `USD ${options.rates.usdRub} ₽ · EUR ${options.rates.eurRub} ₽ · CNY ${options.rates.cnyRub} ₽`],
    ['', options.rateDate ? `Курс ЦБ РФ на ${formatIsoRu(options.rateDate)}` : 'Курс ЦБ не загружен'],
    [],
    ['2. Таможенная база', 'стоимость товара + морской и Ж/Д фрахт'],
    ['3. Пошлина', `таможенная база × ${options.product.customsRate}%`],
    ['4. Импортный НДС', `(таможенная база + пошлина) × ${options.product.vatRate}%`],
    ['5. НДС на российские услуги', 'ставка перевозчика × (Ж/Д + автовывоз + комиссия + терминал + перевес)'],
    ['6. Перевес', 'ceil(вес груза − включённый тоннаж) × ставка за тонну'],
    ['7. Ландед-кост', 'продукт + пошлина + фрахт + автовывоз + комиссия/терминал + перевес + НДС'],
    [],
    ['ОГРАНИЧЕНИЯ'],
    ['· Ставки взяты из введённых данных экспедиторов и не проверяются автоматически.'],
    ['· HS-код и ставку пошлины перед подачей декларации подтверждает таможенный брокер.'],
    ['· Расчёт не учитывает банковские комиссии, страхование груза и возможные простои сверх free time.'],
    ['· Итог по маршруту действителен на дату расчёта и указанный срок действия ставки.'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setCols(ws, [34, 100]);
  return ws;
}

/**
 * Собирает книгу отчёта: сводка, все варианты маршрутов, расшифровка выбранного
 * маршрута, исходные ставки и методика расчёта.
 */
export function buildLandedCostWorkbook(options: ExcelReportOptions): XLSX.WorkBook {
  const inputError = getLandedCostInputError(options.product);
  if (inputError) throw new Error(`${inputError} — исправьте параметры товара`);

  const rows = buildRouteRows(options);
  const selected = rows.find(r => r.quote.id === options.selectedQuoteId) ?? null;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(options, rows), 'Сводка');
  XLSX.utils.book_append_sheet(wb, buildRoutesSheet(rows, options), 'Маршруты');
  XLSX.utils.book_append_sheet(wb, buildSelectedSheet(selected ?? undefined, options), 'Выбранный маршрут');
  XLSX.utils.book_append_sheet(wb, buildRawRatesSheet(rows), 'Исходные ставки');
  XLSX.utils.book_append_sheet(wb, buildMethodSheet(options), 'Методика');
  return wb;
}

export function reportFileName(options: ExcelReportOptions): string {
  const safeSupplier = options.product.supplier
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 60)
    .replace(/[.,\s]+$/, '');
  return `Себестоимость_${safeSupplier || 'поставщик'}_${options.reportDate}.xlsx`;
}

/** Скачивает отчёт в браузере */
export function downloadLandedCostExcel(options: ExcelReportOptions): void {
  XLSX.writeFile(buildLandedCostWorkbook(options), reportFileName(options));
}

