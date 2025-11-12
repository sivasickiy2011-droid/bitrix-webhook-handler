import { BpDetail } from './types';
import { TimelineLog, BP_LOGS_URL, TIMELINE_URL } from './bpLogsUtils';

interface UseBpLogsActionsProps {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAllBps: (bps: any[]) => void;
  setRunningBps: (bps: any[]) => void;
  setTimelineLogs: (logs: TimelineLog[]) => void;
  setSelectedBp: (id: string | null) => void;
  setBpDetail: (detail: BpDetail | null) => void;
  setDetailLoading: (loading: boolean) => void;
  searchQuery: string;
  source: 'api' | 'db';
  selectedBp: string | null;
  toast: any;
}

export const useBpLogsActions = (props: UseBpLogsActionsProps) => {
  const {
    setLoading,
    setError,
    setAllBps,
    setRunningBps,
    setTimelineLogs,
    setSelectedBp,
    setBpDetail,
    setDetailLoading,
    searchQuery,
    source,
    selectedBp,
    toast,
  } = props;

  const checkDbTables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source: 'db',
        debug: '1'
      });

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      toast({
        title: 'Debug: Таблицы БД',
        description: JSON.stringify(data, null, 2),
        duration: 10000,
      });
      
      console.log('[DEBUG] Информация о таблицах:', data);
    } catch (err: any) {
      toast({
        title: 'Ошибка Debug',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source: 'api',
        showAll: 'true',
        limit: '5'
      });

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      console.log('[TEST API] Прямой ответ от REST API:', data);
      
      const message = data.logs && data.logs.length > 0
        ? `Найдено БП: ${data.count}. Первый: ${data.logs[0].name}`
        : `БП не найдены. Ответ: ${JSON.stringify(data)}`;

      toast({
        title: 'Тест REST API Битрикс24',
        description: message,
        duration: 10000,
      });
    } catch (err: any) {
      toast({
        title: 'Ошибка теста API',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBps = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source: 'db',
        limit: '100',
        offset: '0',
        showAll: 'true'
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки БП');
      }

      setAllBps(data.logs || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningBps = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source,
        limit: '100',
        offset: '0',
        status: 'running'
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки запущенных БП');
      }

      setRunningBps(data.logs || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: '50'
      });

      const response = await fetch(`${TIMELINE_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки логов Timeline');
      }

      setTimelineLogs(data.logs || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (bpId: string) => {
    if (selectedBp === bpId) {
      setSelectedBp(null);
      setBpDetail(null);
      return;
    }

    if (bpId.startsWith('template_')) {
      setSelectedBp(bpId);
      setDetailLoading(true);
      
      try {
        const response = await fetch(`${BP_LOGS_URL}?id=${bpId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Ошибка загрузки статистики шаблона');
        }

        setBpDetail(data);
      } catch (err: any) {
        toast({
          title: 'Ошибка',
          description: err.message,
          variant: 'destructive',
        });
        setSelectedBp(null);
        setBpDetail(null);
      } finally {
        setDetailLoading(false);
      }
      return;
    }

    setSelectedBp(bpId);
    setDetailLoading(true);
    
    try {
      const response = await fetch(`${BP_LOGS_URL}?id=${bpId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки деталей');
      }

      setBpDetail(data);
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message,
        variant: 'destructive',
      });
      setSelectedBp(null);
      setBpDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return {
    checkDbTables,
    testDirectApi,
    fetchAllBps,
    fetchRunningBps,
    fetchTimelineLogs,
    handleViewDetails,
  };
};
