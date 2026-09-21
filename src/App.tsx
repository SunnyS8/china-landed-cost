import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Map,
  FileCheck,
  DollarSign,
  Calendar,
  Ship,
  CheckCircle2,
  Upload,
  Download,
  RefreshCw,
  BarChart3,
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react';
import { ExchangeRates, ForwarderQuote, ProductQuote } from './types/logistics';
import { exportAllData, getHistory, importAllData, normalizeQuotes, ParsedSnapshot, compareNewToLast, PriceChange } from './utils/storage';
import { fetchCbrRates, DEFAULT_RATES } from './utils/cbrRate';
import { LogisticsTable } from './components/LogisticsTable';
import { RouteMap } from './components/RouteMap';
import { SummaryReport } from './components/SummaryReport';
import { AddQuoteModal } from './components/AddQuoteModal';
import { ImportModal } from './components/ImportModal';
import { HistoryPanel } from './components/HistoryPanel';
import { AnalyticsView } from './components/AnalyticsView';
import { ProductSection } from './components/ProductSection';
import { LandedCostView } from './components/LandedCostView';

function loadRates(): ExchangeRates {
  const usd = parseFloat(localStorage.getItem('logistics_usd_rate') || '');
  const eur = parseFloat(localStorage.getItem('logistics_eur_rub_rate') || '');
  const cny = parseFloat(localStorage.getItem('logistics_cny_rub_rate') || '');
  return {
    usdRub: Number.isFinite(usd) && usd > 0 ? usd : DEFAULT_RATES.usdRub,
    eurRub: Number.isFinite(eur) && eur > 0 ? eur : DEFAULT_RATES.eurRub,
    cnyRub: Number.isFinite(cny) && cny > 0 ? cny : DEFAULT_RATES.cnyRub,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'rates' | 'routes' | 'report' | 'analytics' | 'landed'>('rates');

  // Product state
  const [product, setProduct] = useState<ProductQuote>(() => {
    const saved = localStorage.getItem('landed_product');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      id: 'product-1',
      supplier: 'SHANXI XINCONGBANG METAL PRODUCTS CO.,LTD.',
      hsCode: '8708299000',
      pricePerM2CNY: 74,
      pricePerBoxCNY: 175,
      customsRate: 12,
      vatRate: 22,
      containerM2: 5000,
      weightPerM: 0.83,
      containerWeightKg: 13500,
    };
  });

  const [selectedQuote, setSelectedQuote] = useState<ForwarderQuote | null>(null);

  // Rates & Date state
  const [rates, setRates] = useState<ExchangeRates>(() => loadRates());

  const [reportDate, setReportDate] = useState<string>(() => {
    const saved = localStorage.getItem('logistics_report_date');
    if (saved) return saved;
    const today = new Date().toISOString().split('T')[0];
    return today;
  });

  // Quotes state
  const [quotes, setQuotes] = useState<ForwarderQuote[]>(() => {
    const saved = localStorage.getItem('logistics_quotes_v1');
    if (saved) {
      try {
        return normalizeQuotes(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading quotes', e);
      }
    }
    return [];
  });

  const [history, setHistory] = useState<ParsedSnapshot[]>(() => getHistory());

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('logistics_usd_rate', rates.usdRub.toString());
  }, [rates.usdRub]);
  useEffect(() => {
    localStorage.setItem('logistics_eur_rub_rate', rates.eurRub.toString());
  }, [rates.eurRub]);
  useEffect(() => {
    localStorage.setItem('logistics_cny_rub_rate', rates.cnyRub.toString());
  }, [rates.cnyRub]);

  useEffect(() => {
    localStorage.setItem('logistics_report_date', reportDate);
  }, [reportDate]);

  useEffect(() => {
    localStorage.setItem('logistics_quotes_v1', JSON.stringify(quotes));
  }, [quotes]);

  useEffect(() => {
    localStorage.setItem('landed_product', JSON.stringify(product));
  }, [product]);

  // Auto-fetch CBR exchange rates for the selected date
  const [rateSource, setRateSource] = useState<'cbr' | 'manual'>('cbr');
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRateError(null);
    fetchCbrRates(reportDate)
      .then(r => {
        if (cancelled) return;
        setRates({ usdRub: r.usdRub, eurRub: r.eurRub, cnyRub: r.cnyRub });
        setRateSource('cbr');
      })
      .catch(() => {
        if (cancelled) return;
        setRateError('Не удалось получить курс ЦБ, введите вручную');
        setRateSource('manual');
      });
    return () => { cancelled = true; };
  }, [reportDate]);

  const handleRefreshRates = () => {
    setRateError(null);
    fetchCbrRates(reportDate)
      .then(r => {
        setRates({ usdRub: r.usdRub, eurRub: r.eurRub, cnyRub: r.cnyRub });
        setRateSource('cbr');
      })
      .catch(() => setRateError('Не удалось получить курс ЦБ'));
  };

  const handleAddQuote = (newQuote: ForwarderQuote) => {
    setQuotes(prev => [newQuote, ...prev]);
  };

  const handleDeleteQuote = (id: string) => {
    if (window.confirm('Удалить эту котировку из анализа?')) {
      setQuotes(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleResetQuotes = () => {
    if (window.confirm('Очистить все ставки? Данные будут удалены без возможности восстановления.')) {
      setQuotes([]);
    }
  };

  const handleImportQuotes = (imported: ForwarderQuote[]) => {
    const hist = getHistory();
    setHistory(hist);
    setQuotes(prev => [...imported, ...prev]);
    // history[0] после импорта — снимок этих же данных; сравниваем с историей до импорта
    const changes = compareNewToLast(imported, hist[1]);
    if (changes.length > 0) setIsNotificationsOpen(true);
  };

  const handleUpdateQuote = (updated: ForwarderQuote) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
  };

  const handleRestoreQuotes = (restored: ForwarderQuote[]) => {
    setQuotes(restored);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ставки_${reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    const { downloadExcelTemplate } = await import('./utils/excelTemplate');
    downloadExcelTemplate();
  };

  const handleDownloadRfq = async () => {
    const { downloadRfqTemplate } = await import('./utils/excelTemplate');
    downloadRfqTemplate();
  };

  const handleExportSettings = () => {
    const blob = new Blob([exportAllData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Настройки_калькулятора_${reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (text: string) => {
    try {
      const restored = importAllData(text);
      if (restored.length === 0) {
        alert('В архиве не найдено данных приложения');
        return;
      }
      alert(`Импортировано: ${restored.length} секций настроек.\nСтраница будет перезагружена.`);
      window.location.reload();
    } catch (e: any) {
      alert(`Не удалось импортировать настройки: ${e.message}`);
    }
  };

  // Notifications: price changes vs the snapshot before the latest import
  const changeNotifications = useMemo<PriceChange[]>(() => {
    if (history.length === 0) return [];
    const baseline = history.length > 1 ? history[1] : history[0];
    return compareNewToLast(quotes, baseline);
  }, [quotes, history]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 sm:py-0 sm:h-16 gap-3">

            {/* Logo & App Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    Калькулятор логистики
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Китай → РФ
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Склады: Серпухов (Моск. обл.) и Ставрополь (СКФО)
                </p>
              </div>
            </div>

            {/* Quick Currency & Date Indicators in Header */}
            <div className="relative flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">USD:</span>
                <span className="font-mono font-bold text-white">{rates.usdRub.toFixed(2)} ₽</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">EUR:</span>
                <span className="font-mono font-bold text-white">{rates.eurRub.toFixed(2)} ₽</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">CNY:</span>
                <span className="font-mono font-bold text-white">{rates.cnyRub.toFixed(2)} ₽</span>
                {rateSource === 'cbr' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                    ЦБ
                  </span>
                )}
                <button
                  onClick={handleRefreshRates}
                  title="Обновить курсы ЦБ"
                  className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">{reportDate}</span>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(v => !v)}
                className={`relative p-2 rounded-xl border transition ${isNotificationsOpen ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-800/90 border-slate-700/80 text-slate-400 hover:text-white'}`}
                title="Уведомления об изменении ставок"
              >
                <Bell className="w-4 h-4" />
                {changeNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {changeNotifications.length}
                  </span>
                )}
              </button>
              {rateError && (
                <div className="absolute top-full right-4 mt-2 text-[11px] text-red-300 bg-red-950/80 border border-red-800 rounded-lg px-3 py-2 shadow-lg">
                  {rateError}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 no-scrollbar" aria-label="Вкладки">
              <button
                onClick={() => setActiveTab('rates')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'rates'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Сравнение ставок</span>
                <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
                  {quotes.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('routes')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'routes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>2. Схемы маршрутов</span>
              </button>

              <button
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>3. Итоговый отчет</span>
              </button>

              <button
                onClick={() => setActiveTab('landed')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'landed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>5. Земля + Логистика</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>4. Аналитика</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Notifications dropdown */}
      {isNotificationsOpen && (
        <div className="fixed z-40 top-16 right-4 sm:right-8 w-80 max-w-[calc(100vw-2rem)] bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Изменения ставок
            </span>
            <button onClick={() => setIsNotificationsOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {changeNotifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">
                Изменений относительно последнего снимка нет. Ставки зафиксированы.
              </div>
            ) : (
              changeNotifications.map((c, i) => (
                <div key={i} className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.carrier}</div>
                    <div className="text-[10px] text-slate-400">{c.destination}</div>
                  </div>
                  <div className={`font-mono font-bold shrink-0 flex items-center gap-1 ${c.changeUsd > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {c.changeUsd > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {c.changeUsd > 0 ? '+' : ''}{Math.round(c.changeUsd).toLocaleString('en-US')}$ ({c.changePercent > 0 ? '+' : ''}{c.changePercent}%)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main id="report-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'rates' && (
          <LogisticsTable
            quotes={quotes}
            rates={rates}
            onRatesChange={setRates}
            reportDate={reportDate}
            onDateChange={setReportDate}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteQuote={handleDeleteQuote}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onExportJSON={handleExportJSON}
            onDownloadTemplate={handleDownloadTemplate}
            onDownloadRfq={handleDownloadRfq}
            onExportSettings={handleExportSettings}
            onImportSettings={handleImportSettings}
            onResetQuotes={handleResetQuotes}
            onUpdateQuote={handleUpdateQuote}
          />
        )}

        {activeTab === 'routes' && <RouteMap />}

        {activeTab === 'report' && (
          <SummaryReport quotes={quotes} rates={rates} reportDate={reportDate} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView quotes={quotes} rates={rates} history={history} />
        )}

        {activeTab === 'landed' && (
          <div className="space-y-6">
            <ProductSection product={product} onChange={setProduct} />
            <LandedCostView
              product={product}
              selectedQuote={selectedQuote}
              rates={rates}
              quotes={quotes}
              onSelectQuote={setSelectedQuote}
            />
          </div>
        )}
      </main>

      {/* Add Quote Modal Dialog */}
      <AddQuoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddQuote}
      />

      {/* Import Modal Dialog */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportQuotes}
        onOpenHistory={() => { setIsImportModalOpen(false); setIsHistoryOpen(true); }}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestoreQuotes}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-slate-500 text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Расчет ставок для складов: Серпухов & Ставрополь.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Конвертация в USD на дату согласования</span>
          </div>
        </div>
      </footer>
    </div>
  );
}