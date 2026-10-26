import {ExtraExpense, ExtraExpenseGroup} from '../types/logistics';

/** НДС российских услуг по умолчанию — стандартная ставка РФ */
export const EXTRA_VAT_RATE = 20;

/** Название групп для заголовков блока */
export const EXTRA_GROUP_LABELS: Record<ExtraExpenseGroup, string> = {
  fee: 'Комиссии и покупка валюты',
  teo: 'ТЭО — транспортно-экспедиционное обслуживание',
  custom: 'Свои статьи',
};

/** Порядок групп при выводе */
export const EXTRA_GROUP_ORDER: ExtraExpenseGroup[] = ['fee', 'teo', 'custom'];

function builtin(
  id: string,
  group: ExtraExpenseGroup,
  name: string,
  vat: boolean,
): ExtraExpense {
  return {id, group, name, amountRub: 0, vat, enabled: false, builtin: true};
}

/**
 * Пресет статей (Вариант 2): позиции заведены заранее, суммы заполняются один раз
 * и запоминаются в браузере для следующих рейсов. Каждую позицию можно выключить —
 * не в каждом рейсе бывает досмотр или сверхнорма.
 */
export const EXTRA_EXPENSE_PRESET: ExtraExpense[] = [
  // Комиссии
  builtin('agency-fee', 'fee', 'Агентское вознаграждение', true),
  builtin('currency-buy', 'fee', 'Приобретение валюты', false),

  // ТЭО
  builtin('teo-cont-use', 'teo', 'Сбор за контейнерное оборудование', true),
  builtin('teo-release-order', 'teo', 'Релиз-ордер', true),
  builtin('teo-storage-6-10', 'teo', 'Хранение 6–10 суток', true),
  builtin('teo-over-norm', 'teo', 'Сверхнормативное использование контейнера', true),
  builtin('teo-inspection-move', 'teo', 'Организация перемещения в рамках досмотра', true),
  builtin('teo-inspection', 'teo', 'Досмотр', true),
  builtin('teo-rail-receive', 'teo', 'ЖД-приём', true),
  builtin('teo-storage', 'teo', 'Хранение', true),
  builtin('teo-monitoring', 'teo', 'Мониторинг', true),
  builtin('teo-handling', 'teo', 'Обработка', true),
];
