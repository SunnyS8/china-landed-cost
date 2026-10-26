import React, { useMemo, useState } from 'react';
import { X, PlusCircle, Check, ArrowLeft, ArrowRight, ChevronDown, Info } from 'lucide-react';
import {
  ContainerSize,
  CostComponent,
  Currency,
  DestinationWarehouse,
  ExchangeRates,
  ForwarderQuote,
  RouteType,
} from '../types/logistics';
import { calculateQuoteCost, formatRUB } from '../utils/calculations';
import { defaultValidUntil } from '../utils/date';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quote: ForwarderQuote) => void;
  rates: ExchangeRates;
  existingForwarders?: string[];
}

const CURRENCY_LABELS: Record<Currency, string> = { USD: '$', EUR: '€', CNY: '¥', RUB: '₽' };
const CURRENCY_ORDER: Currency[] = ['USD', 'EUR', 'CNY', 'RUB'];

const ROUTE_OPTIONS: Array<{ value: RouteType; title: string; hint: string }> = [
  { value: 'sea_vvo_rail_truck', title: 'Море + Ж/Д + авто', hint: 'Шанхай/Нинбо → Владивосток → Москва → склад' },
  { value: 'direct_rail_truck', title: 'Прямое Ж/Д + авто', hint: 'Шанхай → Забайкальск → склад, без моря' },
  { value: 'deep_sea_novorossiysk', title: 'Море до Новороссийска + авто', hint: 'Deep sea → Новороссийск → склад' },
];

type CostKey = 'ocean' | 'rail' | 'truck' | 'fee' | 'terminal';

const COST_FIELDS: Array<{ key: CostKey; label: string; hint: string }> = [
  { key: 'ocean', label: 'Фрахт', hint: 'морской или магистральный' },
  { key: 'rail', label: 'Ж/Д плечо', hint: 'Владивосток → Москва' },
  { key: 'truck', label: 'Автовывоз', hint: 'до склада' },
  { key: 'fee', label: 'Экспедирование', hint: 'вознаграждение' },
  { key: 'terminal', label: 'Терминалы', hint: 'DTHC / СВХ / растаможка' },
];

const emptyCosts: Record<CostKey, CostComponent> = {
  ocean: { amount: 0, currency: 'USD' },
  rail: { amount: 0, currency: 'RUB' },
  truck: { amount: 0, currency: 'RUB' },
  fee: { amount: 0, currency: 'RUB' },
  terminal: { amount: 0, currency: 'RUB' },
};

const STEP_TITLES = ['Маршрут', 'Суммы', 'Срок'];

const CurrencySelect: React.FC<{ value: Currency; onChange: (c: Currency) => void }> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value as Currency)}
    className="px-1.5 py-2 text-xs bg-slate-100 border-y border-r border-slate-300 rounded-r-lg font-bold text-slate-700 outline-hidden focus:ring-1 focus:ring-blue-500"
  >
    {CURRENCY_ORDER.map(c => (
      <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
    ))}
  </select>
);

