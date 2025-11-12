import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { TimelineLog } from './bpLogsUtils';

interface BpLogsTimelineTabProps {
  timelineLogs: TimelineLog[];
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
  onRefresh: () => void;
  onAutoRefreshChange: (value: boolean) => void;
}

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
          {timelineLogs.map((log) => (
            <div key={log.ID} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {log.SETTINGS?.TITLE || 'Без заголовка'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    ID: {log.ID} • Автор: {log.AUTHOR_ID}
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(log.CREATED).toLocaleString('ru-RU')}
                </div>
              </div>

              {log.SETTINGS?.MESSAGE && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {log.SETTINGS.MESSAGE}
                  </p>
                </div>
              )}

              {log.SETTINGS?.COMMENT && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-slate-600 italic">
                    {log.SETTINGS.COMMENT}
                  </p>
                </div>
              )}

              {(log.ASSOCIATED_ENTITY_TYPE_ID || log.ASSOCIATED_ENTITY_ID) && (
                <div className="flex gap-4 mt-4 text-xs text-slate-500">
                  {log.ASSOCIATED_ENTITY_TYPE_ID && (
                    <span>Тип: {log.ASSOCIATED_ENTITY_TYPE_ID}</span>
                  )}
                  {log.ASSOCIATED_ENTITY_ID && (
                    <span>Entity ID: {log.ASSOCIATED_ENTITY_ID}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BpLogsTimelineTab;
