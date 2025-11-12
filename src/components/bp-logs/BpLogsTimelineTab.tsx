import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { TimelineLog } from './bpLogsUtils';
import { useState } from 'react';

const formatLocalDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

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
    <div>
      <Card 
        className={`border-l-4 cursor-pointer transition-all ${
          isExpanded ? 'ring-2 ring-primary' : ''
        }`}
        style={{
          borderLeftColor: 
            hasHistory ? '#3b82f6' : '#94a3b8'
        }}
        onClick={() => hasHistory && setIsExpanded(!isExpanded)}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">
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
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Icon name="Hash" size={14} />
                  <span>ID: {log.ID}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Calendar" size={14} />
                  <span>{log.CREATED && formatLocalDateTime(log.CREATED)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="User" size={14} />
                  <span>Автор: {log.AUTHOR_ID}</span>
                </div>
              </div>
              
              {hasHistory && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Icon 
                    name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                    size={16} 
                  />
                  <span>{isExpanded ? 'Свернуть детали' : 'Развернуть детали'}</span>
                </div>
              )}

              {!hasHistory && (
                <p className="text-xs text-slate-400 italic">
                  Статистика появится после первого запуска
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isExpanded && hasHistory && (
        <div className="mt-3 ml-4 animate-in slide-in-from-top-2">
          <Card>
            <CardContent className="pt-6">
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
                            {formatLocalDateTime(instance.started)}
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
            </CardContent>
          </Card>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Шаблоны бизнес-процессов</CardTitle>
            <CardDescription>
              Найдено шаблонов: {timelineLogs.length}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => onAutoRefreshChange(e.target.checked)}
                className="rounded border-slate-300"
              />
              Автообновление (10с)
            </label>
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Icon name="AlertCircle" size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {timelineLogs.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Icon name="FileText" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Шаблоны не найдены</p>
          </div>
        )}

        <div className="space-y-3">
          {timelineLogs.map((log) => <BPLogCard key={log.ID} log={log} />)}
        </div>
      </CardContent>
    </Card>
  );
};

export default BpLogsTimelineTab;