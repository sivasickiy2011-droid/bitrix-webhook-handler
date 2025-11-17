import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConnectionDialogProps {
  open: boolean;
  loading: boolean;
  connectionForm: {
    url: string;
    username: string;
    password: string;
  };
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: { url: string; username: string; password: string }) => void;
  onSave: () => void;
}

export default function ConnectionDialog({
  open,
  loading,
  connectionForm,
  onOpenChange,
  onFormChange,
  onSave
}: ConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подключение к 1С УНФ</DialogTitle>
          <DialogDescription>
            Введите данные для подключения к 1С через XDTO (Fresh)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="url">URL XDTO сервиса</Label>
            <Input
              id="url"
              placeholder="https://your-portal.1cfresh.com/ws/..."
              value={connectionForm.url}
              onChange={(e) => onFormChange({ ...connectionForm, url: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              placeholder="Пользователь"
              value={connectionForm.username}
              onChange={(e) => onFormChange({ ...connectionForm, username: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Пароль"
              value={connectionForm.password}
              onChange={(e) => onFormChange({ ...connectionForm, password: e.target.value })}
            />
          </div>
          <Button onClick={onSave} disabled={loading} className="w-full">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
