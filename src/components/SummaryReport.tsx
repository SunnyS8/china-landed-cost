import React, { useState } from 'react';
import { ForwarderQuote, ExchangeRates } from '../types/logistics';
import { calculateQuoteCost, formatUSD, formatRUB } from '../utils/calculations';
import { 
  FileCheck2, 
  Printer, 
  Copy, 
  Check, 
  TrendingDown, 
  Zap, 
  Building, 
  Calendar, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';

interface Props {
  quotes: ForwarderQuote[];
  rates: ExchangeRates;
  reportDate: string;
}

export const SummaryReport: React.FC<Props> = ({ quotes, rates, reportDate }) => {
  const [copied, setCopied] = useState(false);

  // Group quotes by destination
  const serpukhovQuotes = quotes
    .filter(q => q.destination === 'Серпухов')
    .map(q => ({ quote: q, calc: calculateQuoteCost(q, rates) }));
    
  const stavropolQuotes = quotes
    .filter(q => q.destination === 'Ставрополь')
    .map(q => ({ quote: q, calc: calculateQuoteCost(q, rates) }));

  // Find optimal quotes
  const bestSerpukhovPrice = serpukhovQuotes.length > 0 
    ? [...serpukhovQuotes].sort((a, b) => a.calc.totalUsd - b.calc.totalUsd)[0]
    : null;

  const fastestSerpukhov = serpukhovQuotes.length > 0
    ? [...serpukhovQuotes].sort((a, b) => a.quote.transitDaysMin - b.quote.transitDaysMin)[0]
    : null;

  const bestStavropolPrice = stavropolQuotes.length > 0
    ? [...stavropolQuotes].sort((a, b) => a.calc.totalUsd - b.calc.totalUsd)[0]
    : null;

  const fastestStavropol = stavropolQuotes.length > 0
    ? [...stavropolQuotes].sort((a, b) => a.quote.transitDaysMin - b.quote.transitDaysMin)[0]
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const serpContainer = bestSerpukhovPrice?.quote.containerSize || '40HC';
    const stvContainer = bestStavropolPrice?.quote.containerSize || '40HC';
    const text = `АНАЛИТИЧЕСКИЙ ОТЧЕТ СРАВНЕНИЯ СТАВОК ЭКСПЕДИТОРОВ
Дата согласования: ${reportDate}
Расчетные курсы: USD ${rates.usdRub} ₽ · EUR ${rates.eurRub} ₽ · CNY ${rates.cnyRub} ₽
Направление: Китай (Шанхай, Нинбо) -> РФ (Серпухов, Ставрополь)
Итоги указаны с НДС на российские услуги (ЖД, авто, терминал)

1. СКЛАД СЕРПУХОВ (Московская обл., контейнер ${serpContainer}):
• Лучшая ставка: ${bestSerpukhovPrice?.quote.forwarderName || '—'}
  - Итого USD: ${bestSerpukhovPrice ? formatUSD(bestSerpukhovPrice.calc.totalWithVatUsd) : '—'} (${bestSerpukhovPrice ? formatRUB(bestSerpukhovPrice.calc.totalWithVatRub) : '—'})
  - Маршрут: ${bestSerpukhovPrice?.quote.routeDescription || '—'}
  - Срок: ${bestSerpukhovPrice?.quote.transitDaysMin}-${bestSerpukhovPrice?.quote.transitDaysMax} дней
  - Вес: ${bestSerpukhovPrice?.quote.weightTons ?? 26} т (перевес: ${bestSerpukhovPrice && bestSerpukhovPrice.calc.overweightRub > 0 ? formatRUB(bestSerpukhovPrice.calc.overweightRub) : 'нет'})
• Самый быстрый маршрут: ${fastestSerpukhov?.quote.forwarderName || '—'} (${fastestSerpukhov?.quote.transitDaysMin}-${fastestSerpukhov?.quote.transitDaysMax} дн.) — ${fastestSerpukhov ? formatUSD(fastestSerpukhov.calc.totalWithVatUsd) : '—'}

2. СКЛАД СТАВРОПОЛЬ (Ставропольский край, контейнер ${stvContainer}):
• Лучшая ставка: ${bestStavropolPrice?.quote.forwarderName || '—'}
  - Итого USD: ${bestStavropolPrice ? formatUSD(bestStavropolPrice.calc.totalWithVatUsd) : '—'} (${bestStavropolPrice ? formatRUB(bestStavropolPrice.calc.totalWithVatRub) : '—'})
  - Маршрут: ${bestStavropolPrice?.quote.routeDescription || '—'}
  - Срок: ${bestStavropolPrice?.quote.transitDaysMin}-${bestStavropolPrice?.quote.transitDaysMax} дней
  - Вес: ${bestStavropolPrice?.quote.weightTons ?? 26} т (перевес: ${bestStavropolPrice && bestStavropolPrice.calc.overweightRub > 0 ? formatRUB(bestStavropolPrice.calc.overweightRub) : 'нет'})
• Самый быстрый маршрут: ${fastestStavropol?.quote.forwarderName || '—'} (${fastestStavropol?.quote.transitDaysMin}-${fastestStavropol?.quote.transitDaysMax} дн.) — ${fastestStavropol ? formatUSD(fastestStavropol.calc.totalWithVatUsd) : '—'}

Отчет сформирован в соответствии с техническим заданием.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            Сводный отчет на дату согласования
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Готовое заключение по аудиозаданию для руководства и коммерческого отдела
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            {copied ? 'Скопировано!' : 'Копировать сводку'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Печать / PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Департамент логистики и ВЭД
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Сравнительный анализ экспедиторов: Серпухов & Ставрополь
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Базис поставки: FOB порты КНР (Шанхай, Нинбо) — DPU склад получателя РФ
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 space-y-1">
            <div className="text-xs font-semibold text-slate-500">Дата согласования:</div>
            <div className="text-sm font-bold text-slate-900">{reportDate}</div>
            <div className="text-xs font-semibold text-slate-500 mt-2">Курсы пересчета:</div>
            <div className="text-sm font-extrabold text-blue-700">
              USD {rates.usdRub.toFixed(2)} ₽ · EUR {rates.eurRub.toFixed(2)} ₽ · CNY {rates.cnyRub.toFixed(2)} ₽
            </div>
          </div>
        </div>

        {/* Executive Highlights (2 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Warehouse 1: Serpukhov Best Options */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                Склад Серпухов (Московская обл.)
              </h3>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                {bestSerpukhovPrice?.quote.containerSize || "40'HC"} контейнер
              </span>
            </div>

            {bestSerpukhovPrice && (
              <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Лучшая цена (Best Value)
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {formatUSD(bestSerpukhovPrice.calc.totalUsd)}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {bestSerpukhovPrice.quote.forwarderName}
                </div>
                <div className="text-xs text-slate-600">
                  {bestSerpukhovPrice.quote.routeDescription}
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                  <span>В рублях: <strong>{formatRUB(bestSerpukhovPrice.calc.totalRub)}</strong></span>
                  <span>Срок: <strong>{bestSerpukhovPrice.quote.transitDaysMin}–{bestSerpukhovPrice.quote.transitDaysMax} дн.</strong></span>
                </div>
              </div>
            )}

            {fastestSerpukhov && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Самый быстрый срок (Fastest)
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {formatUSD(fastestSerpukhov.calc.totalUsd)}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {fastestSerpukhov.quote.forwarderName} (Прямой Ж/Д)
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                  <span>В рублях: <strong>{formatRUB(fastestSerpukhov.calc.totalRub)}</strong></span>
                  <span className="text-amber-700 font-bold">Срок: {fastestSerpukhov.quote.transitDaysMin}–{fastestSerpukhov.quote.transitDaysMax} дн.</span>
                </div>
              </div>
            )}
          </div>

          {/* Warehouse 2: Stavropol Best Options */}
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                Склад Ставрополь (Ставропольский край)
              </h3>
              <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                {bestStavropolPrice?.quote.containerSize || "40'HC"} контейнер
              </span>
            </div>

            {bestStavropolPrice && (
              <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Лучшая цена (Best Value)
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {formatUSD(bestStavropolPrice.calc.totalUsd)}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {bestStavropolPrice.quote.forwarderName}
                </div>
                <div className="text-xs text-slate-600">
                  {bestStavropolPrice.quote.routeDescription}
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                  <span>В рублях: <strong>{formatRUB(bestStavropolPrice.calc.totalRub)}</strong></span>
                  <span>Срок: <strong>{bestStavropolPrice.quote.transitDaysMin}–{bestStavropolPrice.quote.transitDaysMax} дн.</strong></span>
                </div>
              </div>
            )}

            {fastestStavropol && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Самый быстрый срок (Fastest)
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {formatUSD(fastestStavropol.calc.totalUsd)}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {fastestStavropol.quote.forwarderName} (Ж/Д Краснодар/Тимашевск)
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                  <span>В рублях: <strong>{formatRUB(fastestStavropol.calc.totalRub)}</strong></span>
                  <span className="text-amber-700 font-bold">Срок: {fastestStavropol.quote.transitDaysMin}–{fastestStavropol.quote.transitDaysMax} дн.</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Detailed Strategic Conclusion */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Экспертные выводы и рекомендации логиста
          </h4>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>По складу Серпухов:</strong> Маршрут через Владивосток (Море + Ж/Д Транссиб до Москвы + автовывоз) обходится в среднем на $500–$700 дешевле прямого железнодорожного поезда ($4,900 против $5,600). Однако если критичен срок реализации (горящий сезон или дедлайн), прямое Ж/Д сокращает транзитное время на 10–12 дней.
            </p>
            <p>
              2. <strong>По складу Ставрополь:</strong> Доставка через южный ж/д узел (ст. Ростов-Товарный / Батайск) является наиболее сбалансированной по затратам ($5,600–$5,800). Прямое ж/д до Краснодара или Тимашевска выигрывает по времени, но стоимость составляет ~$6,500+. Морской маршрут через Новороссийск дешев по фрахту, но долгий морской переход (до 50 дней) создает риски заморозки оборотных средств.
            </p>
            <p>
              3. <strong>Валютная составляющая:</strong> Так как железнодорожные тарифы по территории РФ и автовывоз номинированы в рублях, при росте курса USD стоимость в долларах снижается. Рекомендуется фиксировать валютный курс на день размещения заявки экспедитору.
            </p>
          </div>
        </div>

        {/* Signatures Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <div className="font-semibold text-slate-900">Составитель отчета:</div>
            <div className="mt-1">Ведущий специалист по логистике ВЭД</div>
            <div className="mt-6 border-b border-slate-300 w-48"></div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-slate-900">Согласовано:</div>
            <div className="mt-1">Руководитель отдела логистики и закупок</div>
            <div className="mt-6 border-b border-slate-300 w-48 ml-auto"></div>
          </div>
        </div>

      </div>
    </div>
  );
};
