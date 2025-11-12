import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle>Активные бизнес-процессы</CardTitle>
        <CardDescription>
          Найдено записей: {logs.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Icon name="CheckCircle2" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет активных процессов</p>
            <p className="text-sm mt-2">Все бизнес-процессы завершены</p>
          </div>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id}>
              <Card 
                className={`border-l-4 cursor-pointer transition-all ${
                  selectedBp === log.id ? 'ring-2 ring-primary' : ''
                }`}
                style={{
                  borderLeftColor: 
                    log.status === 'error' ? '#ef4444' :
                    log.status === 'running' ? '#3b82f6' :
                    log.status === 'completed' ? '#22c55e' :
                    '#94a3b8'
                }}
                onClick={() => onViewDetails(log.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{log.name}</h3>
                        {getStatusBadge(log.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Icon name="Hash" size={14} />
                          <span>ID: {log.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon name="Calendar" size={14} />
                          <span>Запущен: {formatDate(log.started)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon name="User" size={14} />
                          <span>Пользователь: {log.user_id || 'Неизвестно'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Icon 
                          name={selectedBp === log.id ? "ChevronUp" : "ChevronDown"} 
                          size={16} 
                        />
                        <span>{selectedBp === log.id ? 'Свернуть детали' : 'Развернуть детали'}</span>
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
                </CardContent>
              </Card>

              {selectedBp === log.id && (
                <div className="mt-3 ml-4 animate-in slide-in-from-top-2">
                  <BpDetailContent 
                    bpDetail={bpDetail}
                    loading={detailLoading}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BpLogsList;