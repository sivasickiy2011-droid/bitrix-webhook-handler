import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import LoginForm from '@/components/LoginForm';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://functions.poehali.dev/6a844be4-d079-4584-aa51-27ed6b95cb81';

interface SubModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

interface MainModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  subModules: SubModule[];
}

export default function Index() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const modules: MainModule[] = [
    {
      id: '1c',
      title: '1С',
      description: 'Интеграция с 1С',
      icon: 'Database',
      color: 'bg-orange-500',
      subModules: [
        {
          id: 'unf-documents',
          title: 'Документы в УНФ',
          description: 'Интеграция документов с УНФ',
          icon: 'FolderOpen',
          path: '/unf-documents',
        },
        {
          id: 'contracts',
          title: 'Договоры',
          description: 'Управление договорами и контрактами',
          icon: 'FileSignature',
          path: '/contracts',
        },
        {
          id: 'purchases',
          title: 'Закупки',
          description: 'Работа с закупками и заявками',
          icon: 'ShoppingCart',
          path: '/purchases',
        },
      ],
    },
    {
      id: 'bitrix24',
      title: 'Битрикс24',
      description: 'Интеграция с Битрикс24',
      icon: 'Briefcase',
      color: 'bg-blue-500',
      subModules: [
        {
          id: 'inn-uniqueness',
          title: 'Уникальность по ИНН',
          description: 'Проверка дубликатов компаний по ИНН',
          icon: 'ShieldCheck',
          path: '/inn-uniqueness',
        },
        {
          id: 'bp-logs',
          title: 'Логи бизнес-процессов',
          description: 'Мониторинг и отслеживание ошибок БП',
          icon: 'Activity',
          path: '/bp-logs',
        },
        {
          id: 'deal-changes',
          title: 'История сделок',
          description: 'Отслеживание изменений в сделках',
          icon: 'History',
          path: '/deal-changes',
        },
      ],
    },
    {
      id: 'amocrm',
      title: 'amoCRM',
      description: 'Интеграция с amoCRM',
      icon: 'Users',
      color: 'bg-purple-500',
      subModules: [],
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="relative">
              <Card
                className="group cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-2 hover:border-primary"
                onClick={() => setOpenMenu(openMenu === module.id ? null : module.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-4 ${module.color} rounded-xl shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon name={module.icon} size={32} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-1">{module.title}</CardTitle>
                      <CardDescription className="text-sm">{module.description}</CardDescription>
                    </div>
                    <Icon 
                      name={openMenu === module.id ? "ChevronUp" : "ChevronDown"} 
                      size={24} 
                      className="text-muted-foreground group-hover:text-primary transition-all" 
                    />
                  </div>
                </CardHeader>
              </Card>

              {openMenu === module.id && module.subModules.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-background border-2 rounded-lg shadow-xl z-10 overflow-hidden">
                  {module.subModules.map((subModule) => (
                    <div
                      key={subModule.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b last:border-b-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(subModule.path);
                        setOpenMenu(null);
                      }}
                    >
                      <Icon name={subModule.icon} size={20} className="text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{subModule.title}</div>
                        <div className="text-xs text-muted-foreground">{subModule.description}</div>
                      </div>
                      <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}

              {openMenu === module.id && module.subModules.length === 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-background border-2 rounded-lg shadow-xl z-10 overflow-hidden">
                  <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                    <Icon name="Construction" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>В разработке</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}