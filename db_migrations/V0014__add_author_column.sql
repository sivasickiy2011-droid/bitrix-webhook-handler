-- Добавляем колонку для автора документа
ALTER TABLE unf_documents 
ADD COLUMN IF NOT EXISTS author VARCHAR(255);