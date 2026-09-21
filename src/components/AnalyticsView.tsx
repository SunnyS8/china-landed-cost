import React, { useState } from 'react';
import { ForwarderQuote, ExchangeRates } from '../types/logistics';
import { ParsedSnapshot } from '../utils/storage';
import { PriceChart } from './analytics/PriceChart';
import { RouteComparison } from './analytics/RouteComparison';

interface Props {
  quotes: ForwarderQuote[];
  rates: ExchangeRates;
  history: ParsedSnapshot[];
}

export const AnalyticsView: React.FC<Props> = ({ quotes, rates, history }) => {
  const [tab, setTab] = useState<'prices' | 'routes'>('prices');
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);

  const handlePdf = async () => {
    setPdfPending(true);
    setPdfMode(true);
    try {
      // Даём React отрисовать оба графика перед захватом
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const { downloadPdfReport } = await import('../utils/pdfReport');
      await downloadPdfReport('report-content', `Логистический_отчёт_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Не удалось сформировать PDF-отчёт');
    } finally {
      setPdfMode(false);
      setPdfPending(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('prices')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'prices' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            График цен
          </button>
          <button
            onClick={() => setTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'routes' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Море vs ЖД
          </button>
        </div>
        <button
          onClick={handlePdf}
          disabled={pdfPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-60"
          title="Скачать текщую таблицу и расчёты в PDF"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {pdfPending ? 'Сохраняю…' : 'Скачать отчёт PDF'}
        </button>
      </div>

      {pdfMode ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">График цен по перевозчикам</h3>
            <PriceChart history={history} currentQuotes={quotes} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Сравнение маршрутов: Море vs Прямое ЖД</h3>
            <RouteComparison quotes={quotes} rates={rates} />
          </div>
        </div>
      ) : tab === 'prices' ? (
        <PriceChart history={history} currentQuotes={quotes} />
      ) : (
        <RouteComparison quotes={quotes} rates={rates} />
      )}
    </section>
  );
};