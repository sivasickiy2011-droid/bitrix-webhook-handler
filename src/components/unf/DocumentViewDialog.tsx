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
}

interface DocumentViewDialogProps {
  open: boolean;
  document: Document | null;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentViewDialog({ open, document, onOpenChange }: DocumentViewDialogProps) {
  const getNomenclature = () => {
    if (!document?.document_json) return [];
    
    const items = document.document_json.Товары || [];
    return items.map((item: any) => ({
      name: item.Номенклатура || '-',
      quantity: item.Количество || 0,
      price: item.Цена || 0,
      sum: item.Сумма || 0
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Документ {document?.document_number}</DialogTitle>
          <DialogDescription>
            от {document?.document_date ? new Date(document.document_date).toLocaleDateString('ru-RU') : '-'}
          </DialogDescription>
        </DialogHeader>
        
        {document && (
          <div className="space-y-4">
            {nomenclatureItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Номенклатура</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <TableCell className="text-right font-mono">{formatNumber(item.price)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.sum)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={3} className="text-right">Итого:</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(totalSum)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>JSON документа</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-96">
                  {JSON.stringify(document.document_json, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}