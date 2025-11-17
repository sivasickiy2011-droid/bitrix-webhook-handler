import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface Filters {
  number: string;
  customer: string;
  status: string;
  type: string;
  author: string;
}

interface DocumentsTableProps {
  documents: Document[];
  loading: boolean;
  connection: any;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onViewDocument: (doc: Document) => void;
  onEnrichDocument: (doc: Document) => void;
  onEnrichAllDocuments: () => void;
  onExportDocument: (doc: Document) => void;
  onCreateBitrixDeal: (doc: Document) => void;
  onCheckBitrixDeal: (dealId: string) => void;
}

export default function DocumentsTable({
  documents,
  loading,
  connection,
  filters,
  onFiltersChange,
  onViewDocument,
  onEnrichDocument,
  onEnrichAllDocuments,
  onExportDocument,
  onCreateBitrixDeal,
  onCheckBitrixDeal
}: DocumentsTableProps) {
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

  const filteredDocuments = documents.filter(doc => {
    if (filters.number && !doc.document_number.toLowerCase().includes(filters.number.toLowerCase())) return false;
    if (filters.customer && !doc.customer_name?.toLowerCase().includes(filters.customer.toLowerCase())) return false;
    if (filters.status && !doc.order_status?.toLowerCase().includes(filters.status.toLowerCase())) return false;
    if (filters.type && !doc.order_type?.toLowerCase().includes(filters.type.toLowerCase())) return false;
    if (filters.author && !doc.author?.toLowerCase().includes(filters.author.toLowerCase())) return false;
    return true;
  });

  const needEnrichCount = documents.filter(doc => !doc.customer_name || doc.customer_name.length < 10).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Документы заказов покупателей</CardTitle>
          {needEnrichCount > 0 && (
            <Button
              onClick={onEnrichAllDocuments}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Icon name="Download" size={18} />
              Получить все данные ({needEnrichCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Номер..."
            value={filters.number}
            onChange={(e) => onFiltersChange({ ...filters, number: e.target.value })}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Клиент..."
            value={filters.customer}
            onChange={(e) => onFiltersChange({ ...filters, customer: e.target.value })}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Состояние..."
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Вид заказа..."
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Автор..."
            value={filters.author}
            onChange={(e) => onFiltersChange({ ...filters, author: e.target.value })}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
        {filteredDocuments.length === 0 ? (
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
                <TableHead>Клиент</TableHead>
                <TableHead>Состояние</TableHead>
                <TableHead>Вид заказа</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Битрикс24</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{doc.document_number}</TableCell>
                  <TableCell>{formatDate(doc.document_date)}</TableCell>
                  <TableCell>{doc.customer_name || '-'}</TableCell>
                  <TableCell>{doc.order_status || '-'}</TableCell>
                  <TableCell>{doc.order_type || '-'}</TableCell>
                  <TableCell>{doc.author || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatSum(doc.document_sum)}
                  </TableCell>
                  <TableCell>
                    {doc.synced_to_bitrix ? (
                      <Badge
                        variant="default"
                        className="cursor-pointer"
                        onClick={() => onCheckBitrixDeal(doc.bitrix_deal_id!)}
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
                        onClick={() => onViewDocument(doc)}
                      >
                        <Icon name="Eye" size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExportDocument(doc)}
                        className="gap-1"
                      >
                        <Icon name="FileDown" size={16} />
                      </Button>
                      {(!doc.customer_name || doc.customer_name.length < 10) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEnrichDocument(doc)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Icon name="Download" size={16} />
                          Данные
                        </Button>
                      )}
                      {!doc.synced_to_bitrix && (
                        <Button
                          size="sm"
                          onClick={() => onCreateBitrixDeal(doc)}
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
  );
}