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
}

interface DocumentsTableProps {
  documents: Document[];
  loading: boolean;
  connection: any;
  onViewDocument: (doc: Document) => void;
  onCreateBitrixDeal: (doc: Document) => void;
  onCheckBitrixDeal: (dealId: string) => void;
}

export default function DocumentsTable({
  documents,
  loading,
  connection,
  onViewDocument,
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

  return (
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
