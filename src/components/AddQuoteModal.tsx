import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { ContainerSize, Currency, DestinationWarehouse, ForwarderQuote, RouteType } from '../types/logistics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quote: ForwarderQuote) => void;
}

const CURRENCY_LABELS: Record<Currency, string> = { USD: '$', EUR: '€', CNY: '¥', RUB: '₽' };
const CURRENCY_ORDER: Currency[] = ['USD', 'EUR', 'CNY', 'RUB'];

const CurrencySelect: React.FC<{ value: Currency; onChange: (c: Currency) => void }> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value as Currency)}
    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
  >
    {CURRENCY_ORDER.map(c => (
      <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
    ))}
  </select>
);

export const AddQuoteModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [forwarderName, setForwarderName] = useState('');
  const [destination, setDestination] = useState<DestinationWarehouse>('Серпухов');
  const [originPort, setOriginPort] = useState('Шанхай');
  const [routeType, setRouteType] = useState<RouteType>('sea_vvo_rail_truck');
  const [transitHub, setTransitHub] = useState('');
  
  const [oceanFreight, setOceanFreight] = useState<number>(2000);
  const [oceanCurrency, setOceanCurrency] = useState<Currency>('USD');
  
  const [railFreight, setRailFreight] = useState<number>(210000);
  const [railCurrency, setRailCurrency] = useState<Currency>('RUB');
  
  const [truckDelivery, setTruckDelivery] = useState<number>(28000);
  const [truckCurrency, setTruckCurrency] = useState<Currency>('RUB');
  
  const [forwarderFee, setForwarderFee] = useState<number>(15000);
  const [feeCurrency, setFeeCurrency] = useState<Currency>('RUB');

  const [terminalExpenses, setTerminalExpenses] = useState<number>(250);
  const [terminalCurrency, setTerminalCurrency] = useState<Currency>('USD');

  const [transitDaysMin, setTransitDaysMin] = useState<number>(25);
  const [transitDaysMax, setTransitDaysMax] = useState<number>(32);
  const [comments, setComments] = useState('');

  const [containerSize, setContainerSize] = useState<ContainerSize>('40HC');
  const [weightTons, setWeightTons] = useState<number>(26);
  const [maxWeightTons, setMaxWeightTons] = useState<number>(20);
  const [overweightRateRub, setOverweightRateRub] = useState<number>(2000);
  const [vatRate, setVatRate] = useState<number>(20);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwarderName.trim()) return;

    const newQuote: ForwarderQuote = {
      id: 'quote-' + Date.now(),
      forwarderName: forwarderName.trim(),
      destination,
      originPort,
      routeType,
      routeDescription: `${originPort} → ${transitHub || 'Транзитный хаб'} → Автовывоз ${destination}`,
      transitHub: transitHub || (routeType === 'direct_rail_truck' ? 'Прямое Ж/Д' : 'Владивосток'),
      oceanFreight: { amount: Number(oceanFreight) || 0, currency: oceanCurrency },
      railFreight: { amount: Number(railFreight) || 0, currency: railCurrency },
      truckDelivery: { amount: Number(truckDelivery) || 0, currency: truckCurrency },
      forwarderFee: { amount: Number(forwarderFee) || 0, currency: feeCurrency },
      terminalExpenses: { amount: Number(terminalExpenses) || 0, currency: terminalCurrency },
      transitDaysMin: Number(transitDaysMin) || 20,
      transitDaysMax: Number(transitDaysMax) || 30,
      containerSize,
      weightTons: Number(weightTons) || 0,
      maxWeightTons: Number(maxWeightTons) || 0,
      overweightRateRub: Number(overweightRateRub) || 0,
      vatRate,
      equipment: containerSize === '20GP' ? "20'GP" : "40'HC",
      validUntil: '2026-10-31',
      comments: comments.trim()
    };

    onAdd(newQuote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Добавить ставку экспедитора</h3>
            <p className="text-xs text-slate-500">Ввод котировки по маршрутам Китай → Серпухов / Ставрополь</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Название экспедитора *
              </label>
              <input
                type="text"
                required
                value={forwarderName}
                onChange={e => setForwarderName(e.target.value)}
                placeholder="Например: Swift Logistics / ТИС"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Склад назначения *
              </label>
              <select
                value={destination}
                onChange={e => setDestination(e.target.value as DestinationWarehouse)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="Серпухов">Склад Серпухов (Московская обл.)</option>
                <option value="Ставрополь">Склад Ставрополь (Ставропольский край)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Порт отгрузки (Китай)
              </label>
              <select
                value={originPort}
                onChange={e => setOriginPort(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="Шанхай">Шанхай</option>
                <option value="Нинбо">Нинбо</option>
                <option value="Шанхай / Нинбо">Шанхай / Нинбо</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Тип маршрута
              </label>
              <select
                value={routeType}
                onChange={e => {
                  const val = e.target.value as RouteType;
                  setRouteType(val);
                  if (val === 'direct_rail_truck') {
                    setOceanFreight(0);
                    setRailFreight(5200);
                    setRailCurrency('USD');
                  } else {
                    setOceanFreight(2100);
                    setOceanCurrency('USD');
                    setRailFreight(215000);
                    setRailCurrency('RUB');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="sea_vvo_rail_truck">Море (Шанхай/Нинбо → ВВО) + Ж/Д + Автовывоз</option>
                <option value="direct_rail_truck">Прямое Ж/Д (Шанхай → РФ) + Автовывоз</option>
                <option value="deep_sea_novorossiysk">Deep Sea Море (до Новороссийска) + Автовывоз</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Транзитный узел / промежуточная станция
            </label>
            <input
              type="text"
              value={transitHub}
              onChange={e => setTransitHub(e.target.value)}
              placeholder="Владивосток / Ростов-Товарный / Краснодар / Тимашевск"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Breakdown Cost Inputs */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Статьи затрат (в валюте счета экспедитора)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Ocean freight */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Морской фрахт</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={oceanFreight}
                    onChange={e => setOceanFreight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <CurrencySelect value={oceanCurrency} onChange={setOceanCurrency} />
                </div>
              </div>

              {/* Rail freight */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ж/Д тариф</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={railFreight}
                    onChange={e => setRailFreight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <CurrencySelect value={railCurrency} onChange={setRailCurrency} />
                </div>
              </div>

              {/* Truck delivery */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Автовывоз (последняя миля)</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={truckDelivery}
                    onChange={e => setTruckDelivery(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <CurrencySelect value={truckCurrency} onChange={setTruckCurrency} />
                </div>
              </div>

              {/* Forwarder fee */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Вознаграждение экспедитора</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={forwarderFee}
                    onChange={e => setForwarderFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <CurrencySelect value={feeCurrency} onChange={setFeeCurrency} />
                </div>
              </div>

              {/* Terminal / Customs */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Терминальные расходы / растаможка</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={terminalExpenses}
                    onChange={e => setTerminalExpenses(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <CurrencySelect value={terminalCurrency} onChange={setTerminalCurrency} />
                </div>
              </div>
            </div>
          </div>

          {/* Container & Weight Parameters */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Контейнер, вес и НДС
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Контейнер</label>
                <select
                  value={containerSize}
                  onChange={e => {
                    const size = e.target.value as ContainerSize;
                    setContainerSize(size);
                    if (size === '20GP') {
                      setWeightTons(18);
                      setMaxWeightTons(21);
                    } else {
                      setWeightTons(26);
                      setMaxWeightTons(20);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
                >
                  <option value="20GP">20'GP</option>
                  <option value="40HC">40'HC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Вес груза, т</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={weightTons}
                  onChange={e => setWeightTons(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Включено в ставку, т</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={maxWeightTons}
                  onChange={e => setMaxWeightTons(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Перевес, ₽/т</label>
                <input
                  type="number"
                  min="0"
                  value={overweightRateRub}
                  onChange={e => setOverweightRateRub(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="block text-xs text-slate-600">Ставка НДС (на росс. услуги):</label>
              <select
                value={vatRate}
                onChange={e => setVatRate(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value={0}>Без НДС</option>
                <option value={5}>5%</option>
                <option value={20}>20%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Срок доставки (мин. дней)
              </label>
              <input
                type="number"
                min="5"
                value={transitDaysMin}
                onChange={e => setTransitDaysMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Срок доставки (макс. дней)
              </label>
              <input
                type="number"
                min="5"
                value={transitDaysMax}
                onChange={e => setTransitDaysMax(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Примечание
            </label>
            <input
              type="text"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Условия дропа, демередж, свободные дни..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Добавить в анализ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
