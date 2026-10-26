import React from 'react';
import { ProductQuote, ForwarderQuote, ExchangeRates, ExtraExpense } from '../types/logistics';
import { calculateLandedCost, calculateQuoteCost, formatRUB, getLandedCostInputError, logisticsFromQuote } from '../utils/calculations';
import { calculateExtraExpenses } from '../utils/extraExpenses';
import { downloadLandedCostExcel } from '../utils/excelReport';
import { formatHsCode, findHsCode } from '../utils/hsCode';
import { formatIsoRu } from '../utils/cbrRate';
import { CheckCircle2, Truck, Package, FileText, CreditCard, TrendingUp, DollarSign, Weight, ArrowRight, Upload, CalendarDays, FileSpreadsheet, ClipboardPaste, Pencil, Receipt } from 'lucide-react';

interface Props {
  product: ProductQuote;
  selectedQuote: ForwarderQuote | null;
  rates: ExchangeRates;
  rateDate?: string | null;
  rateSource?: 'cbr' | 'cache' | 'manual';
  reportDate?: string;
  onDateChange?: (date: string) => void;
  quotes: ForwarderQuote[];
  onSelectQuote: (quote: ForwarderQuote | null) => void;
  onAddQuote: () => void;
  onImportQuotes: () => void;
  onPasteQuote: () => void;
  extraExpenses?: ExtraExpense[];
}

