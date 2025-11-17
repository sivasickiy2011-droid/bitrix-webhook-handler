import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface UnfField {
  name: string;
  label: string;
  type: string;
}

interface BitrixField {
  name: string;
  label: string;
  type: string;
}

interface FieldMapping {
  unfField: string;
  bitrixField: string;
}

const UNF_FIELDS: UnfField[] = [
  { name: 'number', label: 'Номер документа', type: 'string' },
  { name: 'date', label: 'Дата документа', type: 'date' },
  { name: 'counterparty_name', label: 'Контрагент', type: 'string' },
  { name: 'total_amount', label: 'Сумма документа', type: 'number' },
  { name: 'contract_description', label: 'Договор', type: 'string' },
  { name: 'comment', label: 'Комментарий', type: 'string' },
  { name: 'manager_name', label: 'Менеджер', type: 'string' },
  { name: 'delivery_address', label: 'Адрес доставки', type: 'string' },
  { name: 'contact_phone', label: 'Телефон контакта', type: 'string' },
];

export default function FieldMappingTab() {
  const { toast } = useToast();
  const [bitrixFields, setBitrixFields] = useState<BitrixField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBitrixFields();
    loadMappings();
  }, []);

  const loadBitrixFields = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/73ea551a-feab-4417-92c3-dd78ca56946b?action=get_deal_fields', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success && data.fields) {
        setBitrixFields(data.fields);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить поля Битрикс24',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = () => {
    const saved = localStorage.getItem('unf_bitrix_field_mappings');
    if (saved) {
      setMappings(JSON.parse(saved));
    } else {
      setMappings([
        { unfField: 'number', bitrixField: 'UF_CRM_1C_ORDER_NUMBER' },
        { unfField: 'date', bitrixField: 'UF_CRM_1C_ORDER_DATE' },
        { unfField: 'total_amount', bitrixField: 'OPPORTUNITY' },
        { unfField: 'counterparty_name', bitrixField: 'TITLE' },
      ]);
    }
  };

  const saveMappings = () => {
    localStorage.setItem('unf_bitrix_field_mappings', JSON.stringify(mappings));
    toast({
      title: 'Сохранено',
      description: 'Настройки сопоставления полей сохранены'
    });
  };

  const updateMapping = (unfField: string, bitrixField: string) => {
    const existing = mappings.find(m => m.unfField === unfField);
    if (existing) {
      setMappings(mappings.map(m => 
        m.unfField === unfField ? { unfField, bitrixField } : m
      ));
    } else {
      setMappings([...mappings, { unfField, bitrixField }]);
    }
  };

  const removeMapping = (unfField: string) => {
    setMappings(mappings.filter(m => m.unfField !== unfField));
  };

  const getMappedField = (unfField: string) => {
    return mappings.find(m => m.unfField === unfField)?.bitrixField || '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Сопоставление полей 1С УНФ → Битрикс24</CardTitle>
          <Button onClick={saveMappings} className="gap-2">
            <Icon name="Save" size={18} />
            Сохранить настройки
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-center font-medium text-sm text-muted-foreground pb-2 border-b">
              <div>Поле 1С УНФ</div>
              <div className="w-12"></div>
              <div>Поле Битрикс24</div>
              <div className="w-10"></div>
            </div>

            {UNF_FIELDS.map(unfField => {
              const mappedBitrixField = getMappedField(unfField.name);
              
              return (
                <div key={unfField.name} className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{unfField.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {unfField.name} ({unfField.type})
                    </div>
                  </div>

                  <div className="w-12 flex justify-center">
                    <Icon name="ArrowRight" size={20} className="text-muted-foreground" />
                  </div>

                  <select
                    value={mappedBitrixField}
                    onChange={(e) => updateMapping(unfField.name, e.target.value)}
                    className="p-3 bg-background border rounded-lg w-full"
                  >
                    <option value="">Не сопоставлено</option>
                    <optgroup label="Основные поля">
                      <option value="TITLE">Название сделки</option>
                      <option value="OPPORTUNITY">Сумма</option>
                      <option value="COMMENTS">Комментарий</option>
                    </optgroup>
                    <optgroup label="Кастомные поля">
                      <option value="UF_CRM_1C_ORDER_NUMBER">Номер заказа в 1С</option>
                      <option value="UF_CRM_1C_ORDER_DATE">Дата заказа в 1С</option>
                      {bitrixFields
                        .filter(f => f.name.startsWith('UF_CRM_'))
                        .map(field => (
                          <option key={field.name} value={field.name}>
                            {field.label}
                          </option>
                        ))
                      }
                    </optgroup>
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(unfField.name)}
                    disabled={!mappedBitrixField}
                    className="w-10"
                  >
                    <Icon name="X" size={18} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={18} className="text-blue-500 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium mb-1">Как это работает:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Выберите поля Битрикс24 для каждого поля из 1С УНФ</li>
                <li>При создании сделки данные будут автоматически переноситься согласно настройкам</li>
                <li>Несопоставленные поля не будут передаваться в Битрикс24</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}