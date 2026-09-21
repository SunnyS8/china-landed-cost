import React, { useState } from 'react';
import { 
  Ship, 
  Train, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  MapPin, 
  CheckCircle2, 
  Layers,
  Zap
} from 'lucide-react';

export const RouteMap: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'serpukhov' | 'stavropol'>('serpukhov');

  return (
    <div className="space-y-6">
      {/* Route Selector Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('serpukhov')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'serpukhov'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          Склад Серпухов (Моск. обл.)
        </button>
        <button
          onClick={() => setActiveTab('stavropol')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'stavropol'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-purple-600" />
          Склад Ставрополь (СКФО)
        </button>
      </div>

      {/* Content for Serpukhov */}
      {activeTab === 'serpukhov' && (
        <div className="space-y-6">
          {/* Variant 1: Multimodal via Vladivostok */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <Layers className="w-3.5 h-3.5" /> Вариант 1 (Основной)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Мультимодал: Море через Владивосток + Ж/Д Москва + Автовывоз Серпухов
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> 27–35 дней
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg font-bold">
                  Экономичный тариф
                </span>
              </div>
            </div>

            {/* Stepper Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                  <Ship className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Этап 1: Море</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Шанхай / Нинбо</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Погрузка на морское судно (линии FESCO, Sinokor, Reel, Sitc). Переход 5–7 дней.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-blue-600">
                  Фрахт: ~$1,980 – $2,150
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Этап 2: Таможня</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Порт Владивосток</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Выгрузка в ВМТП / порт Восточный. Растаможка, закрытие ВТТ / выпуск ДТ, подача на ж/д.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-indigo-600">
                  Срок на терминале: 4–8 дней
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3">
                  <Train className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Этап 3: Ж/Д</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Ускоренный КП → Москва</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Контейнерный поезд Транссиб до терминалов ТЛЦ Ворсино, Белый Раст, Силикатная.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-emerald-600">
                  Ж/Д тариф: ~205k – 225k ₽
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-3">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Этап 4: Авто</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Склад г. Серпухов</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Автовывоз контейнеровозом до ворот склада в Серпухове (~90 км от Москвы/Ворсино) + возврат тары.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-amber-600">
                  Автовывоз: ~26k – 29k ₽
                </div>
              </div>
            </div>
          </div>

          {/* Variant 2: Direct Rail */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  <Zap className="w-3.5 h-3.5" /> Вариант 2 (Ускоренный)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Прямое Ж/Д: Шанхай → Москва → Автовывоз Серпухов
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> 18–24 дня
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold">
                  Самый быстрый
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                  <Train className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Отправка в Китае</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Шанхай Ж/Д Станция</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Формирование прямого контейнерного поезда через сухопутные погранпереходы Забайкальск / Маньчжурия или Достык / Алашанькоу.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Прибытие в РФ</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">ТЛЦ Москва (Ворсино/Белый Раст)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Прямой ж/д тариф: ~$5,150 – $5,350. Без перевалки в морских портах и ожидания слотов судов.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-3">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Последняя миля</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Склад Серпухов</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Оперативная автодоставка контейнеровозом до склада за 1 день.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content for Stavropol */}
      {activeTab === 'stavropol' && (
        <div className="space-y-6">
          {/* Variant 1: Sea VVO + Rail Rostov + Truck Stavropol */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  <Layers className="w-3.5 h-3.5" /> Вариант 1 (Южный Мультимодал)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Море Владивосток → Ж/Д Ростов-на-Дону → Автовывоз Ставрополь
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" /> 30–38 дней
                </span>
                <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-lg font-bold">
                  Проверенный маршрут
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                  <Ship className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">1. Море</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Шанхай / Нинбо</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Морской переход до Владивостока / Находки. Фрахт: ~$2,090 – $2,150.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">2. Оформление</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Владивосток (ВМТП)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Таможенная очистка или оформление внутреннего таможенного транзита (ВТТ) до Ростова.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-3">
                  <Train className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">3. Ж/Д Станция</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">ст. Ростов-Товарный / Батайск</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Прямой контейнерный поезд до южного ж/д узла Ростов. Ж/Д плечо: ~252k – 265k ₽.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-3">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">4. Автовывоз</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Склад г. Ставрополь</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Плечо Ростов → Ставрополь (~340 км). Автовывоз: ~50k – 56k ₽.
                </p>
              </div>
            </div>
          </div>

          {/* Variant 2: Direct Rail to Krasnodar / Timashevsk */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> Вариант 2 (Прямое Ж/Д на Юг)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Прямое Ж/Д: Шанхай → Краснодар / Тимашевск → Автовывоз Ставрополь
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> 20–26 дней
                </span>
                <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-bold">
                  Высокая скорость
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                  <Train className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Станция отправления</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Шанхай (КНР)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Погрузка на регулярный южный контейнерный состав РЖД Логистика / Модум-Транс.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-3">
                  <Train className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Станция выгрузки</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">ст. Краснодар-Сорт. / Тимашевская</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Упомянуты в аудио: города Краснодар либо Тимашевск. Ж/Д тариф: ~$5,590 – $5,700.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-3">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Плечо автодоставки</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">Склад г. Ставрополь</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Краснодар → Ставрополь ~300 км (автовывоз 48,000 ₽) или Тимашевск → Ставрополь ~340 км (54,000 ₽).
                </p>
              </div>
            </div>
          </div>

          {/* Variant 3: Deep Sea via Novorossiysk */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  <Ship className="w-3.5 h-3.5" /> Вариант 3 (Deep Sea через Новороссийск)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Морской фрахт через Суэцкий канал → порт Новороссийск → Автовывоз Ставрополь
                </h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold">
                Срок: 42–50 дней
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              В аудиосообщении спикер отмечает: <em>«есть экспедиторы, которые возят через море — это фрахт»</em>. Данный вариант исключает ж/д плечо по РФ, груз доставляется судами в порт Черного моря Новороссийск (НУТЭП), после чего контейнеровозом доставляется в Ставрополь (~460 км).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
