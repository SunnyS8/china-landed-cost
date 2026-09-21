import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, FolderOpen, RefreshCw } from 'lucide-react';
import { ForwarderQuote } from '../types/logistics';
import { parseExcelFile } from '../utils/parseExcel';
import { validateAllQuotes, ValidationWarning, saveSnapshot } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (quotes: ForwarderQuote[]) => void;
  onOpenHistory: () => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onImport, onOpenHistory }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ForwarderQuote[]>([]);
  const [warnings, setWarnings] = useState<Map<string, ValidationWarning[]>>(new Map<string, ValidationWarning[]>());
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [folderMode, setFolderMode] = useState(false);
  const [lastParsedNames, setLastParsedNames] = useState<string[]>([]);

  // File System Access API for folder reading
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    setLoading(true);
    setErrors([]);
    const allQuotes: ForwarderQuote[] = [];
    const allErrors: string[] = [];
    const fileNames: string[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const quotes = await parseExcelFile(file);
          allQuotes.push(...quotes);
          fileNames.push(file.name);
        } else if (file.name.endsWith('.json')) {
          const text = await file.text();
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : data.quotes || [];
          arr.forEach((item: ForwarderQuote) => {
            if (item.forwarderName && item.destination) {
              allQuotes.push({ ...item, id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
            }
          });
          fileNames.push(file.name);
        } else {
          allErrors.push(`${file.name}: неподдерживаемый формат`);
        }
      } catch (e: any) {
        allErrors.push(`${file.name}: ${e.message}`);
      }
    }

    // Validate
    const validationMap = validateAllQuotes(allQuotes);
    setWarnings(validationMap);
    setPreview(allQuotes);
    setErrors(allErrors);
    setLastParsedNames(fileNames);
    setLoading(false);
  };

  const handleFolderOpen = async () => {
    try {
      // Try File System Access API
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setFolderMode(true);

      // Read all xlsx files from folder
      setLoading(true);
      setErrors([]);
      const allQuotes: ForwarderQuote[] = [];
      const allErrors: string[] = [];
      const fileNames: string[] = [];

      for await (const [name, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file' && (name.endsWith('.xlsx') || name.endsWith('.xls'))) {
          try {
            const f = fileHandle as FileSystemFileHandle;
            const file = await f.getFile();
            const quotes = await parseExcelFile(file);
            allQuotes.push(...quotes);
            fileNames.push(name);
          } catch (e: any) {
            allErrors.push(`${name}: ${e.message}`);
          }
        }
      }

      const validationMap = validateAllQuotes(allQuotes);
      setWarnings(validationMap);
      setPreview(allQuotes);
      setErrors(allErrors);
      setLastParsedNames(fileNames);
      setLoading(false);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setErrors([`Ошибка чтения папки: ${e.message}`]);
      }
      setLoading(false);
    }
  };

  const handleFolderRefresh = async () => {
    if (!dirHandle) return;
    // Re-read the same folder
    setLoading(true);
    setErrors([]);
    const allQuotes: ForwarderQuote[] = [];
    const allErrors: string[] = [];
    const fileNames: string[] = [];

    try {
      for await (const [name, fileHandle] of dirHandle.entries()) {
        if (fileHandle.kind === 'file' && (name.endsWith('.xlsx') || name.endsWith('.xls'))) {
          try {
            const f = fileHandle as FileSystemFileHandle;
            const file = await f.getFile();
            const quotes = await parseExcelFile(file);
            allQuotes.push(...quotes);
            fileNames.push(name);
          } catch (e: any) {
            allErrors.push(`${name}: ${e.message}`);
          }
        }
      }

      const validationMap = validateAllQuotes(allQuotes);
      setWarnings(validationMap);
      setPreview(allQuotes);
      setErrors(allErrors);
      setLastParsedNames(fileNames);
    } catch (e: any) {
      setErrors([`Ошибка обновления: ${e.message}`]);
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    // Save snapshot
    saveSnapshot(preview, lastParsedNames);
    onImport(preview);
    handleClose();
  };

  const handleClose = () => {
    setPreview([]);
    setWarnings(new Map());
    setErrors([]);
    setFolderMode(false);
    onClose();
  };

  const totalWarnings: ValidationWarning[] = [...warnings.values()].flat();
  const errorCount = totalWarnings.filter(w => w.severity === 'error').length;
  const warnCount = totalWarnings.filter(w => w.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Загрузить ставки перевозчиков</h3>
              <p className="text-xs text-slate-500">Excel (.xlsx) — парсинг и валидация автоматические</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const { downloadExcelTemplate } = await import('../utils/excelTemplate');
                downloadExcelTemplate();
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition"
            >
              Шаблон Excel
            </button>
            <button
              onClick={async () => {
                const { downloadRfqTemplate } = await import('../utils/excelTemplate');
                downloadRfqTemplate();
              }}
              title="Форма запроса цен для перевозчиков"
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 transition"
            >
              Запрос цен
            </button>
            <button
              onClick={onOpenHistory}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition"
            >
              История
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Action buttons: folder or files */}
          <div className="flex gap-3">
            <button
              onClick={handleFolderOpen}
              className="flex-1 border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:bg-blue-50 hover:border-blue-400 transition"
            >
              <FolderOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-blue-700">Открыть папку с файлами</p>
              <p className="text-[11px] text-blue-500 mt-0.5">Все .xlsx из папки парсятся автоматически</p>
            </button>

            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.json"
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Перетащить файлы</p>
              <p className="text-[11px] text-slate-500 mt-0.5">.xlsx или .json</p>
            </div>
          </div>

          {/* Folder refresh button */}
          {folderMode && dirHandle && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-xs text-blue-700">
                Папка подключена — при изменении файлов нажмите обновить
              </span>
              <button
                onClick={handleFolderRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-blue-600">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Парсинг файлов...
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                Ошибки парсинга
              </div>
              <ul className="mt-1 text-xs text-amber-700">
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {/* Validation summary */}
          {preview.length > 0 && totalWarnings.length > 0 && (
            <div className={`p-3 rounded-xl border ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {errorCount > 0 ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                <span className={errorCount > 0 ? 'text-red-800' : 'text-amber-800'}>
                  Валидация: {errorCount > 0 && `${errorCount} ошиб${errorCount === 1 ? 'ка' : 'ки'}`}{errorCount > 0 && warnCount > 0 ? ', ' : ''}{warnCount > 0 && `${warnCount} предупреждени${warnCount === 1 ? 'е' : 'й'}`}
                </span>
              </div>
              <div className="mt-1 text-xs max-h-24 overflow-y-auto">
                {Array.from(warnings.entries()).slice(0, 5).map(([id, ws]) => (
                  <div key={id} className="mb-1">
                    {ws.map((w, i) => (
                      <div key={i} className={`py-0.5 ${w.severity === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                        • [{w.field}] {w.message}
                      </div>
                    ))}
                  </div>
                ))}
                {warnings.size > 5 && <div className="text-slate-500">...и ещё {warnings.size - 5} маршрутов</div>}
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase">
                  Найдено маршрутов: {preview.length}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Set(preview.map(q => q.forwarderName)).size} перевозчиков
                </span>
              </div>
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Перевозчик</th>
                      <th className="px-3 py-2 text-left">Склад</th>
                      <th className="px-3 py-2 text-left">Маршрут</th>
                      <th className="px-3 py-2 text-right">Фрахт $</th>
                      <th className="px-3 py-2 text-right">ЖД ₽</th>
                      <th className="px-3 py-2 text-right">Авто ₽</th>
                      <th className="px-3 py-2 text-right">Дни</th>
                      <th className="px-3 py-2 text-center">⚠</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((q, i) => {
                      const qWarnings = warnings.get(q.id) || [];
                      const hasError = qWarnings.some(w => w.severity === 'error');
                      const hasWarn = qWarnings.some(w => w.severity === 'warning');

                      return (
                        <tr key={i} className={`hover:bg-slate-50 ${hasError ? 'bg-red-50/50' : hasWarn ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-3 py-1.5 font-medium text-slate-900">{q.forwarderName}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              q.destination === 'Серпухов' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                            }`}>{q.destination}</span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-600 max-w-[120px] truncate" title={q.routeDescription}>
                            {q.transitHub || q.routeType}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">{q.oceanFreight.amount || '—'}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{q.railFreight.amount ? q.railFreight.amount.toLocaleString('ru-RU') : '—'}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{q.truckDelivery.amount ? q.truckDelivery.amount.toLocaleString('ru-RU') : '—'}</td>
                          <td className="px-3 py-1.5 text-right">{q.transitDaysMin}–{q.transitDaysMax}</td>
                          <td className="px-3 py-1.5 text-center">
                            {hasError && <span className="text-red-500" title={qWarnings.filter(w => w.severity === 'error').map(w => w.message).join('\n')}>❌</span>}
                            {!hasError && hasWarn && <span className="text-amber-500" title={qWarnings.filter(w => w.severity === 'warning').map(w => w.message).join('\n')}>⚠️</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50">
          <p className="text-[11px] text-slate-400">
            Автосохранение в историю при импорте
          </p>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition">
              Отмена
            </button>
            <button
              onClick={handleImport}
              disabled={preview.length === 0}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Импортировать ({preview.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
