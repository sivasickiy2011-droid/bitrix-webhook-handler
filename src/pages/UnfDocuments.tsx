import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import ConnectionCard from '@/components/unf/ConnectionCard';
import DocumentsTable from '@/components/unf/DocumentsTable';
import ConnectionDialog from '@/components/unf/ConnectionDialog';
import DocumentViewDialog from '@/components/unf/DocumentViewDialog';

const API_URL = 'https://functions.poehali.dev/e07c8cef-5ce3-4e78-a012-72019f5b752e';

interface Document {
  id: number;
  document_uid: string;
  document_number: string;
  document_date: string;
  document_sum: number;
  customer_name: string;
  bitrix_deal_id: string | null;
  synced_to_bitrix: boolean;
  document_json?: any;
  order_status?: string;
  order_type?: string;
  author?: string;
}

interface Connection {
  id: number;
  name: string;
  url: string;
  username: string;
}

export default function UnfDocuments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [docLimit, setDocLimit] = useState<5 | 10 | 20 | 50 | 100>(5);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const [filters, setFilters] = useState({
    number: '',
    customer: '',
    status: '',
    type: '',
    author: ''
  });
  
  const [connectionForm, setConnectionForm] = useState({
    url: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    loadConnection();
    loadDocuments();
  }, []);

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

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=list`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async () => {
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

  const syncDocuments = async () => {
    if (!connection) {
      toast({
        title: 'Ошибка',
        description: 'Сначала настройте подключение к 1С',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sync_documents',
          limit: docLimit
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: `Синхронизировано последних ${docLimit} документов: ${data.count} шт.`
        });
        loadDocuments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось синхронизировать документы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc: Document) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=get_document&id=${doc.id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedDocument(data.document);
        setShowDocumentDialog(true);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документ',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createBitrixDeal = async (doc: Document) => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_bitrix_deal',
          document_id: doc.id
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: `Сделка создана: ${data.deal_id}`
        });
        loadDocuments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать сделку',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBitrixDeal = async (dealId: string) => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_bitrix_deal',
          deal_id: dealId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: data.exists ? 'Сделка существует' : 'Сделка не найдена',
          description: `ID сделки: ${dealId}`,
          variant: data.exists ? 'default' : 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить сделку',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearDocuments = async () => {
    if (!confirm('Очистить список документов? Это не удалит документы из 1С.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_documents' })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: `Очищено документов: ${data.count}`
        });
        loadDocuments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось очистить документы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const enrichDocument = async (doc: Document) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=enrich_document&id=${doc.id}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Данные получены',
          description: 'Документ обогащен данными из 1С'
        });
        loadDocuments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось получить данные',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" size={24} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Icon name="FolderOpen" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Документы в УНФ</h1>
                <p className="text-muted-foreground">Заказы покупателей из 1С УНФ 3</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConnectionDialog(true)}
              className="gap-2"
            >
              <Icon name="Settings" size={18} />
              {connection ? 'Настройки' : 'Подключить 1С'}
            </Button>
            
            {connection && (
              <div className="flex gap-2">
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowLimitMenu(!showLimitMenu)}
                    className="gap-2"
                  >
                    <Icon name="Hash" size={18} />
                    {docLimit} документов
                  </Button>
                  
                  {showLimitMenu && (
                    <div className="absolute top-full mt-1 right-0 bg-background border rounded-lg shadow-lg z-10 min-w-[140px]">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-muted rounded-t-lg"
                        onClick={() => {
                          setDocLimit(5);
                          setShowLimitMenu(false);
                        }}
                      >
                        5 документов
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-muted"
                        onClick={() => {
                          setDocLimit(10);
                          setShowLimitMenu(false);
                        }}
                      >
                        10 документов
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-muted"
                        onClick={() => {
                          setDocLimit(20);
                          setShowLimitMenu(false);
                        }}
                      >
                        20 документов
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-muted"
                        onClick={() => {
                          setDocLimit(50);
                          setShowLimitMenu(false);
                        }}
                      >
                        50 документов
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-muted rounded-b-lg"
                        onClick={() => {
                          setDocLimit(100);
                          setShowLimitMenu(false);
                        }}
                      >
                        100 документов
                      </button>
                    </div>
                  )}
                </div>
                
                <Button onClick={syncDocuments} disabled={loading} className="gap-2">
                  <Icon name="RefreshCw" size={18} className={loading ? 'animate-spin' : ''} />
                  Синхронизировать
                </Button>
                
                {documents.length > 0 && (
                  <Button 
                    onClick={clearDocuments} 
                    disabled={loading} 
                    variant="outline"
                    className="gap-2"
                  >
                    <Icon name="Trash2" size={18} />
                    Очистить список
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {connection && (
          <ConnectionCard
            connection={connection}
            connectionStatus={connectionStatus}
            onCheckStatus={checkConnectionStatus}
            onEditConnection={openEditConnection}
          />
        )}

        <DocumentsTable
          documents={documents}
          loading={loading}
          connection={connection}
          filters={filters}
          onFiltersChange={setFilters}
          onViewDocument={viewDocument}
          onEnrichDocument={enrichDocument}
          onCreateBitrixDeal={createBitrixDeal}
          onCheckBitrixDeal={checkBitrixDeal}
        />
      </div>

      <ConnectionDialog
        open={showConnectionDialog}
        loading={loading}
        connectionForm={connectionForm}
        onOpenChange={setShowConnectionDialog}
        onFormChange={setConnectionForm}
        onSave={saveConnection}
      />

      <DocumentViewDialog
        open={showDocumentDialog}
        document={selectedDocument}
        onOpenChange={setShowDocumentDialog}
      />
    </div>
  );
}