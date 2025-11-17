import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
  const [loading, setLoading] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
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
      }
    } catch (error) {
      console.error('Error loading connection:', error);
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
          title: 'Успешно',
          description: 'Подключение сохранено'
        });
        setShowConnectionDialog(false);
        loadConnection();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить подключение',
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
        body: JSON.stringify({ action: 'sync_documents' })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: `Синхронизировано документов: ${data.count}`
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const formatSum = (sum: number) => {
    if (!sum) return '0.00';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(sum);
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
              <Button onClick={syncDocuments} disabled={loading} className="gap-2">
                <Icon name="RefreshCw" size={18} className={loading ? 'animate-spin' : ''} />
                Синхронизировать
              </Button>
            )}
          </div>
        </div>

        {connection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Database" size={20} />
                Подключение: {connection.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <div>URL: {connection.url}</div>
                <div>Пользователь: {connection.username}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Документы заказов покупателей</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="FileX" size={48} className="mx-auto mb-4" />
                <p>Нет документов</p>
                {connection && (
                  <p className="text-sm mt-2">Нажмите "Синхронизировать" для загрузки</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Контрагент</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead>Битрикс24</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell>{formatDate(doc.document_date)}</TableCell>
                      <TableCell>{doc.customer_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatSum(doc.document_sum)}
                      </TableCell>
                      <TableCell>
                        {doc.synced_to_bitrix ? (
                          <Badge
                            variant="default"
                            className="cursor-pointer"
                            onClick={() => checkBitrixDeal(doc.bitrix_deal_id!)}
                          >
                            <Icon name="Check" size={14} className="mr-1" />
                            ID: {doc.bitrix_deal_id}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Не синхронизировано</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDocument(doc)}
                          >
                            <Icon name="Eye" size={16} />
                          </Button>
                          {!doc.synced_to_bitrix && (
                            <Button
                              size="sm"
                              onClick={() => createBitrixDeal(doc)}
                              disabled={loading}
                            >
                              <Icon name="Plus" size={16} className="mr-1" />
                              Создать сделку
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подключение к 1С УНФ</DialogTitle>
            <DialogDescription>
              Введите данные для подключения к 1С через XDTO (Fresh)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL XDTO сервиса</Label>
              <Input
                id="url"
                placeholder="https://your-portal.1cfresh.com/ws/..."
                value={connectionForm.url}
                onChange={(e) => setConnectionForm({ ...connectionForm, url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                placeholder="Пользователь"
                value={connectionForm.username}
                onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Пароль"
                value={connectionForm.password}
                onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })}
              />
            </div>
            <Button onClick={saveConnection} disabled={loading} className="w-full">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Документ {selectedDocument?.document_number}</DialogTitle>
            <DialogDescription>
              JSON представление документа из 1С
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(selectedDocument.document_json, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
