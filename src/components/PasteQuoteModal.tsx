import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardPaste,
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MousePointerClick,
} from 'lucide-react';
import { Currency, DestinationWarehouse, ExchangeRates, RouteType } from '../types/logistics';
import { ParsedQuoteDraft, draftToQuote, parseQuotesText } from '../utils/parseTextQuote';
import { calculateQuoteCost, formatRUB } from '../utils/calculations';
import { saveSnapshot } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (quotes: ReturnType<typeof draftToQuote>[]) => void;
  rates: ExchangeRates;
  existingForwarders?: string[];
}

const CURRENCIES: Currency[] = ['USD', 'EUR', 'CNY', 'RUB'];
const CURRENCY_SIGNS: Record<Currency, string> = { USD: '$', EUR: '€', CNY: '¥', RUB: '₽' };

const ROUTE_LABELS: Record<RouteType, string> = {
  sea_vvo_rail_truck: 'Море ВВО + Ж/Д + авто',
  direct_rail_truck: 'Прямое Ж/Д + авто',
  deep_sea_novorossiysk: 'Море Новороссийск + авто',
};

export const PASTE_EXAMPLE = `ИГЛ Логистика, коммерческое предложение от 24.10.2026

1) Шанхай → Владивосток (море) → Ж/Д Москва → Серпухов, 40HC, 26 тн, включено 20 т
Морской фрахт 4550 USD, Ж/Д 375 000 руб, автовывоз 78 000 руб, экспедирование 15 000 руб, терминал 35 000 руб, срок 35-42 дн, перевес 2000 руб/т, НДС 22%

2) Циндао → Новороссийск → Ставрополь, 40HC, 26 тн
Фрахт 7550 USD, автовывоз 78 000 руб, экспедирование 3000 руб, терминальные 59 660 руб, срок 32-38 дн, НДС 5%`;

const hasAnyCost = (d: ParsedQuoteDraft): boolean =>
  d.oceanFreight.amount + d.railFreight.amount + d.truckDelivery.amount + d.forwarderFee.amount + d.terminalExpenses.amount > 0;

