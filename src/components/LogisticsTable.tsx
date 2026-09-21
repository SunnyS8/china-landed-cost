import React, { useState } from 'react';
import {
  DestinationWarehouse,
  ExchangeRates,
  ForwarderQuote,
  RouteType
} from '../types/logistics';
import {
  calculateQuoteCost,
  formatUSD,
  formatRUB
} from '../utils/calculations';
import {
  DollarSign,
  Calendar,
  Filter,
  Plus,
  Download,
  ArrowUpDown,
  Ship,
  Train,
  Truck,
  Award,
  Zap,
  Trash2,
  Info,
  CheckCircle2,
  TrendingDown,
  Upload,
  Search,
  Star,
  FileSpreadsheet,
  FileText,
  Settings,
  StickyNote
} from 'lucide-react';

interface Props {
  quotes: ForwarderQuote[];
  rates: ExchangeRates;
  reportDate: string;
  onRatesChange: (rates: ExchangeRates) => void;
  onDateChange: (newDate: string) => void;
  onOpenAddModal: () => void;
  onDeleteQuote: (id: string) => void;
  onOpenImportModal: () => void;
  onExportJSON: () => void;
  onDownloadTemplate: () => void;
  onDownloadRfq: () => void;
  onExportSettings: () => void;
  onImportSettings: (text: string) => void;
  onResetQuotes: () => void;
  onUpdateQuote?: (quote: ForwarderQuote) => void;
}