export const AddQuoteModal: React.FC<Props> = ({ isOpen, onClose, onAdd, rates, existingForwarders = [] }) => {
  const [step, setStep] = useState(1);

  const [forwarderName, setForwarderName] = useState('');
  const [destination, setDestination] = useState<DestinationWarehouse>('Серпухов');
  const [originPort, setOriginPort] = useState('Шанхай');
  const [routeType, setRouteType] = useState<RouteType>('sea_vvo_rail_truck');

  const [costs, setCosts] = useState<Record<CostKey, CostComponent>>(emptyCosts);

  const [transitDaysMin, setTransitDaysMin] = useState<number>(25);
  const [transitDaysMax, setTransitDaysMax] = useState<number>(35);
  const [containerSize, setContainerSize] = useState<ContainerSize>('40HC');
  const [weightTons, setWeightTons] = useState<number>(26);
  const [maxWeightTons, setMaxWeightTons] = useState<number>(20);
  const [overweightRateRub, setOverweightRateRub] = useState<number>(2000);
  const [vatRate, setVatRate] = useState<number>(20);
  const [validUntil, setValidUntil] = useState<string>(defaultValidUntil());
  const [comments, setComments] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const dedupedForwarders = useMemo(
    () => Array.from(new Set(existingForwarders.filter(Boolean))).slice(0, 30),
    [existingForwarders]
  );

  const totalAmount = costs.ocean.amount + costs.rail.amount + costs.truck.amount + costs.fee.amount + costs.terminal.amount;
  const step1Valid = forwarderName.trim().length > 0;
  const step2Valid = totalAmount > 0;

  const buildQuote = (): ForwarderQuote => {
    const transitHub =
      routeType === 'direct_rail_truck'
        ? 'Прямое Ж/Д'
        : routeType === 'deep_sea_novorossiysk'
          ? 'Новороссийск'
          : 'Владивосток';

    const routeDescription =
      routeType === 'direct_rail_truck'
        ? `${originPort} → Забайкальск → ${destination} (прямое Ж/Д + авто)`
        : routeType === 'deep_sea_novorossiysk'
          ? `${originPort} → Новороссийск → ${destination} (море + авто)`
          : `${originPort} → Владивосток → Москва → ${destination} (море + Ж/Д + авто)`;

    return {
      id: `quote-${Date.now()}`,
      forwarderName: forwarderName.trim(),
      destination,
      originPort,
      routeType,
      routeDescription,
      transitHub,
      oceanFreight: costs.ocean,
      railFreight: costs.rail,
      truckDelivery: costs.truck,
      forwarderFee: costs.fee,
      terminalExpenses: costs.terminal,
      transitDaysMin: Number(transitDaysMin) || 20,
      transitDaysMax: Number(transitDaysMax) || 30,
      containerSize,
      weightTons: Number(weightTons) || 0,
      maxWeightTons: Number(maxWeightTons) || 0,
      overweightRateRub: Number(overweightRateRub) || 0,
      vatRate,
      equipment: containerSize === '20GP' ? "20'GP" : "40'HC",
      validUntil: validUntil || defaultValidUntil(),
      comments: comments.trim(),
    };
  };

  const preview = useMemo(() => {
    if (!step2Valid || !rates.usdRub) return 0;
    try {
      return calculateQuoteCost(buildQuote(), rates).totalWithVatRub;
    } catch {
      return 0;
    }
  }, [costs, vatRate, containerSize, weightTons, maxWeightTons, overweightRateRub, rates, step2Valid]);

  const setCost = (key: CostKey, patch: Partial<CostComponent>) => {
    setCosts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const resetForm = () => {
    setStep(1);
    setForwarderName('');
    setDestination('Серпухов');
    setOriginPort('Шанхай');
    setRouteType('sea_vvo_rail_truck');
    setCosts(emptyCosts);
    setTransitDaysMin(25);
    setTransitDaysMax(35);
    setContainerSize('40HC');
    setWeightTons(26);
    setMaxWeightTons(20);
    setOverweightRateRub(2000);
    setVatRate(20);
    setValidUntil(defaultValidUntil());
    setComments('');
    setAdvancedOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = (addAnother: boolean) => {
    if (!step1Valid || !step2Valid) return;
    onAdd(buildQuote());

    if (addAnother) {
      // Сохраняем перевозчика и маршрут — вводим только новые суммы
      setCosts(emptyCosts);
      setComments('');
      setStep(2);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleContainerChange = (size: ContainerSize) => {
    setContainerSize(size);
    if (size === '20GP') {
      setWeightTons(18);
      setMaxWeightTons(21);
    } else {
      setWeightTons(26);
      setMaxWeightTons(20);
    }
  };

  if (!isOpen) return null;

  const canGoNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Новая ставка перевозчика</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Три коротких шага. Обязательные поля отмечены, остальное — по желанию.
              </p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Закрыть">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEP_TITLES.map((title, i) => {
              const num = i + 1;
              const isCurrent = step === num;
              const isDone = step > num;
              return (
                <React.Fragment key={title}>
                  {i > 0 && <div className={`h-px flex-1 ${isDone || isCurrent ? 'bg-blue-300' : 'bg-slate-200'}`} />}
                  <button
                    type="button"
                    onClick={() => num < step && setStep(num)}
                    disabled={num > step}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isDone
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-slate-100 text-slate-400'
                    } ${num > step ? 'cursor-default' : ''}`}
                  >
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
                      isCurrent ? 'bg-white/20' : isDone ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isDone ? <Check className="w-2.5 h-2.5" /> : num}
                    </span>
                    {title}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Перевозчик *</label>
                <input
                  type="text"
                  list="known-forwarders"
                  value={forwarderName}
                  onChange={e => setForwarderName(e.target.value)}
                  placeholder="Например: ИГЛ Логистика"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <datalist id="known-forwarders">
                  {dedupedForwarders.map(name => <option key={name} value={name} />)}
                </datalist>
                {dedupedForwarders.length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">Начните вводить — подставим имя из уже добавленных.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Склад назначения *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Серпухов', 'Ставрополь'] as DestinationWarehouse[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDestination(d)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                        destination === d
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Порт отгрузки</label>
                <select
                  value={originPort}
                  onChange={e => setOriginPort(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="Шанхай">Шанхай</option>
                  <option value="Нинбо">Нинбо</option>
                  <option value="Шанхай / Нинбо">Шанхай / Нинбо</option>
                  <option value="Циндао">Циндао</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Тип маршрута *</label>
                <div className="space-y-2">
                  {ROUTE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRouteType(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                        routeType === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${routeType === opt.value ? 'text-blue-900' : 'text-slate-800'}`}>
                        {opt.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Введите суммы как в КП. Если услуги нет в ставке — оставьте 0. Валюту выбирайте ту, что указана в счёте перевозчика.
                </span>
              </div>

              <div className="space-y-2.5">
                {COST_FIELDS.map(field => {
                  const cost = costs[field.key];
                  const label = field.key === 'ocean' && routeType === 'direct_rail_truck' ? 'Магистральный фрахт' : field.label;
                  return (
                    <div key={field.key}>
                      <div className="flex items-baseline justify-between mb-0.5">
                        <label className="text-xs font-semibold text-slate-700">{label}</label>
                        <span className="text-[10px] text-slate-400">{field.hint}</span>
                      </div>
                      <div className="flex">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost.amount || ''}
                          placeholder="0"
                          onChange={e => setCost(field.key, { amount: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                        <CurrencySelect value={cost.currency} onChange={c => setCost(field.key, { currency: c })} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Логистика по этой ставке</div>
                  <div className="text-[11px] text-slate-400">с НДС на российские услуги, по курсу ЦБ</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{preview > 0 ? formatRUB(preview) : '—'}</div>
                  {preview === 0 && totalAmount > 0 && (
                    <div className="text-[10px] text-amber-600">проверьте курс валют</div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Срок доставки, дн</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={transitDaysMin}
                      onChange={e => setTransitDaysMin(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    <span className="text-slate-400 text-xs">–</span>
                    <input
                      type="number"
                      min="1"
                      value={transitDaysMax}
                      onChange={e => setTransitDaysMax(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Контейнер</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['40HC', '20GP'] as ContainerSize[]).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleContainerChange(size)}
                        className={`px-2 py-2 rounded-lg border text-sm font-semibold transition ${
                          containerSize === size
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {size === '40HC' ? "40'HC" : "20'GP"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs text-slate-600">Итого логистика с НДС</span>
                <span className="text-base font-black text-slate-900">{preview > 0 ? formatRUB(preview) : '—'}</span>
              </div>

              <div className="rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition"
                >
                  <span>Дополнительно: вес, перевес, НДС, срок действия</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </button>

                {advancedOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Вес груза, т</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weightTons}
                          onChange={e => setWeightTons(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Включено, т</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={maxWeightTons}
                          onChange={e => setMaxWeightTons(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Перевес, ₽/т</label>
                        <input
                          type="number"
                          min="0"
                          value={overweightRateRub}
                          onChange={e => setOverweightRateRub(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">НДС на рос. услуги</label>
                        <select
                          value={vatRate}
                          onChange={e => setVatRate(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                        >
                          <option value={20}>20%</option>
                          <option value={22}>22%</option>
                          <option value={5}>5%</option>
                          <option value={0}>Без НДС</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Ставка действительна до</label>
                        <input
                          type="date"
                          value={validUntil}
                          onChange={e => setValidUntil(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Примечание</label>
                      <input
                        type="text"
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        placeholder="Free time, условия дропа, демередж…"
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={step === 1 ? handleClose : () => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            {step === 1 ? 'Отмена' : <><ArrowLeft className="w-4 h-4" /> Назад</>}
          </button>

          <div className="flex items-center gap-2">
            {step === 3 && (
              <button
                type="button"
                onClick={() => handleAdd(true)}
                disabled={!step1Valid || !step2Valid}
                className="px-4 py-2 text-sm font-semibold text-blue-700 border border-blue-200 bg-white rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                + Ещё маршрут
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Далее <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAdd(false)}
                disabled={!step1Valid || !step2Valid}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <PlusCircle className="w-4 h-4" />
                Добавить в анализ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
