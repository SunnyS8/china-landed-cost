import React from 'react';
import { ProductQuote, ForwarderQuote, ExchangeRates, LandedCost } from '../types/logistics';
import { calculateLandedCost, formatRUB, formatUSD } from '../utils/calculations';
import { CheckCircle2, Truck, Package, FileText, CreditCard, TrendingUp, DollarSign, Weight, ArrowRight } from 'lucide-react';

interface Props {
  product: ProductQuote;
  selectedQuote: ForwarderQuote | null;
  rates: ExchangeRates;
  quotes: ForwarderQuote[];
  onSelectQuote: (quote: ForwarderQuote | null) => void;
}

export const LandedCostView: React.FC<Props> = ({ product, selectedQuote, rates, quotes, onSelectQuote }) => {
  if (!selectedQuote) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-xs text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">Выберите ставку экспедитора</h3>
        <p className="text-sm text-slate-500">
          Перейдите на вкладку «1. Сравнение ставок» и выберите котировку, чтобы увидеть итоговый ландед-кост.
        </p>
      </div>
    );
  }

  const calc = calculateLandedCost(product, {
    freight: selectedQuote.oceanFreight.amount * (selectedQuote.oceanFreight.currency === 'RUB' ? 1 : rates.usdRub),
    delivery: selectedQuote.truckDelivery.amount * (selectedQuote.truckDelivery.currency === 'RUB' ? 1 : rates.usdRub),
    other: selectedQuote.forwarderFee.amount * (selectedQuote.forwarderFee.currency === 'RUB' ? 1 : rates.usdRub) +
            selectedQuote.terminalExpenses.amount * (selectedQuote.terminalExpenses.currency === 'RUB' ? 1 : rates.usdRub),
  }, rates);

  const rows = [
    { label: 'Продукт (закупка)', value: calc.productRUB, icon: Package, sub: `${product.pricePerM2CNY} CNY/м² × ${rates.cnyRub.toFixed(2)} = ${formatRUB(calc.productPerM2)}/м²` },
    { label: 'Таможенная пошлина', value: calc.customsRUB, icon: FileText, sub: `${product.customsRate}% от (продукт + фрахт) = ${formatRUB(calc.customsPerM2)}/м²` },
    { label: 'Морской фрахт', value: calc.freightRUB, icon: Truck, sub: `${selectedQuote.forwarderName} → ${selectedQuote.destination}`, sub2: `${calc.freightPerM2} ₽/м²` },
    { label: 'Автовывоз', value: calc.deliveryRUB, icon: Truck, sub: formatRUB(calc.deliveryRUB) },
    { label: 'Комиссия и терминал', value: calc.otherRUB, icon: DollarSign, sub: formatRUB(calc.otherRUB) },
    { label: 'НДС', value: calc.vatRUB, icon: CreditCard, sub: `${product.vatRate}% на российские услуги`, highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Итоговый ландед-кост
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {product.supplier} · {product.hsCode}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Курсы: USD {rates.usdRub.toFixed(2)} · CNY {rates.cnyRub.toFixed(2)}
            </div>
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
                <div className="text-xl font-black text-emerald-900">{formatRUB(calc.totalRUB)}</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  {formatRUB(calc.totalPerM2)}/м² · {formatRUB(calc.totalPerKg)}/кг
                </div>
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
            <span className="text-sm font-bold text-slate-900">Быстрая смена ставки</span>
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
