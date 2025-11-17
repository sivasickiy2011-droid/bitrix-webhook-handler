import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  author?: string;
  order_status?: string;
  order_type?: string;
}

interface DocumentViewDialogProps {
  open: boolean;
  document: Document | null;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentViewDialog({ open, document, onOpenChange }: DocumentViewDialogProps) {
  const getNomenclature = () => {
    if (!document?.document_json) return [];
    
    const items = document.document_json.Запасы || [];
    return items.map((item: any) => ({
      name: item.name || item.Содержание || item.Номенклатура || '-',
      quantity: item.quantity || item.Количество || 0,
      price: item.price || item.Цена || 0,
      sum: item.sum || item.Сумма || 0
    }));
  };

  const nomenclatureItems = getNomenclature();
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const totalSum = nomenclatureItems.reduce((acc, item) => acc + item.sum, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Документ {document?.document_number}</DialogTitle>
          <DialogDescription>
            от {document?.document_date ? new Date(document.document_date).toLocaleDateString('ru-RU') : '-'}
            {document?.customer_name && ` • ${document.customer_name}`}
            {document?.order_status && ` • ${document.order_status}`}
            {document?.order_type && ` • ${document.order_type}`}
            {document?.author && ` • ${document.author}`}
          </DialogDescription>
        </DialogHeader>
        
        {document && (
          <div className="space-y-4 overflow-auto flex-1">
            <Card>
              <CardHeader>
                <CardTitle>Номенклатура</CardTitle>
              </CardHeader>
              <CardContent>
                {nomenclatureItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Наименование</TableHead>
                        <TableHead className="text-right">Количество</TableHead>
                        <TableHead className="text-right">Цена</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nomenclatureItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.quantity)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.price)} ₽</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.sum)} ₽</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={3} className="text-right">Итого:</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(totalSum)} ₽</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет данных о номенклатуре</p>
                    <p className="text-sm mt-2">Нажмите "Данные" для загрузки</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex-shrink-0">
              <CardHeader>
                <CardTitle>JSON документа</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-96">
                  <pre>{JSON.stringify(document.document_json, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}