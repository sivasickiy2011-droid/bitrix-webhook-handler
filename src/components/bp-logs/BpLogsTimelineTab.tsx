import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { TimelineLog } from './bpLogsUtils';
import { useState } from 'react';

interface BpLogsTimelineTabProps {
  timelineLogs: TimelineLog[];
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
  onRefresh: () => void;
  onAutoRefreshChange: (value: boolean) => void;
}

const BPLogCard = ({ log }: { log: TimelineLog }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHistory = log.STATS?.has_history ?? false;
  const totalRuns = log.STATS?.total_runs ?? 0;
  const instances = log.STATS?.instances ?? [];
  const dbDuplicates = log.STATS?.db_duplicates_found ?? 0;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div 
        className={`p-6 ${hasHistory ? 'cursor-pointer' : ''}`}
        onClick={() => hasHistory && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {log.SETTINGS?.TITLE || 'Без заголовка'}
              </h3>
              {!hasHistory && (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                  Не запускался
                </span>
              )}
              {hasHistory && totalRuns > 0 && (
                <>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                    {totalRuns} {totalRuns === 1 ? 'запуск' : totalRuns < 5 ? 'запуска' : 'запусков'}
                  </span>
                  {dbDuplicates > 0 && (
                    <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs rounded-full font-medium">
                      {dbDuplicates} {dbDuplicates === 1 ? 'дубль' : dbDuplicates < 5 ? 'дубля' : 'дублей'}
                    </span>
                  )}
                  <Icon 
                    name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
                    size={20} 
                    className="text-slate-400"
                  />
                </>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              ID: {log.ID} • Автор: {log.AUTHOR_ID}
            </p>
            {!hasHistory && (
              <p className="text-xs text-slate-400 mt-2">
                Статистика появится после первого запуска
              </p>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {log.CREATED && new Date(log.CREATED).toLocaleString('ru-RU')}
          </div>
        </div>

        {!isExpanded && log.SETTINGS?.COMMENT && (
          <div className="text-sm text-slate-600 italic border-l-4 border-blue-500 pl-4">
            {log.SETTINGS.COMMENT}
          </div>
        )}
      </div>

      {isExpanded && hasHistory && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="pt-4">
            {instances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">ID запуска</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Дата и время</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Запустил (ID)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((instance, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{instance.id}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {new Date(instance.started).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{instance.started_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">
                  Данные о запусках сохранены в базе данных ({totalRuns} {totalRuns === 1 ? 'запуск' : totalRuns < 5 ? 'запуска' : 'запусков'})
                </p>
                {dbDuplicates > 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    Найдено дублей компаний: {dbDuplicates}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BpLogsTimelineTab = ({
  timelineLogs,
  loading,
  error,
  autoRefresh,
  onRefresh,
  onAutoRefreshChange,
}: BpLogsTimelineTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
          >
            <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Автообновление (10с)
          </label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <Icon name="AlertCircle" size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && timelineLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Загрузка логов...</p>
        </div>
      ) : timelineLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Icon name="FileText" size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Логи Timeline не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {timelineLogs.map((log) => <BPLogCard key={log.ID} log={log} />)}
        </div>
      )}
    </div>
  );
};

export default BpLogsTimelineTab;