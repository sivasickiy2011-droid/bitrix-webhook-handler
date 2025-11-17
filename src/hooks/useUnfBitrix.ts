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

export function useUnfBitrix(toast: any, loadDocuments: (setLoading: (val: boolean) => void) => void) {
  const createBitrixDeal = async (doc: Document, setLoading: (val: boolean) => void) => {
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
        loadDocuments(setLoading);
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

  const checkBitrixDeal = async (dealId: string, setLoading: (val: boolean) => void) => {
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

  const syncWithBitrix = async (setLoading: (val: boolean) => void) => {
    setLoading(true);
    toast({
      title: 'Синхронизация...',
      description: 'Проверяем сделки в Битрикс24'
    });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_with_bitrix'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '✅ Синхронизация завершена',
          description: data.message
        });
        loadDocuments(setLoading);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось синхронизировать с Битрикс24',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    createBitrixDeal,
    checkBitrixDeal,
    syncWithBitrix
  };
}