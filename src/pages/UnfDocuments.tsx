import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import ConnectionCard from '@/components/unf/ConnectionCard';
import DocumentsTable from '@/components/unf/DocumentsTable';
import ConnectionDialog from '@/components/unf/ConnectionDialog';
import DocumentViewDialog from '@/components/unf/DocumentViewDialog';
import { useUnfConnection } from '@/hooks/useUnfConnection';
import { useUnfDocuments } from '@/hooks/useUnfDocuments';
import { useUnfBitrix } from '@/hooks/useUnfBitrix';

export default function UnfDocuments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
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
  } = useUnfConnection(toast);

  const {
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
    enrichDocument
  } = useUnfDocuments(toast, connection);

  const { createBitrixDeal, checkBitrixDeal } = useUnfBitrix(toast, loadDocuments);

  useEffect(() => {
    loadConnection();
    loadDocuments(setLoading);
  }, []);

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
                
                <Button onClick={() => syncDocuments(setLoading)} disabled={loading} className="gap-2">
                  <Icon name="RefreshCw" size={18} className={loading ? 'animate-spin' : ''} />
                  Синхронизировать
                </Button>
                
                {documents.length > 0 && (
                  <Button 
                    onClick={() => clearDocuments(setLoading)} 
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
          onViewDocument={(doc) => viewDocument(doc, setLoading)}
          onEnrichDocument={(doc) => enrichDocument(doc, setLoading)}
          onCreateBitrixDeal={(doc) => createBitrixDeal(doc, setLoading)}
          onCheckBitrixDeal={(dealId) => checkBitrixDeal(dealId, setLoading)}
        />
      </div>

      <ConnectionDialog
        open={showConnectionDialog}
        loading={loading}
        connectionForm={connectionForm}
        onOpenChange={setShowConnectionDialog}
        onFormChange={setConnectionForm}
        onSave={() => saveConnection(setLoading)}
      />

      <DocumentViewDialog
        open={showDocumentDialog}
        document={selectedDocument}
        onOpenChange={setShowDocumentDialog}
      />
    </div>
  );
}
