import { useState } from 'react';

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

export function useUnfDocuments(toast: any, connection: any) {
  const [documents, setDocuments] = useState<Document[]>([]);
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

  const loadDocuments = async (setLoading: (val: boolean) => void) => {
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

  const syncDocuments = async (setLoading: (val: boolean) => void) => {
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
        loadDocuments(setLoading);
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

  const viewDocument = async (doc: Document, setLoading: (val: boolean) => void) => {
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

  const clearDocuments = async (setLoading: (val: boolean) => void) => {
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
        loadDocuments(setLoading);
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

  const enrichDocument = async (doc: Document, setLoading: (val: boolean) => void) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=enrich_document&id=${doc.id}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Данные получены',
          description: 'Документ обогащен данными из 1С'
        });
        loadDocuments(setLoading);
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

  const enrichAllDocuments = async (setLoading: (val: boolean) => void) => {
    const docsToEnrich = documents.filter(doc => !doc.customer_name || doc.customer_name.length < 10);
    
    if (docsToEnrich.length === 0) {
      toast({
        title: 'Все данные получены',
        description: 'Все документы уже содержат полные данные'
      });
      return;
    }

    setLoading(true);
    toast({
      title: 'Получение данных...',
      description: `Обрабатывается ${docsToEnrich.length} документов`
    });

    let successCount = 0;
    let errorCount = 0;

    for (const doc of docsToEnrich) {
      try {
        const response = await fetch(`${API_URL}?action=enrich_document&id=${doc.id}`);
        const data = await response.json();
        
        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    loadDocuments(setLoading);
    
    toast({
      title: 'Обогащение завершено',
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`,
      variant: errorCount > 0 ? 'destructive' : 'default'
    });
  };

  const exportDocument = (doc: Document) => {
    const exportData = {
      Номер: doc.document_number,
      Дата: doc.document_date,
      Клиент: doc.customer_name,
      'Состояние заказа': doc.order_status,
      'Вид заказа': doc.order_type,
      Автор: doc.author,
      'Сумма': doc.document_sum,
      'ID в Битрикс24': doc.bitrix_deal_id || 'Не синхронизировано',
      'UUID в 1С': doc.document_uid
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_${doc.document_number}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '✅ Документ выгружен',
      description: `Файл: document_${doc.document_number}.json`
    });
  };

  return {
    documents,
    showDocumentDialog,
    selectedDocument,
    docLimit,
    showLimitMenu,
    filters,
    setShowDocumentDialog,
    setDocLimit,
    setShowLimitMenu,
    setFilters,
    loadDocuments,
    syncDocuments,
    viewDocument,
    clearDocuments,
    enrichDocument,
    enrichAllDocuments,
    exportDocument
  };
}