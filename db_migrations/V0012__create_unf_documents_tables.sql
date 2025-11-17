-- Таблица для хранения настроек подключения к 1С УНФ
CREATE TABLE IF NOT EXISTS unf_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для хранения документов заказов покупателей из 1С
CREATE TABLE IF NOT EXISTS unf_documents (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER,
    document_uid VARCHAR(255) UNIQUE NOT NULL,
    document_number VARCHAR(100),
    document_date TIMESTAMP,
    document_sum DECIMAL(15,2),
    customer_name VARCHAR(500),
    document_json JSONB,
    bitrix_deal_id VARCHAR(50),
    synced_to_bitrix BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_unf_documents_uid ON unf_documents(document_uid);
CREATE INDEX IF NOT EXISTS idx_unf_documents_date ON unf_documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_unf_documents_bitrix ON unf_documents(bitrix_deal_id);
CREATE INDEX IF NOT EXISTS idx_unf_documents_synced ON unf_documents(synced_to_bitrix);