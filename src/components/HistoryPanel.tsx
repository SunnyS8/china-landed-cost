import React, { useState } from 'react';
import { Clock, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { ParsedSnapshot, compareSnapshots, deleteSnapshot, getHistory } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (quotes: any[]) => void;
}

export const HistoryPanel: React.FC<Props> = ({ isOpen, onClose, onRestore }) => {
  const [history, setHistory] = useState<ParsedSnapshot[]>(() => getHistory());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareWith, setCompareWith] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    setHistory(getHistory());
  };

  const handleRestore = (snap: ParsedSnapshot) => {
    if (window.confirm(`Восстановить ${snap.quotes.length} маршрутов из ${snap.date}?`)) {
      onRestore(snap.quotes);
      onClose();
    }
  };

  const handleCompare = (snapId: string) => {
    if (compareWith && compareWith !== snapId) {
      const oldSnap = history.find(s => s.id === compareWith);
      const newSnap = history.find(s => s.id === snapId);
      if (oldSnap && newSnap) {
        return compareSnapshots(oldSnap, newSnap);
      }
    }
    return [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">История парсинга</h3>
              <p className="text-xs text-slate-500">Предыдущие версии ставок — восстановление и сравнение</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 overflow-y-auto max-h-[65vh]">
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Пока нет сохранённых снимков</p>
              <p className="text-xs mt-1">Импортируйте Excel-файл — автоматически сохранится</p>
            </div>
          ) : (
            history.map(snap => {
              const isExpanded = expandedId === snap.id;
              const isCompareMode = compareWith === snap.id;
              const changes = compareWith && compareWith !== snap.id ? handleCompare(snap.id) : [];

              return (
                <div key={snap.id} className={`border rounded-xl transition ${isCompareMode ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  {/* Snapshot header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-slate-900">{snap.date}</div>
                      <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {snap.quotes.length} маршрутов
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {snap.source}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-slate-100 pt-3 space-y-2">
                      {/* Route list */}
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {snap.quotes.map((q, i) => (
                          <div key={i} className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded">
                            <span className="font-medium">{q.forwarderName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              q.destination === 'Серпухов' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                            }`}>{q.destination}</span>
                          </div>
                        ))}
                      </div>

                      {/* Changes from comparison */}
                      {changes.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="text-[10px] font-bold text-amber-800 uppercase mb-1">Изменения цен:</div>
                          {changes.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-0.5">
                              <span>{c.carrier} ({c.destination})</span>
                              <span className={`font-mono font-bold ${c.changeUsd > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {c.changeUsd > 0 ? '+' : ''}{c.changeUsd.toLocaleString('en-US')}$
                                <span className="text-[10px] ml-1">({c.changePercent > 0 ? '+' : ''}{c.changePercent}%)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCompareWith(isCompareMode ? null : snap.id); }}
                          className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition ${
                            isCompareMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isCompareMode ? 'Выбран для сравнения' : 'Сравнить с...'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(snap); }}
                          className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200 transition"
                        >
                          Восстановить
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(snap.id); }}
                          className="text-[11px] px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 transition ml-auto"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
