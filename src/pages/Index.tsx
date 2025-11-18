import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import LoginForm from '@/components/LoginForm';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://functions.poehali.dev/6a844be4-d079-4584-aa51-27ed6b95cb81';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

export default function Index() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const modules: Module[] = [
    {
      id: 'inn-uniqueness',
      title: 'Уникальность по ИНН',
      description: 'Проверка дубликатов компаний по ИНН в Битрикс24',
      icon: 'ShieldCheck',
      path: '/inn-uniqueness',
      color: 'bg-blue-500',
    },
    {
      id: 'contracts',
      title: 'Договоры',
      description: 'Управление договорами и контрактами',
      icon: 'FileSignature',
      path: '/contracts',
      color: 'bg-green-500',
    },
    {
      id: 'purchases',
      title: 'Закупки',
      description: 'Работа с закупками и заявками',
      icon: 'ShoppingCart',
      path: '/purchases',
      color: 'bg-orange-500',
    },
    {
      id: 'unf-documents',
      title: 'Документы в УНФ',
      description: 'Интеграция документов с УНФ',
      icon: 'FolderOpen',
      path: '/unf-documents',
      color: 'bg-purple-500',
    },
    {
      id: 'bp-logs',
      title: 'Логи бизнес-процессов',
      description: 'Мониторинг и отслеживание ошибок БП',
      icon: 'Activity',
      path: '/bp-logs',
      color: 'bg-red-500',
    },
    {
      id: 'deal-changes',
      title: 'История сделок',
      description: 'Отслеживание изменений в сделках Битрикс24',
      icon: 'History',
      path: '/deal-changes',
      color: 'bg-indigo-500',
    },
  ];

  useEffect(() => {
    const authToken = localStorage.getItem('webhook_auth_token');
    if (authToken) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username,
          password,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('webhook_auth_token', data.token);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Неверный логин или пароль');
      }
    } catch (error) {
      setAuthError('Ошибка подключения к серверу');
      console.error('Login error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('webhook_auth_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={authError} loading={authLoading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-xl shadow-lg">
              <Icon name="LayoutDashboard" size={40} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Integration Hub API</h1>
              <p className="text-muted-foreground text-lg">Автоматизация и управление бизнес-процессами</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <Icon name="LogOut" size={18} />
            Выход
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => (
            <Card
              key={module.id}
              className="group cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-2 hover:border-primary"
              onClick={() => navigate(module.path)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-4 ${module.color} rounded-xl shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon name={module.icon} size={32} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
                    <CardDescription className="text-base">{module.description}</CardDescription>
                  </div>
                  <Icon name="ArrowRight" size={24} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}