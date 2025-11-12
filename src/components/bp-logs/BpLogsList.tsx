import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { BpLog, BpDetail } from './types';
import { getStatusBadge, formatDate } from './utils.tsx';
import BpDetailContent from './BpDetailContent';

interface BpLogsListProps {
  logs: BpLog[];
  loading: boolean;
  selectedBp: string | null;
  bpDetail: BpDetail | null;
  detailLoading: boolean;
  onViewDetails: (bpId: string) => void;
}

const BpLogsList = ({ 
  logs, 
  loading, 
  selectedBp, 
  bpDetail, 
  detailLoading,
  onViewDetails 
}: BpLogsListProps) => {
  return (
    <div className="space-y-4">
      {loading && logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Загрузка активных процессов...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Icon name="CheckCircle2" size={48} className="mx-auto mb-4 text-green-300" />
          <p className="text-slate-600 font-medium">Нет активных бизнес-процессов</p>
          <p className="text-sm text-slate-500 mt-2">Все процессы завершены</p>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id}>
            <div 
              className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                selectedBp === log.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onViewDetails(log.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{log.name}</h3>
                      {getStatusBadge(log.status)}
                      <Icon 
                        name={selectedBp === log.id ? "ChevronUp" : "ChevronDown"} 
                        size={20} 
                        className="text-slate-400"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>ID: {log.id}</span>
                      <span>•</span>
                      <span>Запущен: {formatDate(log.started)}</span>
                      {log.user_id && (
                        <>
                          <span>•</span>
                          <span>Пользователь: {log.user_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {log.errors && log.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-3">
                    <Icon name="AlertTriangle" size={16} />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Ошибки выполнения:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {log.errors.map((err, idx) => (
                          <li key={idx} className="text-sm">{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {selectedBp === log.id && (
              <div className="mt-3 px-6 pb-6 bg-white rounded-lg shadow-sm">
                <BpDetailContent 
                  bpDetail={bpDetail}
                  loading={detailLoading}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default BpLogsList;