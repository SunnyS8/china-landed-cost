import React, { useState } from 'react';
import { ProductQuote } from '../types/logistics';
import { DollarSign, Package, Weight, Container, Info } from 'lucide-react';

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

  const update = (patch: Partial<ProductQuote>) => {
    onChange({ ...product, ...patch });
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden focus:border-blue-500 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Закупка товара</h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Китай → РФ
          </span>
        </div>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          {showAdvanced ? 'Скрыть доп. параметры' : 'Показать доп. параметры'}
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
          <label className={labelClass}>HS Code</label>
          <input
            type="text"
            value={product.hsCode}
            onChange={e => update({ hsCode: e.target.value })}
            className={inputClass}
            placeholder="8708299000"
          />
        </div>
      </div>

      {/* Prices */}
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
      </div>

      {/* Container params */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>
            <Container className="inline w-3 h-3 mr-1" />
            Площадь контейнера (м²)
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={product.containerM2}
            onChange={e => update({ containerM2: parseFloat(e.target.value) || 0 })}
            className={inputClass}
          />
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
            min="0"
            step="100"
            value={product.containerWeightKg}
            onChange={e => update({ containerWeightKg: parseFloat(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            Ставка НДС (%)
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

      {showAdvanced && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Дополнительно
          </h4>
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
          Данные из калькулятора акустики: JinPeng/Xincongbang, HS 8708299000, пошлина 12%, НДС 22%.
          Курс ЦБ используется для пересчёта юаней в рубли.
        </span>
      </div>
    </div>
  );
};