export const PasteQuoteModal: React.FC<Props> = ({ isOpen, onClose, onImport, rates, existingForwarders = [] }) => {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<ParsedQuoteDraft[]>([]);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (!text.trim()) {
      setDrafts([]);
      setParsing(false);
      return;
    }
    setParsing(true);
    const timer = setTimeout(() => {
      setDrafts(parseQuotesText(text));
      setParsing(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [text]);

  const updateDraft = (id: string, patch: Partial<ParsedQuoteDraft>) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const invalid = useMemo(
    () => drafts.filter(d => !d.forwarderName.trim() || !hasAnyCost(d)),
    [drafts]
  );

  const canImport = drafts.length > 0 && invalid.length === 0;

  const reset = () => {
    setText('');
    setDrafts([]);
    setParsing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = () => {
    if (!canImport) return;
    const quotes = drafts.map((d, i) => draftToQuote(d, i));
    saveSnapshot(quotes, ['Текст КП']);
    onImport(quotes);
    reset();
    onClose();
  };

  const totals = drafts.map(d => {
    try {
      return hasAnyCost(d) ? calculateQuoteCost(draftToQuote(d, 0), rates).totalWithVatRub : 0;
    } catch {
      return 0;
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ClipboardPaste className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Вставить текст КП</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Скопируйте письмо или сообщение перевозчика как есть — разберём суммы, маршрут и срок
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Закрыть">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={text ? 7 : 9}
              placeholder={'Например:\nШанхай → Владивосток → Ж/Д Москва → Серпухов, 40HC, 26 тн\nМорской фрахт 4550 USD, Ж/Д 375 000 руб, автовывоз 78 000 руб, срок 35–42 дн, НДС 22%'}
              className="w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden resize-y font-mono leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setText(PASTE_EXAMPLE)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                Вставить пример
              </button>
              {text && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-slate-500 hover:text-slate-700 underline decoration-dotted"
                >
                  Очистить
                </button>
              )}
              <span className="text-slate-400">
                {parsing ? 'Разбираем текст…' : drafts.length > 0 ? `Распознано ставок: ${drafts.length}` : 'Разбор начнётся автоматически'}
              </span>
            </div>
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Разбираем текст…
            </div>
          )}

          {!parsing && text.trim() && drafts.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Не удалось распознать ставки
              </div>
              <p className="mt-1 text-amber-800">
                Попробуйте вставить текст построчно или загрузите Excel-файл — в нём разбор надёжнее.
              </p>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Проверьте распознанное
                </div>
                <div className="text-[11px] text-slate-400">
                  Все поля можно править прямо здесь
                </div>
              </div>

              {drafts.map((draft, idx) => {
                const issues = draft.issues;
                const hasError = !draft.forwarderName.trim() || !hasAnyCost(draft);
                return (
                  <div
                    key={draft.id}
                    className={`rounded-xl border p-4 space-y-3 ${
                      hasError ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1 text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Перевозчик</label>
                          <input
                            list="paste-forwarders"
                            value={draft.forwarderName}
                            onChange={e => updateDraft(draft.id, { forwarderName: e.target.value })}
                            placeholder="Название компании"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden ${
                              draft.forwarderName.trim() ? 'border-slate-300' : 'border-red-300 bg-red-50'
                            }`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Склад</label>
                            <select
                              value={draft.destination}
                              onChange={e => updateDraft(draft.id, { destination: e.target.value as DestinationWarehouse })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="Серпухов">Серпухов</option>
                              <option value="Ставрополь">Ставрополь</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Контейнер</label>
                            <select
                              value={draft.containerSize}
                              onChange={e => updateDraft(draft.id, { containerSize: e.target.value as '20GP' | '40HC' })}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="40HC">40'HC</option>
                              <option value="20GP">20'GP</option>
                            </select>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Тип маршрута</label>
                          <select
                            value={draft.routeType}
                            onChange={e => updateDraft(draft.id, { routeType: e.target.value as RouteType })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                          >
                            {(Object.keys(ROUTE_LABELS) as RouteType[]).map(rt => (
                              <option key={rt} value={rt}>{ROUTE_LABELS[rt]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDraft(draft.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        aria-label="Удалить ставку"
                        title="Удалить ставку"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {([
                        ['oceanFreight', 'Фрахт'],
                        ['railFreight', 'Ж/Д'],
                        ['truckDelivery', 'Автовывоз'],
                        ['forwarderFee', 'Комиссия'],
                        ['terminalExpenses', 'Терминал'],
                      ] as const).map(([key, label]) => {
                        const cost = draft[key];
                        return (
                          <div key={key}>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">{label}</label>
                            <div className="flex">
                              <input
                                type="number"
                                min="0"
                                value={cost.amount || ''}
                                placeholder="0"
                                onChange={e =>
                                  updateDraft(draft.id, {
                                    [key]: { ...cost, amount: Number(e.target.value) || 0 },
                                  } as Partial<ParsedQuoteDraft>)
                                }
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-l-lg outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                              <select
                                value={cost.currency}
                                onChange={e =>
                                  updateDraft(draft.id, {
                                    [key]: { ...cost, currency: e.target.value as Currency },
                                  } as Partial<ParsedQuoteDraft>)
                                }
                                className="px-1.5 py-1.5 text-xs bg-slate-100 border-y border-r border-slate-300 rounded-r-lg font-bold"
                              >
                                {CURRENCIES.map(c => (
                                  <option key={c} value={c}>{CURRENCY_SIGNS[c]}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Срок, дн</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={draft.transitDaysMin}
                            onChange={e => updateDraft(draft.id, { transitDaysMin: Number(e.target.value) || 1 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-slate-400 text-xs">–</span>
                          <input
                            type="number"
                            min="1"
                            value={draft.transitDaysMax}
                            onChange={e => updateDraft(draft.id, { transitDaysMax: Number(e.target.value) || 1 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        {issues.map((issue, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md ${
                              issue.severity === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {issue.message}
                          </span>
                        ))}
                        {issues.length === 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Распознано без замечаний
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Логистика с НДС</div>
                        <div className="text-sm font-bold text-slate-900">
                          {totals[idx] > 0 ? formatRUB(totals[idx]) : '—'}
                        </div>
                      </div>
                    </div>

                    <details className="text-[11px] text-slate-500">
                      <summary className="cursor-pointer select-none hover:text-slate-700">Исходный фрагмент</summary>
                      <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-slate-600">
                        {draft.source}
                      </p>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <p className="text-[11px] text-slate-500">
            {drafts.length === 0
              ? 'Ставки добавляются в анализ только после вашего подтверждения'
              : invalid.length > 0
                ? 'Заполните перевозчика у всех ставок, чтобы добавить их'
                : `Будет добавлено ставок: ${drafts.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              Отмена
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Добавить {drafts.length > 0 ? `(${drafts.length})` : ''}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <datalist id="paste-forwarders">
        {existingForwarders.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
};
