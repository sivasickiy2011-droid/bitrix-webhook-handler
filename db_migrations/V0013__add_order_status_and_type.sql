-- Добавляем новые колонки для состояния заказа и вида заказа
ALTER TABLE unf_documents 
ADD COLUMN IF NOT EXISTS order_status VARCHAR(255),
ADD COLUMN IF NOT EXISTS order_type VARCHAR(255);