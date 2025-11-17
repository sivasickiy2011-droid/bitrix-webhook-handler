import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Connection {
  id: number;
  name: string;
  url: string;
  username: string;
}

interface ConnectionCardProps {
  connection: Connection;
  connectionStatus: 'checking' | 'online' | 'offline' | null;
  onCheckStatus: () => void;
  onEditConnection: () => void;
}

export default function ConnectionCard({ connection, connectionStatus, onCheckStatus, onEditConnection }: ConnectionCardProps) {
  const getConnectionStatusBadge = () => {
    if (!connectionStatus) return null;
    
    const statusConfig = {
      checking: { icon: 'Loader2', text: 'Проверка...', className: 'bg-yellow-500', spinning: true },
      online: { icon: 'Wifi', text: 'Подключено', className: 'bg-green-500', spinning: false },
      offline: { icon: 'WifiOff', text: 'Нет связи', className: 'bg-red-500', spinning: false }
    };
    
    const config = statusConfig[connectionStatus];
    
    return (
      <Badge className={`${config.className} text-white gap-2`}>
        <Icon name={config.icon} size={14} className={config.spinning ? 'animate-spin' : ''} />
        {config.text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Database" size={20} />
            Подключение: {connection.name}
          </div>
          {getConnectionStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <div>URL: {connection.url}</div>
            <div>Пользователь: {connection.username}</div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onEditConnection}
              className="gap-2"
            >
              <Icon name="Edit" size={16} />
              Изменить
            </Button>
            {connectionStatus === 'offline' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onCheckStatus}
                className="gap-2"
              >
                <Icon name="RefreshCw" size={16} />
                Проверить снова
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}