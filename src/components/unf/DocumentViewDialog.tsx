import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Документ {document?.document_number}</DialogTitle>
          <DialogDescription>
            JSON представление документа из 1С
          </DialogDescription>
        </DialogHeader>
        {document && (
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(document.document_json, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
