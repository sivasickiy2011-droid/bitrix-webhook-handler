import { useState } from 'react';

const API_URL = 'https://functions.poehali.dev/e07c8cef-5ce3-4e78-a012-72019f5b752e';

interface Connection {
  id: number;
  name: string;
  url: string;
  username: string;
}

interface ConnectionForm {
  url: string;
  username: string;
  password: string;
}

export function useUnfConnection(toast: any) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>({
    url: '',
    username: '',
    password: ''
  });

  const loadConnection = async () => {
    try {
      const response = await fetch(`${API_URL}?action=get_connection`);
      const data = await response.json();
      if (data.success && data.connection) {
        setConnection(data.connection);
        checkConnectionStatus();
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    }
  };

  const checkConnectionStatus = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(`${API_URL}?action=test_connection`);
      const data = await response.json();
      
      if (data.success && data.connection_status?.success) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    } catch (error) {
      setConnectionStatus('offline');
      console.error('Error checking connection:', error);
    }
  };

  const openEditConnection = () => {
    if (connection) {
      setConnectionForm({
        url: connection.url,
        username: connection.username,
        password: ''
      });
      setShowConnectionDialog(true);
    }
  };

  const saveConnection = async (setLoading: (val: boolean) => void) => {
    if (!connectionForm.url || !connectionForm.username || !connectionForm.password) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    toast({
      title: 'Проверка подключения...',
      description: 'Проверяем логин и пароль 1С УНФ'
    });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_connection',
          ...connectionForm
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '✅ Подключение установлено',
          description: 'Логин и пароль верны, данные сохранены'
        });
        setShowConnectionDialog(false);
        setConnectionForm({ url: '', username: '', password: '' });
        loadConnection();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: '❌ Ошибка подключения',
        description: error.message || 'Не удалось подключиться к 1С',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    connection,
    connectionStatus,
    showConnectionDialog,
    connectionForm,
    setShowConnectionDialog,
    setConnectionForm,
    loadConnection,
    checkConnectionStatus,
    openEditConnection,
    saveConnection
  };
}
