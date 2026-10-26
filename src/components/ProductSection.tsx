import React, { useMemo, useState } from 'react';
import { ProductQuote } from '../types/logistics';
import { DollarSign, Package, Weight, Container, Info, FileText, AlertTriangle, BookmarkPlus, Check, Trash2 } from 'lucide-react';
import { findHsCode, formatHsCode, normalizeHsCode, removeCustomHsCode, saveCustomHsCode, validateHsCode, isCustomHsCode } from '../utils/hsCode';

interface Props {
  product: ProductQuote;
  onChange: (product: ProductQuote) => void;
}

const DEFAULT_PRODUCT: ProductQuote = {
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

export const ProductSection: React.FC<Props> = ({ product, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hsTouched, setHsTouched] = useState(false);
  const [hsVersion, setHsVersion] = useState(0);

  const invalidContainerM2 = !Number.isFinite(product.containerM2) || product.containerM2 <= 0;
  const invalidContainerWeight = !Number.isFinite(product.containerWeightKg) || product.containerWeightKg <= 0;

  const update = (patch: Partial<ProductQuote>) => {
    onChange({ ...product, ...patch });
  };

  const hsCode = normalizeHsCode(product.hsCode);
  const hsError = validateHsCode(hsCode);
  const hsEntry = useMemo(() => findHsCode(hsCode), [hsCode, hsVersion]);
  const hsCustom = useMemo(() => isCustomHsCode(hsCode), [hsCode, hsVersion]);
  const canApplyDuty = hsEntry?.dutyRate != null && hsEntry.dutyRate !== product.customsRate;
  const canRemember = hsEntry?.dutyRate == null && !hsError;

  const handleHsChange = (raw: string) => {
    update({ hsCode: normalizeHsCode(raw) });
  };

  const applyDuty = () => {
    if (hsEntry?.dutyRate == null) return;
    update({ customsRate: hsEntry.dutyRate, ...(hsEntry.vatRate != null ? { vatRate: hsEntry.vatRate } : {}) });
  };

  const rememberCode = () => {
    if (hsError) return;
    const entry = hsEntry;
    saveCustomHsCode({
      code: hsCode,
      title: entry?.title ?? `Код ${formatHsCode(hsCode)}`,
      dutyRate: product.customsRate,
      vatRate: product.vatRate,
      warning: entry?.dutyRate == null ? undefined : entry?.warning,
    });
    setHsVersion(v => v + 1);
  };

  const forgetCode = () => {
    removeCustomHsCode(hsCode);
    setHsVersion(v => v + 1);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden focus:border-blue-500 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">1. Товар и параметры</h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Китай → РФ
          </span>
        </div>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          {showAdvanced ? 'Скрыть доп. параметры' : 'Доп. параметры: объём, пошлина, НДС'}
        </button>
      </div>

      {/* Supplier & HS Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Поставщик</label>
          <input
            type="text"
            value={product.supplier}
            onChange={e => update({ supplier: e.target.value })}
            className={inputClass}
            placeholder="Название поставщика"
          />
        </div>
        <div>
          <label className={labelClass}>HS Code (ТН ВЭД)</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={hsCode}
            onChange={e => handleHsChange(e.target.value)}
            onBlur={() => setHsTouched(true)}
            aria-invalid={hsTouched && hsError !== null}
            aria-describedby="hs-code-hint"
            className={`${inputClass} font-mono tracking-wide ${hsTouched && hsError ? 'border-red-500' : ''}`}
            placeholder="8708299000"
          />
          <div id="hs-code-hint" className="mt-1 space-y-1">
            {hsTouched && hsError && (
              <p className="text-xs text-red-600" role="alert">{hsError}</p>
            )}
            {hsCode.length === 10 && (
              <p className="text-[11px] text-slate-500 font-mono">{formatHsCode(hsCode)}</p>
            )}
            {hsEntry && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 text-[11px] leading-snug">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-800">{hsEntry.title}</span>
                  {hsEntry.dutyRate != null ? (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                      пошлина {hsEntry.dutyRate}%{hsEntry.vatRate != null ? ` · НДС ${hsEntry.vatRate}%` : ''}
                    </span>
                  ) : (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      ставка не задана
                    </span>
                  )}
                </div>
                {hsEntry.warning && (
                  <p className="mt-1 flex items-start gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{hsEntry.warning}</span>
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {canApplyDuty && (
                    <button
                      onClick={applyDuty}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                    >
                      <Check className="w-3 h-3" />
                      Применить {hsEntry.dutyRate}%
                    </button>
                  )}
                  {hsEntry.source && <span className="text-slate-500">{hsEntry.source}</span>}
                  {hsCustom && (
                    <button
                      onClick={forgetCode}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 font-semibold"
                      title="Удалить код из пользовательского справочника"
                    >
                      <Trash2 className="w-3 h-3" />
                      убрать
                    </button>
                  )}
                </div>
              </div>
            )}
            {canRemember && (
              <button
                onClick={rememberCode}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                title="Сохранить код и текущую ставку пошлины в справочник браузера"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Запомнить код со ставкой {product.customsRate}%
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <DollarSign className="inline w-3 h-3 mr-1" />
            Цена за 1 м² (юань)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={product.pricePerM2CNY}
            onChange={e => update({ pricePerM2CNY: parseFloat(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>
      </div>

      {showAdvanced && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Дополнительно
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Package className="inline w-3 h-3 mr-1" />
                Цена за 1 короб (юань)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.pricePerBoxCNY}
                onChange={e => update({ pricePerBoxCNY: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Container className="inline w-3 h-3 mr-1" />
                Площадь контейнера (м²)
              </label>
              <input
                type="number"
                min="0.01"
                step="10"
                value={product.containerM2}
                onChange={e => update({ containerM2: parseFloat(e.target.value) || 0 })}
                aria-invalid={invalidContainerM2}
                className={`${inputClass} ${invalidContainerM2 ? 'border-red-500' : ''}`}
              />
              {invalidContainerM2 && <p className="mt-1 text-xs text-red-600" role="alert">Укажите площадь больше нуля.</p>}
            </div>
            <div>
              <label className={labelClass}>
                <Weight className="inline w-3 h-3 mr-1" />
                Вес 1 пог.м (кг)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.weightPerM}
                onChange={e => update({ weightPerM: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Weight className="inline w-3 h-3 mr-1" />
                Вес контейнера (кг)
              </label>
              <input
                type="number"
                min="0.01"
                step="100"
                value={product.containerWeightKg}
                onChange={e => update({ containerWeightKg: parseFloat(e.target.value) || 0 })}
                aria-invalid={invalidContainerWeight}
                className={`${inputClass} ${invalidContainerWeight ? 'border-red-500' : ''}`}
              />
              {invalidContainerWeight && <p className="mt-1 text-xs text-red-600" role="alert">Укажите вес больше нуля.</p>}
            </div>
            <div>
              <label className={labelClass}>
                <FileText className="inline w-3 h-3 mr-1" />
                Ставка пошлины (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={product.customsRate}
                onChange={e => update({ customsRate: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <FileText className="inline w-3 h-3 mr-1" />
                Ставка импортного НДС (%)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={product.vatRate}
                onChange={e => update({ vatRate: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
          {product.note !== undefined && (
            <div>
              <label className={labelClass}>Примечание</label>
              <input
                type="text"
                value={product.note}
                onChange={e => update({ note: e.target.value })}
                className={inputClass}
                placeholder="Заметка..."
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          Импортный НДС считается по ставке товара, НДС на российские услуги — по ставке выбранного перевозчика.
          Курс ЦБ подтягивается на дату расчёта. Ставку пошлины можно взять из справочника по HS-коду — итоговый код и ставку подтверждает брокер.
        </span>
      </div>
    </div>
  );
};
