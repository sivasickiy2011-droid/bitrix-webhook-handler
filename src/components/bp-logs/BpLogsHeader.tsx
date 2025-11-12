import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface BpLogsHeaderProps {
  loading: boolean;
  onTestApi: () => void;
  onCheckDb: () => void;
}

const BpLogsHeader = ({ loading, onTestApi, onCheckDb }: BpLogsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Мониторинг бизнес-процессов</h1>
        <p className="text-slate-600 mt-2">Отслеживание статусов, запущенных БП и логов Битрикс24</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onTestApi} variant="default" disabled={loading}>
          <Icon name="Zap" size={16} className="mr-2" />
          Тест API
        </Button>
        <Button onClick={onCheckDb} variant="secondary" disabled={loading}>
          <Icon name="Database" size={16} className="mr-2" />
          Debug БД
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          <Icon name="ArrowLeft" size={16} className="mr-2" />
          На главную
        </Button>
      </div>
    </div>
  );
};

export default BpLogsHeader;