export const LandedCostView: React.FC<Props> = ({ product, selectedQuote, rates, rateDate, rateSource, reportDate, onDateChange, quotes, onSelectQuote, onAddQuote, onImportQuotes, onPasteQuote, extraExpenses = [] }) => {
  const handleExcel = () => {
    try {
      downloadLandedCostExcel({
        product,
        quotes,
        rates,
        reportDate: reportDate ?? '',
        rateDate,
        rateSource,
        selectedQuoteId: selectedQuote?.id ?? null,
        extraExpenses,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось сформировать Excel-отчёт');
    }
  };

  if (!selectedQuote) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              2. Выберите маршрут
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Выберите предложение перевозчика, чтобы перейти к расчёту себестоимости.
            </p>
          </div>
          {quotes.length > 0 && (
            <button
              onClick={handleExcel}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Скачать отчёт Excel
            </button>
          )}
        </div>

        {/* Способы добавить ставки */}
        {quotes.length === 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={onPasteQuote}
              className="text-left p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50 transition group"
            >
              <ClipboardPaste className="w-5 h-5 text-emerald-700" />
              <div className="mt-2 text-sm font-bold text-slate-900">Вставить текст КП</div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Скопируйте письмо или сообщение перевозчика — суммы и срок распознаем сами
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                Самый быстрый способ <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <button
              onClick={onImportQuotes}
              className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition"
            >
              <Upload className="w-5 h-5 text-blue-600" />
              <div className="mt-2 text-sm font-bold text-slate-900">Загрузить файл</div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Excel по нашей форме или файл перевозчика в формате .xlsx / .json
              </div>
            </button>

            <button
              onClick={onAddQuote}
              className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition"
            >
              <Pencil className="w-5 h-5 text-slate-600" />
              <div className="mt-2 text-sm font-bold text-slate-900">Ввести вручную</div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Маршрут, 5 сумм и срок — короткая форма из трёх шагов
              </div>
            </button>
          </div>
        )}

        {quotes.length === 0 && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3">
            <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Ставок пока нет.</span>{' '}
              Добавьте хотя бы одно предложение перевозчика, чтобы сравнить маршруты и рассчитать итоговую себестоимость.
              Загруженные ставки сохраняются в браузере и в истории импорта.
            </p>
          </div>
        )}

        {quotes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500">Добавить ещё ставку:</span>
            <button onClick={onPasteQuote} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">
              <ClipboardPaste className="w-3.5 h-3.5" /> Текст КП
            </button>
            <button onClick={onImportQuotes} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">
              <Upload className="w-3.5 h-3.5" /> Файл
            </button>
            <button onClick={onAddQuote} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">
              <Pencil className="w-3.5 h-3.5" /> Вручную
            </button>
          </div>
        )}

        {quotes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {quotes.map(quote => {
              const routeCost = calculateQuoteCost(quote, rates);
              return (
                <button
                  key={quote.id}
                  onClick={() => onSelectQuote(quote)}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">{quote.forwarderName}</div>
                      <div className="text-xs text-slate-500 mt-1">{quote.originPort} → {quote.destination}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                  </div>
                  <div className="text-xs text-slate-600 mt-3 line-clamp-2">{quote.routeDescription}</div>
                  <div className="flex justify-between gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">{quote.transitDaysMin}–{quote.transitDaysMax} дн.</span>
                    <span className="font-bold text-slate-900">{formatRUB(routeCost.totalWithVatRub)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const inputError = getLandedCostInputError(product);
  if (inputError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">
        <h2 className="font-bold">Невозможно рассчитать себестоимость</h2>
        <p className="mt-1">{inputError}. Исправьте параметр в разделе «Доп. параметры: объём, пошлина, НДС».</p>
      </div>
    );
  }

  const calc = calculateLandedCost(product, logisticsFromQuote(selectedQuote, rates), rates);
  const extra = calculateExtraExpenses(extraExpenses, selectedQuote.vatRate);
  const grandTotalRUB = calc.totalRUB + extra.totalRub;
  const grandPerM2 = product.containerM2 > 0 ? Math.round(grandTotalRUB / product.containerM2) : 0;
  const grandPerKg = product.containerWeightKg > 0 ? Math.round(grandTotalRUB / product.containerWeightKg) : 0;

  const rows = [
    { label: 'Продукт (закупка)', value: calc.productRUB, icon: Package, sub: `${product.pricePerM2CNY} CNY/м² × ${rates.cnyRub.toFixed(2)} = ${formatRUB(calc.productPerM2)}/м²` },
    { label: 'Таможенная пошлина', value: calc.customsRUB, icon: FileText, sub: `${product.customsRate}% от (продукт + фрахт) = ${formatRUB(calc.customsPerM2)}/м²` },
    { label: 'Морской и железнодорожный фрахт', value: calc.freightRUB, icon: Truck, sub: `${selectedQuote.forwarderName} → ${selectedQuote.destination}`, sub2: `${calc.freightPerM2} ₽/м²` },
    { label: 'Автовывоз', value: calc.deliveryRUB, icon: Truck, sub: formatRUB(calc.deliveryRUB) },
    { label: 'Комиссия и терминал', value: calc.otherRUB, icon: DollarSign, sub: formatRUB(calc.otherRUB) },
    ...(calc.overweightRUB > 0
      ? [{ label: 'Перевес сверх включённого тоннажа', value: calc.overweightRUB, icon: Weight, sub: `${selectedQuote.weightTons} т при включённых ${selectedQuote.maxWeightTons} т · ${selectedQuote.overweightRateRub} ₽/т` }]
      : []),
    { label: 'Импортный НДС', value: calc.importVatRUB, icon: CreditCard, sub: `${product.vatRate}% от (товар + фрахт + пошлина)`, highlight: true },
    { label: 'НДС на российские услуги', value: calc.serviceVatRUB, icon: CreditCard, sub: `${selectedQuote.vatRate}% от Ж/Д, автовывоза, комиссии и терминала`, highlight: true },
    ...(extra.totalRub > 0
      ? [{ label: 'Дополнительные расходы', value: extra.totalRub, icon: Receipt, sub: `${extra.activeCount} ${extra.activeCount === 1 ? 'статья' : extra.activeCount < 5 ? 'статьи' : 'статей'} · агентское, валюта, ТЭО`, sub2: extra.vatRub > 0 ? `в т.ч. НДС ${formatRUB(extra.vatRub)} · вне таможенной базы` : 'вне таможенной базы', highlight: true }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              3. Итоговая себестоимость
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {product.supplier} · HS {formatHsCode(product.hsCode) || '—'}
              {findHsCode(product.hsCode)?.title ? ` · ${findHsCode(product.hsCode)?.title}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Курсы: USD {rates.usdRub.toFixed(2)} · CNY {rates.cnyRub.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {rateDate
                ? `${rateSource === 'cache' ? 'Курс ЦБ из кэша' : 'Курс ЦБ'} на ${formatIsoRu(rateDate)}`
                : 'Курс ЦБ не загружен — проверьте дату расчёта'}
            </div>
            {reportDate && onDateChange && (
              <label className="mt-1.5 inline-flex items-center justify-end gap-1.5 text-[11px] font-semibold text-slate-600">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                Дата расчёта
                <input
                  type="date"
                  value={reportDate}
                  onChange={e => onDateChange(e.target.value)}
                  className="px-2 py-1 text-[11px] font-normal border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </label>
            )}
            <button
              onClick={handleExcel}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Скачать отчёт Excel
            </button>
            <div className="text-xs text-slate-400 mt-0.5">
              {selectedQuote.forwarderName} → {selectedQuote.destination} ({selectedQuote.transitDaysMin}-{selectedQuote.transitDaysMax} дн.)
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">Расшифровка стоимости</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.label} className={`px-5 py-3 flex items-center justify-between ${row.highlight ? 'bg-blue-50/40' : ''}`}>
              <div className="flex items-center gap-3">
                <row.icon className={`w-4 h-4 ${row.highlight ? 'text-blue-600' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-800">{row.label}</div>
                  <div className="text-[11px] text-slate-500">{row.sub}</div>
                  {row.sub2 && <div className="text-[11px] text-slate-400">{row.sub2}</div>}
                </div>
              </div>
              <div className={`text-sm font-bold text-right ${row.highlight ? 'text-blue-900' : 'text-slate-900'}`}>
                {formatRUB(row.value)}
              </div>
            </div>
          ))}
          {/* Total */}
          <div className="px-5 py-4 bg-emerald-50/60 border-t border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span className="text-base font-black text-emerald-900">ИТОГО (ландед-кост)</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-emerald-900">{formatRUB(grandTotalRUB)}</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  {formatRUB(grandPerM2)}/м² · {formatRUB(grandPerKg)}/кг
                </div>
                {extra.totalRub > 0 && (
                  <div className="text-[11px] text-emerald-700">
                    вкл. доп. расходы {formatRUB(extra.totalRub)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Quote Selector */}
      {quotes.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-slate-900">Другой маршрут</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quotes.map(q => (
              <button
                key={q.id}
                onClick={() => onSelectQuote(q)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  selectedQuote?.id === q.id
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {q.forwarderName} → {q.destination}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Route info */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="font-semibold text-slate-800">Маршрут:</div>
        <div>{selectedQuote.routeDescription}</div>
        <div className="flex items-center gap-4 pt-1">
          <span>Транзит: <strong>{selectedQuote.transitDaysMin}-{selectedQuote.transitDaysMax} дн.</strong></span>
          <span>Контейнер: <strong>{selectedQuote.equipment}</strong></span>
          <span>Вес: <strong>{selectedQuote.weightTons}т</strong> (перевес: {selectedQuote.overweightRateRub}₽/т)</span>
        </div>
      </div>
    </div>
  );
};
