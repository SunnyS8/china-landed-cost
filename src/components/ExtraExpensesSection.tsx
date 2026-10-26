import React, {useState} from 'react';
import {ExtraExpense, ExtraExpenseGroup} from '../types/logistics';
import {
  EXTRA_GROUP_LABELS,
  EXTRA_GROUP_ORDER,
  EXTRA_VAT_RATE,
} from '../data/extraExpenses';
import {calculateExtraExpenses} from '../utils/extraExpenses';
import {formatRUB} from '../utils/calculations';
import {Receipt, Plus, Trash2, Info} from 'lucide-react';

interface Props {
  expenses: ExtraExpense[];
  onChange: (expenses: ExtraExpense[]) => void;
  vatRate?: number;
}

const newId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const ExtraExpensesSection: React.FC<Props> = ({expenses, onChange, vatRate}) => {
  const rate = vatRate ?? EXTRA_VAT_RATE;
  const totals = calculateExtraExpenses(expenses, rate);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newVat, setNewVat] = useState(true);

  const patch = (id: string, changes: Partial<ExtraExpense>) =>
    onChange(expenses.map(e => (e.id === id ? {...e, ...changes} : e)));

  const addCustom = () => {
    const name = newName.trim();
    if (!name) return;
    const amount = parseFloat(newAmount);
    onChange([
      ...expenses,
      {
        id: newId(),
        group: 'custom' as ExtraExpenseGroup,
        name,
        amountRub: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        vat: newVat,
        enabled: true,
        builtin: false,
      },
    ]);
    setNewName('');
    setNewAmount('');
    setNewVat(true);
    setAdding(false);
  };

  const removeCustom = (id: string) => onChange(expenses.filter(e => e.id !== id));

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden focus:border-blue-500 bg-white';

  const grouped = EXTRA_GROUP_ORDER.map(group => ({
    group,
    items: expenses.filter(e => e.group === group),
  })).filter(g => g.items.length > 0);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Дополнительные расходы
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-snug">
            Агентское вознаграждение, покупка валюты и ТЭО. Суммы вводятся так, как они стоят в
            счёте — с НДС. Статьи прибавляются к итогу, но не входят в таможенную базу, поэтому
            пошлину и импортный НДС не увеличивают.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Итого доп. расходы
          </div>
          <div className="text-xl font-black text-slate-900">{formatRUB(totals.totalRub)}</div>
          {totals.vatRub > 0 && (
            <div className="text-[11px] font-semibold text-blue-700">
              в т.ч. НДС {formatRUB(totals.vatRub)}
            </div>
          )}
        </div>
      </div>

      {grouped.map(({group, items}) => (
        <div key={group} className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
            {EXTRA_GROUP_LABELS[group]}
          </div>
          {items.map(expense => {
            const amount = Number.isFinite(expense.amountRub) ? expense.amountRub : 0;
            const vatPart =
              expense.vat && expense.enabled && amount > 0
                ? Math.round((amount * rate) / (100 + rate))
                : 0;
            return (
              <div
                key={expense.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-1.5 ${expense.enabled ? '' : 'opacity-55'}`}
              >
                <label
                  className="inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title={expense.enabled ? 'Выключить статью' : 'Включить статью в расчёт'}
                >
                  <input
                    type="checkbox"
                    checked={expense.enabled}
                    onChange={e => patch(expense.id, {enabled: e.target.checked})}
                    className="w-3.5 h-3.5 rounded accent-emerald-600"
                  />
                  <span
                    className={`text-xs font-semibold min-w-[110px] ${expense.enabled ? 'text-slate-800' : 'text-slate-500 line-through'}`}
                  >
                    {expense.name}
                  </span>
                </label>

                <div className="relative w-32 shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={expense.amountRub === 0 ? '' : expense.amountRub}
                    onChange={e =>
                      patch(expense.id, {
                        amountRub: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={!expense.enabled}
                    aria-label={`${expense.name}: сумма, ₽`}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 pr-6 text-sm text-right font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden focus:border-blue-500 bg-white disabled:bg-slate-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    ₽
                  </span>
                </div>

                <label
                  className="inline-flex items-center gap-1 text-[11px] text-slate-600 shrink-0 cursor-pointer"
                  title={`Выделить НДС (${rate}%) из суммы для отчёта. На итог не влияет.`}
                >
                  <input
                    type="checkbox"
                    checked={expense.vat}
                    onChange={e => patch(expense.id, {vat: e.target.checked})}
                    disabled={!expense.enabled}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  НДС
                </label>

                <span className="text-[11px] text-slate-500 font-mono w-28 shrink-0">
                  {vatPart > 0 ? `в т.ч. НДС ${formatRUB(vatPart)}` : ''}
                </span>

                {!expense.builtin && (
                  <button
                    onClick={() => removeCustom(expense.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                    title="Удалить статью"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Добавить свою статью */}
      {adding ? (
        <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/40">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Название статьи
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              className={inputClass}
              placeholder="Например: Страхование груза"
              autoFocus
            />
          </div>
          <div className="w-32">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Сумма, ₽</label>
            <input
              type="number"
              min="0"
              step="1"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 pb-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={newVat}
              onChange={e => setNewVat(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-600"
            />
            НДС
          </label>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={addCustom}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              Добавить
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-700 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Своя статья
        </button>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          Галочка при статье выделяет из суммы НДС {rate}% для отчёта — на итог не влияет, так как
          сумма уже с НДС. «Приобретение валюты» без НДС. Состав статей и суммы сохраняются в
          браузере и подставляются в следующий расчёт.
        </span>
      </div>
    </div>
  );
};
