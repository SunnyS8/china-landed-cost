import React, { useMemo } from 'react';
import { ParsedSnapshot } from '../../utils/storage';
import { ForwarderQuote } from '../../types/logistics';
import { calculateQuoteCost, formatUSD } from '../../utils/calculations';
import { DEFAULT_RATES } from '../../utils/cbrRate';

const PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#4d7c0f', '#9333ea', '#c2410c'];

interface Props {
  history: ParsedSnapshot[];
  currentQuotes: ForwarderQuote[];
}

interface Series {
  key: string;
  label: string;
  color: string;
  points: { date: string; value: number }[];
}

export const PriceChart: React.FC<Props> = ({ history, currentQuotes }) => {
  const data = useMemo(() => {
    const snapshots = [...history].sort((a, b) => a.timestamp - b.timestamp).slice(-16);
    if (snapshots.length === 0 && currentQuotes.length === 0) return [];

    const seriesMap = new Map<string, Series>();

    const pushPoint = (key: string, label: string, color: string, date: string, value: number) => {
      let s = seriesMap.get(key);
      if (!s) {
        s = { key, label, color, points: [] };
        seriesMap.set(key, s);
      }
      s.points.push({ date, value });
    };

    const quoteLabel = (q: ForwarderQuote) =>
      `${q.forwarderName?.trim() || 'Перевозчик'} (${q.destination || '—'})`;

    snapshots.forEach(snap => {
      snap.quotes.forEach(q => {
        const total = calculateQuoteCost(q, DEFAULT_RATES).totalWithVatUsd;
        if (!Number.isFinite(total)) return;
        pushPoint(`${q.forwarderName}|${q.destination}`, quoteLabel(q), PALETTE[seriesMap.size % PALETTE.length], shortDate(snap.date), total);
      });
    });

    // Текущие ставки показываем всегда (точка «сейчас»), даже без истории
    currentQuotes.forEach(q => {
      const total = calculateQuoteCost(q, DEFAULT_RATES).totalWithVatUsd;
      if (!Number.isFinite(total)) return;
      pushPoint(`${q.forwarderName}|${q.destination}`, quoteLabel(q), PALETTE[seriesMap.size % PALETTE.length], 'сейчас', total);
    });

    const series = [...seriesMap.values()]
      .filter(s => s.points.length >= 1)
      .sort((a, b) => {
        const la = a.points[a.points.length - 1]?.value ?? 0;
        const lb = b.points[b.points.length - 1]?.value ?? 0;
        return la - lb;
      });

    // Limit to top 8 series by latest value
    return series.slice(0, 8);
  }, [history, currentQuotes]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Нет данных для графика. Импортируйте ставки — каждое сохранение добавляет точку на графике.
      </div>
    );
  }

  const allDates: string[] = Array.from(new Set(data.flatMap(s => s.points.map(p => p.date))));
  const allValues = data.flatMap(s => s.points.map(p => p.value));
  const maxVal = Math.max(...allValues, 1000);
  const minVal = Math.min(...allValues, maxVal);
  const pad = (maxVal - minVal) * 0.12 || 100;
  const yMax = maxVal + pad;
  const yMin = Math.max(0, minVal - pad);

  const W = 760;
  const H = 300;
  const padX = 46;
  const padTop = 20;
  const padBottom = 34;

  const x = (date: string) => {
    const idx = allDates.indexOf(date);
    if (allDates.length === 1) return padX + W / 2;
    return padX + (idx / (allDates.length - 1)) * (W - 2 * padX);
  };
  const y = (v: number) => padTop + ((yMax - v) / (yMax - yMin)) * (H - padTop - padBottom);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="График изменения цен по перевозчикам">
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const v = yMin + (yMax - yMin) * t;
          return (
            <g key={t}>
              <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padX - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                {Math.round(v).toLocaleString('en-US')}
              </text>
            </g>
          );
        })}

        {allDates.map(date => (
          <text key={date} x={x(date)} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">
            {date}
          </text>
        ))}

        {data.map(series => {
          const path = series.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date)},${y(p.value)}`).join(' ');
          return (
            <React.Fragment key={series.key}>
              <path d={path} fill="none" stroke={series.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {series.points.map((p, i) => (
                <circle key={i} cx={x(p.date)} cy={y(p.value)} r="4" fill="#fff" stroke={series.color} strokeWidth="2">
                  <title>{`${series.label} — ${p.date}: ${formatUSD(p.value)}`}</title>
                </circle>
              ))}
            </React.Fragment>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map(s => {
          const last = s.points[s.points.length - 1];
          const first = s.points[0];
          const delta = last && first ? last.value - first.value : 0;
          return (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              {s.label}
              {last && (
                <span className={`font-mono font-bold ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {formatUSD(last.value)}
                  {Math.abs(delta) >= 1 && ` (${delta > 0 ? '+' : ''}${delta >= 0 ? Math.round(delta) : Math.round(delta)} $)`}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

function shortDate(ruDate: string): string {
  return ruDate.slice(0, 5);
}