export const LogisticsTable: React.FC<Props> = ({
  quotes,
  rates,
  reportDate,
  onRatesChange,
  onDateChange,
  onOpenAddModal,
  onDeleteQuote,
  onOpenImportModal,
  onExportJSON,
  onDownloadTemplate,
  onDownloadRfq,
  onExportSettings,
  onImportSettings,
  onResetQuotes,
  onUpdateQuote
}) => {
  const [selectedDestination, setSelectedDestination] = useState<'ALL' | DestinationWarehouse>('ALL');
  const [selectedRouteType, setSelectedRouteType] = useState<'ALL' | RouteType>('ALL');
  const [sortBy, setSortBy] = useState<'priceAsc' | 'priceDesc' | 'daysAsc'>('priceAsc');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter quotes
  const filteredQuotes = quotes.filter(q => {
    if (selectedDestination !== 'ALL' && q.destination !== selectedDestination) return false;
    if (selectedRouteType !== 'ALL' && q.routeType !== selectedRouteType) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchable = `${q.forwarderName} ${q.originPort} ${q.transitHub} ${q.routeDescription}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  // Calculate costs and sort
  const calculatedList = filteredQuotes.map(quote => ({
    quote,
    calc: calculateQuoteCost(quote, rates)
  }));

  // Find min price & fastest
  const minPriceUsd = calculatedList.length > 0 
    ? Math.min(...calculatedList.map(item => item.calc.totalUsd)) 
    : 0;
  const minDays = calculatedList.length > 0 
    ? Math.min(...calculatedList.map(item => item.quote.transitDaysMin)) 
    : 0;

  // Sorting
  calculatedList.sort((a, b) => {
    const favDiff = (b.quote.favorite ? 1 : 0) - (a.quote.favorite ? 1 : 0);
    if (favDiff !== 0) return favDiff;
    if (sortBy === 'priceAsc') return a.calc.totalUsd - b.calc.totalUsd;
    if (sortBy === 'priceDesc') return b.calc.totalUsd - a.calc.totalUsd;
    if (sortBy === 'daysAsc') return a.quote.transitDaysMin - b.quote.transitDaysMin;
    return 0;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Экспедитор',
      'Склад назначения',
      'Порт отправления',
      'Маршрут',
      'Фрахт ($)',
      'Ж/Д ($)',
      'Автовывоз ($)',
      'Вознаграждение ($)',
      'Терминальные ($)',
      'ИТОГО USD',
      'ИТОГО RUB',
      'Срок (дней)'
    ];

    const rows = calculatedList.map(({ quote, calc }) => [
      `"${quote.forwarderName}"`,
      `"${quote.destination}"`,
      `"${quote.originPort}"`,
      `"${quote.transitHub}"`,
      calc.oceanFreightUsd,
      calc.railFreightUsd,
      calc.truckDeliveryUsd,
      calc.forwarderFeeUsd,
      calc.terminalExpensesUsd,
      calc.totalUsd,
      calc.totalRub,
      `"${quote.transitDaysMin}-${quote.transitDaysMax}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Сравнение_ставок_экспедиторов_${reportDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRouteBadge = (type: RouteType) => {
    switch (type) {
      case 'sea_vvo_rail_truck':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <Ship className="w-3 h-3" /> Море + Ж/Д
          </span>
        );
      case 'direct_rail_truck':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <Train className="w-3 h-3" /> Прямое Ж/Д
          </span>
        );
      case 'deep_sea_novorossiysk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Ship className="w-3 h-3" /> Deep Sea (Море)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Rate & Parameters Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Rate setting (core requirement from audio) */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  Курсы валют к рублю (на день согласования)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {([
                    ['USD', rates.usdRub],
                    ['EUR', rates.eurRub],
                    ['CNY', rates.cnyRub],
                  ] as const).map(([code, value]) => (
                    <div key={code} className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-700">{code}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Math.round(value * 100) / 100}
                        onChange={(e) => onRatesChange({ ...rates, [code === 'USD' ? 'usdRub' : code === 'EUR' ? 'eurRub' : 'cnyRub']: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-sm font-bold text-blue-950 bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-blue-800">₽</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Date of analysis */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="p-2 bg-slate-700 text-white rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Дата согласования отчета
                </span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="mt-0.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition"
              title="Импорт ставок из JSON/CSV"
            >
              <Upload className="w-4 h-4" />
              Импорт
            </button>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Добавить экспедитора
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition"
              title="Экспорт таблицы в формате CSV (Excel)"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={onExportJSON}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition"
              title="Экспорт ставок в JSON"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition"
              title="Скачать Excel-шаблон для ручного ввода ставок"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Шаблон
            </button>
            <button
              onClick={onDownloadRfq}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200 transition"
              title="Скачать форму запроса цен для перевозчиков (RFQ)"
            >
              <FileText className="w-4 h-4" />
              Запрос цен
            </button>
            <button
              onClick={onResetQuotes}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold border border-rose-200 transition"
              title="Очистить все ставки (удалить из списка)"
            >
              <Trash2 className="w-4 h-4" />
              Очистить
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onExportSettings}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition"
                title="Экспортировать все настройки (ставки, курсы, историю) в JSON"
              >
                <Settings className="w-4 h-4" />
                Настройки
              </button>
              <label
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-r-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-l-0 border-slate-200 transition cursor-pointer"
                title="Импортировать настройки из JSON-архива"
              >
                <Upload className="w-3.5 h-3.5" />
                Импорт
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) f.text().then(onImportSettings).catch(err => alert(`Ошибка чтения файла: ${err.message}`));
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Currency Conversion Note */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Методика расчёта:</strong> ставки, номинированные в различных валютах, приводятся к единому эквиваленту — доллару США — по курсу Центрального банка Российской Федерации, действующему на дату формирования отчёта. Сравнение и анализ всех ставок выполняется на единой валютной базе по курсу на дату согласования отчёта.
          </span>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search by name */}
        <div className="flex items-center gap-2 w-full sm:w-64">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по экспедитору..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Destination Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDestination('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDestination === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Все склады ({quotes.length})
          </button>
          <button
            onClick={() => setSelectedDestination('Серпухов')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDestination === 'Серпухов'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            📍 Склад Серпухов ({quotes.filter(q => q.destination === 'Серпухов').length})
          </button>
          <button
            onClick={() => setSelectedDestination('Ставрополь')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDestination === 'Ставрополь'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            📍 Склад Ставрополь ({quotes.filter(q => q.destination === 'Ставрополь').length})
          </button>

          {/* Route Type Dropdown */}
          <select
            value={selectedRouteType}
            onChange={(e) => setSelectedRouteType(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-hidden"
          >
            <option value="ALL">Все маршруты (Море, ЖД, Прямое)</option>
            <option value="sea_vvo_rail_truck">Море Владивосток + Ж/Д + Авто</option>
            <option value="direct_rail_truck">Прямое Ж/Д + Авто</option>
            <option value="deep_sea_novorossiysk">Deep Sea Море</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Сортировка:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-hidden"
          >
            <option value="priceAsc">Сначала дешевые ($)</option>
            <option value="priceDesc">Сначала дорогие ($)</option>
            <option value="daysAsc">Сначала быстрые (срок в днях)</option>
          </select>
        </div>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-4">Экспедитор / Оборудование</th>
                <th className="py-4 px-3">Склад & Маршрут</th>
                <th className="py-4 px-3 text-right">Фрахт ($)</th>
                <th className="py-4 px-3 text-right">Ж/Д плечо</th>
                <th className="py-4 px-3 text-right">Автовывоз</th>
                <th className="py-4 px-3 text-right">Комиссия & Дроп</th>
                <th className="py-4 px-4 text-right bg-blue-50/70 text-blue-950 font-extrabold">
                  ИТОГО (USD)
                </th>
                <th className="py-4 px-4 text-right text-slate-600">ИТОГО (RUB)</th>
                <th className="py-4 px-3 text-center">Срок в пути</th>
                <th className="py-4 px-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {calculatedList.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-14 px-4 text-center">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="text-slate-800 font-semibold mb-1">Нет данных о ставках</div>
                    <div className="text-slate-500 text-xs leading-relaxed">
                      Импортируйте свой Excel-прайс вкладкой «Импорт» или добавьте ставку вручную
                      (кнопка «+ Добавить ставку»).
                    </div>
                  </td>
                </tr>
              )}
              {calculatedList.map(({ quote, calc }) => {
                const isMinPrice = calc.totalUsd === minPriceUsd && calculatedList.length > 1;
                const isFastest = quote.transitDaysMin === minDays && calculatedList.length > 1;
                const isExpanded = expandedQuoteId === quote.id;

                return (
                  <React.Fragment key={quote.id}>
                    <tr className={`transition hover:bg-slate-50/80 ${
                      isMinPrice ? 'bg-emerald-50/30' : ''
                    }`}>
                      {/* Forwarder info */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                          {quote.forwarderName}
                          {quote.note && (
                            <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Есть заметка" />
                          )}
                          {isMinPrice && (
                            <span 
                              title="Минимальная ставка"
                              className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                            >
                              <Award className="w-3 h-3" /> BEST PRICE
                            </span>
                          )}
                          {isFastest && (
                            <span 
                              title="Самый быстрый срок доставки"
                              className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                            >
                              <Zap className="w-3 h-3 text-amber-600" /> FASTEST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{quote.originPort}</span>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px] text-slate-700">
                            {quote.equipment}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-slate-600">
                            {formatRUB(quote.overweightRateRub)}/т перевес
                          </span>
                        </div>
                      </td>

                      {/* Destination & Route */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            quote.destination === 'Серпухов'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {quote.destination}
                          </span>
                          {getRouteBadge(quote.routeType)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate" title={quote.routeDescription}>
                          {quote.transitHub}
                        </div>
                      </td>

                      {/* Ocean freight */}
                      <td className="py-4 px-3 text-right">
                        {quote.oceanFreight.amount > 0 ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {formatUSD(calc.oceanFreightUsd)}
                            </div>
                            {quote.oceanFreight.currency === 'RUB' && (
                              <div className="text-[10px] text-slate-400">
                                {formatRUB(quote.oceanFreight.amount)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Rail freight */}
                      <td className="py-4 px-3 text-right">
                        {quote.railFreight.amount > 0 ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {formatUSD(calc.railFreightUsd)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {quote.railFreight.currency === 'RUB' 
                                ? formatRUB(quote.railFreight.amount) 
                                : formatUSD(quote.railFreight.amount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Trucking */}
                      <td className="py-4 px-3 text-right">
                        <div>
                          <div className="font-medium text-slate-900">
                            {formatUSD(calc.truckDeliveryUsd)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatRUB(quote.truckDelivery.amount)}
                          </div>
                        </div>
                      </td>

                      {/* Agency Fee & Drop */}
                      <td className="py-4 px-3 text-right">
                        <div className="font-medium text-slate-800">
                          {formatUSD(calc.forwarderFeeUsd + calc.terminalExpensesUsd)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ком: {formatUSD(calc.forwarderFeeUsd)}
                        </div>
                      </td>

                      {/* TOTAL USD */}
                      <td className="py-4 px-4 text-right bg-blue-50/70">
                        <div className="text-base font-extrabold text-blue-900">
                          {formatUSD(calc.totalUsd)}
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700/80 uppercase">
                          по курсу {rates.usdRub.toFixed(2)} ₽/USD
                        </div>
                      </td>

                      {/* TOTAL RUB */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-800 text-sm">
                          {formatRUB(calc.totalRub)}
                        </div>
                      </td>

                      {/* Transit Days */}
                      <td className="py-4 px-3 text-center">
                        <span className="inline-block font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md">
                          {quote.transitDaysMin} – {quote.transitDaysMax} дн.
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onUpdateQuote?.({ ...quote, favorite: !quote.favorite })}
                            className={`p-1.5 rounded-lg transition ${quote.favorite ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                            title={quote.favorite ? 'Убрать из избранного' : 'Закрепить в избранном'}
                          >
                            <Star className="w-4 h-4" fill={quote.favorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                            className="p-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Детализация ставки"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteQuote(quote.id)}
                            className="p-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Удалить котировку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Breakdown Accordion Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-y border-slate-200">
                        <td colSpan={10} className="p-4 sm:p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                                Полный маршрут и особенности
                              </h5>
                              <p className="text-slate-700 leading-relaxed">
                                {quote.routeDescription}
                              </p>
                              {quote.comments && (
                                <p className="text-blue-800 bg-blue-100/60 p-2.5 rounded-lg border border-blue-200">
                                  <strong>Примечание экспедитора:</strong> {quote.comments}
                                </p>
                              )}
<p className="text-slate-500 text-[11px]">
                                  Ставка действительна до: <strong>{quote.validUntil}</strong>
                                </p>
                                {onUpdateQuote && (
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1">
                                      <StickyNote className="w-3 h-3" /> Заметка
                                    </span>
                                    <textarea
                                      value={quote.note || ''}
                                      onChange={(e) => onUpdateQuote({ ...quote, note: e.target.value })}
                                      placeholder="Ваша заметка к маршруту (например: «договорились о скидке 3%», «ждём ответ»)"
                                      rows={2}
                                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-hidden focus:ring-2 focus:ring-blue-500 resize-y"
                                    />
                                  </div>
                                )}
                            </div>

                            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
<h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                                 Детализация калькуляции (курсы USD {rates.usdRub.toFixed(2)} ₽ · EUR {rates.eurRub.toFixed(2)} ₽ · CNY {rates.cnyRub.toFixed(2)} ₽)
                               </h5>
                              <div className="grid grid-cols-2 gap-y-1.5 text-slate-700">
                                <span>Морской фрахт (без НДС):</span>
                                <span className="text-right font-medium">{formatUSD(calc.oceanFreightUsd)} ({formatRUB(calc.oceanFreightRub)})</span>

                                <span>Ж/Д доставка (с НДС):</span>
                                <span className="text-right font-medium">{formatUSD(calc.railFreightUsd)} ({formatRUB(calc.railFreightRub)})</span>

                                <span>Автовывоз (с НДС):</span>
                                <span className="text-right font-medium">{formatUSD(calc.truckDeliveryUsd)} ({formatRUB(calc.truckDeliveryRub)})</span>

                                <span>Комиссия экспедитора (с НДС):</span>
                                <span className="text-right font-medium">{formatUSD(calc.forwarderFeeUsd)} ({formatRUB(calc.forwarderFeeRub)})</span>

                                <span>Терминал / Растаможка (с НДС):</span>
                                <span className="text-right font-medium">{formatUSD(calc.terminalExpensesUsd)} ({formatRUB(calc.terminalExpensesRub)})</span>

                                <span>Перевес {quote.weightTons - quote.maxWeightTons > 0 ? `(+${quote.weightTons - quote.maxWeightTons} т)` : '(нет)'}:</span>
                                <span className="text-right font-medium text-amber-700">
                                  {calc.overweightRub > 0 ? formatUSD(calc.overweightUsd) + ' (' + formatRUB(calc.overweightRub) + ')' : '—'}
                                </span>

                                <span>НДС ({quote.vatRate}% на российские услуги):</span>
                                <span className="text-right font-medium text-emerald-700">
                                  {quote.vatRate > 0 ? formatUSD(calc.vatUsd) + ' (' + formatRUB(calc.vatRub) + ')' : '—'}
                                </span>

                                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                                  <span>Итого без НДС:</span>
                                  <span>{formatUSD(calc.totalWithoutVatUsd)} / {formatRUB(calc.totalWithoutVatRub)}</span>
                                </div>

                                <div className="col-span-2 border-t border-slate-200 flex justify-between font-bold text-blue-900 text-sm pt-2">
                                  <span>Итого к оплате (с НДС):</span>
                                  <span>{formatUSD(calc.totalWithVatUsd)} / {formatRUB(calc.totalWithVatRub)}</span>
                                </div>

                                {onUpdateQuote && (
                                  <div className="mt-4 pt-3 border-t border-slate-200">
                                    <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                                      Параметры контейнера
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div>
                                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                          Контейнер
                                        </span>
                                        <div className="flex rounded-lg overflow-hidden border border-slate-300">
                                          {(['20GP', '40HC'] as const).map(size => (
                                            <button
                                              key={size}
                                              onClick={() => onUpdateQuote({ ...quote, containerSize: size, equipment: size === '20GP' ? "20'GP" : "40'HC" })}
                                              className={`px-3 py-1 text-xs font-bold transition ${
                                                quote.containerSize === size
                                                  ? 'bg-blue-600 text-white'
                                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                                              }`}
                                            >
                                              {size === '20GP' ? "20'GP" : "40'HC"}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div>
                                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                          Вес груза, т (включено {quote.maxWeightTons} т)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={quote.weightTons}
                                          onChange={(e) => onUpdateQuote({ ...quote, weightTons: Math.max(0, parseFloat(e.target.value) || 0) })}
                                          className="w-24 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>

                                      <div>
                                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                          Ставка НДС (росс. услуги)
                                        </span>
                                        <select
                                          value={quote.vatRate}
                                          onChange={(e) => onUpdateQuote({ ...quote, vatRate: parseInt(e.target.value) })}
                                          className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-hidden"
                                        >
                                          <option value={0}>Без НДС</option>
                                          <option value={5}>НДС 5%</option>
                                          <option value={20}>НДС 20%</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
