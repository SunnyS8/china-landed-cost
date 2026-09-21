import React, { useMemo } from 'react';
import { ForwarderQuote, ExchangeRates } from '../../types/logistics';
import { calculateQuoteCost, formatUSD } from '../../utils/calculations';
import { DEFAULT_RATES } from '../../utils/cbrRate';

interface Props {
  quotes: ForwarderQuote[];
  rates: ExchangeRates;
}

const ROUTE_META: Record<string, { label: string; color: string }> = {
  sea: { label: 'Море + Ж/Д', color: '#2563eb' },
  direct: { label: 'Прямое ЖД', color: '#059669' },
  deepsea: { label: 'Deep Sea (Новороссийск)', color: '#d97706' },
};

interface Grouped {
  destination: string;
  groups: { key: string; label: string; color: string; avgUsd: number; avgDays: number; count: number }[];
}

export const RouteComparison: React.FC<Props> = ({ quotes, rates }) => {
  const data = useMemo(() => {
    const buckets = new Map<string, Map<string, { total: number; days: number; count: number }>>();

    quotes.forEach(q => {
      if (!buckets.has(q.destination)) buckets.set(q.destination, new Map());
      const byRoute = buckets.get(q.destination)!;
      const route = q.routeType;
      if (!byRoute.has(route)) byRoute.set(route, { total: 0, days: 0, count: 0 });
      const acc = byRoute.get(route)!;
      acc.total += calculateQuoteCost(q, rates).totalWithVatUsd;
      acc.days += q.transitDaysMin || (q.daysLow + q.daysHigh) / 2;
      acc.count += 1;
    });

    const grouped: Grouped[] = [...buckets.entries()].map(([destination, byRoute]) => ({
      destination,
      groups: [...byRoute.entries()]
        .map(([key, acc]) => ({
          key,
          ...(ROUTE_META[key] ?? { label: key, color: '#64748b' }),
          avgUsd: Math.round(acc.total / acc.count),
          avgDays: Math.round(acc.days / acc.count),
          count: acc.count,
        }))
        .sort((a, b) => a.avgUsd - b.avgUsd),
    }));

    return grouped;
  }, [quotes, rates]);

  // Saving per destination: cheapest route vs average of the rest
  const savings = useMemo(() => {
    return data.map(g => {
      if (g.groups.length === 0) return null;
      const cheapest = g.groups[0];
      const others = g.groups.slice(1);
      if (others.length === 0) return null;
      const avgOthers = others.reduce((s, x) => s + x.avgUsd, 0) / others.length;
      const saving = avgOthers - cheapest.avgUsd;
      const pct = avgOthers > 0 ? (saving / avgOthers) * 100 : 0;
      return { destination: g.destination, cheapest, saving, pct };
    }).filter(Boolean) as { destination: string; cheapest: Grouped['groups'][number]; saving: number; pct: number }[];
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        Нет маршрутов для сравнения. Сначала заполните ставки перевозчиков.
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap(g => g.groups.map(x => x.avgUsd)), 1);
  const W = 760;
  const H = 46; // per group height

  return (
    <div className="space-y-6">
      {data.map(group => (
        <div key={group.destination}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700">Склад: {group.destination}</h4>
            <div className="flex flex-wrap gap-3">
              {Object.values(ROUTE_META).map(m => (
                <span key={m.label} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
            {group.groups.map(gr => (
              <div key={gr.key} className="flex items-center gap-3">
                <span className="w-40 text-[11px] text-slate-600 truncate" title={gr.label}>{gr.label}</span>
                <div className="flex-1 relative h-6 bg-slate-50 rounded">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${Math.max((gr.avgUsd / maxVal) * 100, 2)}%`, backgroundColor: gr.color, opacity: 0.85 }}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white drop-shadow">
                    {formatUSD(gr.avgUsd)}
                  </span>
                </div>
                <span className="w-24 text-right text-[11px] text-slate-500">
                  ~{gr.avgDays} дн · {gr.count} кв.
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {savings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Возможная экономия</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savings.map(s => (
              <div key={s.destination} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[11px] text-emerald-700 font-medium">Склад: {s.destination}</div>
                <div className="text-[12px] text-slate-600 mt-0.5">
                  Дешевле всех: <b>{s.cheapest.label}</b> ({formatUSD(s.cheapest.avgUsd)})
                </div>
                <div className="text-lg font-bold text-emerald-700">
                  {formatUSD(s.saving)}
                  <span className="text-sm font-semibold text-emerald-500"> ({s.pct.toFixed(0)}% )</span>
                </div>
                <div className="text-[11px] text-slate-500">относительно средней стоимости остальных маршрутов</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ROUTE_META_FOR_REFERENCE = ROUTE_META;