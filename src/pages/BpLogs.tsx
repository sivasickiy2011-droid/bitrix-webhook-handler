import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { BpLog, BpDetail } from '@/components/bp-logs/types';
import BpLogsFilters from '@/components/bp-logs/BpLogsFilters';
import BpLogsList from '@/components/bp-logs/BpLogsList';
import BpLogsHeader from '@/components/bp-logs/BpLogsHeader';
import BpLogsTimelineTab from '@/components/bp-logs/BpLogsTimelineTab';
import { TimelineLog } from '@/components/bp-logs/bpLogsUtils';
import { useBpLogsActions } from '@/components/bp-logs/useBpLogsActions';

const BpLogs = () => {
  const [allBps, setAllBps] = useState<BpLog[]>([]);
  const [runningBps, setRunningBps] = useState<BpLog[]>([]);
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'db'>('api');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBp, setSelectedBp] = useState<string | null>(null);
  const [bpDetail, setBpDetail] = useState<BpDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const {
    checkDbTables,
    testDirectApi,
    fetchAllBps,
    fetchRunningBps,
    fetchTimelineLogs,
    handleViewDetails,
  } = useBpLogsActions({
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
  });

  const handleRefresh = () => {
    if (activeTab === 'all') {
      fetchAllBps();
    } else if (activeTab === 'running') {
      fetchRunningBps();
    } else if (activeTab === 'timeline') {
      fetchTimelineLogs();
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllBps();
    } else if (activeTab === 'running') {
      fetchRunningBps();
    } else if (activeTab === 'timeline') {
      fetchTimelineLogs();
    }
  }, [activeTab, source]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, source, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <BpLogsHeader
          loading={loading}
          onTestApi={testDirectApi}
          onCheckDb={checkDbTables}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              <Icon name="FolderTree" size={16} className="mr-2" />
              Все БП
            </TabsTrigger>
            <TabsTrigger value="running">
              <Icon name="Play" size={16} className="mr-2" />
              Запущенные
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Icon name="FileText" size={16} className="mr-2" />
              Логи Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <BpLogsFilters
              source={source}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              autoRefresh={autoRefresh}
              loading={loading}
              onSourceChange={setSource}
              onStatusFilterChange={setStatusFilter}
              onSearchQueryChange={setSearchQuery}
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={handleRefresh}
            />

            {error && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <BpLogsList
              logs={allBps}
              loading={loading}
              selectedBp={selectedBp}
              bpDetail={bpDetail}
              detailLoading={detailLoading}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="running" className="space-y-6">
            <BpLogsFilters
              source={source}
              statusFilter="running"
              searchQuery={searchQuery}
              autoRefresh={autoRefresh}
              loading={loading}
              onSourceChange={setSource}
              onStatusFilterChange={() => {}}
              onSearchQueryChange={setSearchQuery}
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={handleRefresh}
            />

            {error && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <BpLogsList
              logs={runningBps}
              loading={loading}
              selectedBp={selectedBp}
              bpDetail={bpDetail}
              detailLoading={detailLoading}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <BpLogsTimelineTab
              timelineLogs={timelineLogs}
              loading={loading}
              error={error}
              autoRefresh={autoRefresh}
              onRefresh={handleRefresh}
              onAutoRefreshChange={setAutoRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BpLogs;
