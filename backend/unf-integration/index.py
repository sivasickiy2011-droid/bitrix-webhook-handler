import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from requests.auth import HTTPBasicAuth
import base64
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Интеграция с 1С УНФ через XDTO - получение документов заказов и синхронизация с Битрикс24
    Args: event - dict с httpMethod, body, queryStringParameters
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict с данными документов или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            action = query_params.get('action', 'list')
            
            if action == 'list':
                cur.execute("""
                    SELECT id, document_uid, document_number, document_date, 
                           document_sum, customer_name, bitrix_deal_id, synced_to_bitrix
                    FROM unf_documents 
                    ORDER BY document_date DESC 
                    LIMIT 100
                """)
                documents = cur.fetchall()
                
                return response_json(200, {
                    'success': True,
                    'documents': [dict(doc) for doc in documents]
                })
            
            elif action == 'get_document':
                doc_id = query_params.get('id', '')
                if not doc_id:
                    return response_json(400, {'success': False, 'error': 'Document ID required'})
                
                cur.execute("""
                    SELECT * FROM unf_documents WHERE id = %s
                """, (doc_id,))
                document = cur.fetchone()
                
                if not document:
                    return response_json(404, {'success': False, 'error': 'Document not found'})
                
                return response_json(200, {
                    'success': True,
                    'document': dict(document)
                })
            
            elif action == 'get_connection':
                cur.execute("SELECT * FROM unf_connections WHERE is_active = true LIMIT 1")
                connection = cur.fetchone()
                
                if connection:
                    conn_dict = dict(connection)
                    conn_dict.pop('password_encrypted', None)
                    return response_json(200, {'success': True, 'connection': conn_dict})
                else:
                    return response_json(200, {'success': True, 'connection': None})
            
            elif action == 'test_connection':
                cur.execute("SELECT * FROM unf_connections WHERE is_active = true LIMIT 1")
                connection = cur.fetchone()
                
                if not connection:
                    return response_json(400, {'success': False, 'error': 'No active connection'})
                
                password = base64.b64decode(connection['password_encrypted']).decode()
                test_result = test_1c_connection(
                    connection['url'],
                    connection['username'],
                    password
                )
                
                return response_json(200, {
                    'success': True,
                    'connection_status': test_result
                })
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', '')
            
            if action == 'save_connection':
                name = body_data.get('name', '1С УНФ')
                url = body_data.get('url', '').strip()
                username = body_data.get('username', '').strip()
                password = body_data.get('password', '').strip()
                
                if not url or not username or not password:
                    return response_json(400, {'success': False, 'error': 'URL, username and password required'})
                
                test_result = test_1c_connection(url, username, password)
                
                if not test_result['success']:
                    return response_json(400, {
                        'success': False, 
                        'error': f"Не удалось подключиться к 1С: {test_result['error']}"
                    })
                
                password_encoded = base64.b64encode(password.encode()).decode()
                
                cur.execute("UPDATE unf_connections SET is_active = false")
                
                cur.execute("""
                    INSERT INTO unf_connections (name, url, username, password_encrypted, is_active)
                    VALUES (%s, %s, %s, %s, true)
                    RETURNING id
                """, (name, url, username, password_encoded))
                
                connection_id = cur.fetchone()['id']
                conn.commit()
                
                return response_json(200, {
                    'success': True,
                    'message': 'Подключение успешно проверено и сохранено',
                    'connection_id': connection_id
                })
            
            elif action == 'sync_documents':
                cur.execute("SELECT * FROM unf_connections WHERE is_active = true LIMIT 1")
                connection = cur.fetchone()
                
                if not connection:
                    return response_json(400, {'success': False, 'error': 'No active connection'})
                
                password = base64.b64decode(connection['password_encrypted']).decode()
                
                documents = fetch_documents_from_1c(
                    connection['url'],
                    connection['username'],
                    password
                )
                
                saved_count = 0
                for doc in documents:
                    cur.execute("""
                        INSERT INTO unf_documents 
                        (connection_id, document_uid, document_number, document_date, 
                         document_sum, customer_name, document_json)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (document_uid) 
                        DO UPDATE SET 
                            document_number = EXCLUDED.document_number,
                            document_date = EXCLUDED.document_date,
                            document_sum = EXCLUDED.document_sum,
                            customer_name = EXCLUDED.customer_name,
                            document_json = EXCLUDED.document_json,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        connection['id'],
                        doc['uid'],
                        doc['number'],
                        doc['date'],
                        doc['sum'],
                        doc['customer'],
                        json.dumps(doc['raw_data'])
                    ))
                    saved_count += 1
                
                conn.commit()
                
                return response_json(200, {
                    'success': True,
                    'message': f'Synced {saved_count} documents',
                    'count': saved_count
                })
            
            elif action == 'create_bitrix_deal':
                doc_id = body_data.get('document_id', '')
                if not doc_id:
                    return response_json(400, {'success': False, 'error': 'Document ID required'})
                
                cur.execute("SELECT * FROM unf_documents WHERE id = %s", (doc_id,))
                document = cur.fetchone()
                
                if not document:
                    return response_json(404, {'success': False, 'error': 'Document not found'})
                
                bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
                if not bitrix_webhook:
                    return response_json(400, {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'})
                
                deal_id = create_bitrix_deal(bitrix_webhook, document)
                
                if deal_id:
                    cur.execute("""
                        UPDATE unf_documents 
                        SET bitrix_deal_id = %s, synced_to_bitrix = true, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (deal_id, doc_id))
                    conn.commit()
                    
                    return response_json(200, {
                        'success': True,
                        'message': 'Deal created',
                        'deal_id': deal_id
                    })
                else:
                    return response_json(500, {'success': False, 'error': 'Failed to create deal'})
            
            elif action == 'check_bitrix_deal':
                deal_id = body_data.get('deal_id', '')
                if not deal_id:
                    return response_json(400, {'success': False, 'error': 'Deal ID required'})
                
                bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
                if not bitrix_webhook:
                    return response_json(400, {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'})
                
                exists = check_deal_exists(bitrix_webhook, deal_id)
                
                return response_json(200, {
                    'success': True,
                    'exists': exists,
                    'deal_id': deal_id
                })
        
        return response_json(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return response_json(500, {'success': False, 'error': str(e)})
    finally:
        cur.close()
        conn.close()

def test_1c_connection(url: str, username: str, password: str) -> Dict[str, Any]:
    """Проверка подключения к 1С УНФ"""
    try:
        test_request = """<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:xdto="http://www.1c.ru/SSL/IntegrationService">
  <soap:Body>
    <xdto:Execute>
      <xdto:Query>SELECT TOP 1 1 AS Test</xdto:Query>
    </xdto:Execute>
  </soap:Body>
</soap:Envelope>"""
        
        response = requests.post(
            url,
            data=test_request,
            auth=HTTPBasicAuth(username, password),
            headers={'Content-Type': 'text/xml; charset=utf-8'},
            timeout=10
        )
        
        if response.status_code == 200:
            return {'success': True, 'message': 'Connection successful'}
        elif response.status_code == 401:
            return {'success': False, 'error': 'Неверный логин или пароль'}
        elif response.status_code == 404:
            return {'success': False, 'error': 'URL не найден. Проверьте адрес XDTO сервиса'}
        else:
            return {'success': False, 'error': f'Ошибка сервера: HTTP {response.status_code}'}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Превышено время ожидания. Проверьте доступность сервера'}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Не удалось подключиться к серверу. Проверьте URL'}
    except Exception as e:
        return {'success': False, 'error': f'Ошибка подключения: {str(e)}'}

def fetch_documents_from_1c(url: str, username: str, password: str) -> List[Dict]:
    """Получение документов из 1С УНФ через XDTO"""
    try:
        xdto_request = """<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:xdto="http://www.1c.ru/SSL/IntegrationService">
  <soap:Body>
    <xdto:Execute>
      <xdto:Query>SELECT ЗаказПокупателя.Ссылка AS UID, 
                         ЗаказПокупателя.Номер AS Number, 
                         ЗаказПокупателя.Дата AS Date,
                         ЗаказПокупателя.СуммаДокумента AS Sum,
                         ЗаказПокупателя.Контрагент.Наименование AS Customer
                  FROM Документ.ЗаказПокупателя AS ЗаказПокупателя
                  WHERE ЗаказПокупателя.Дата >= &StartDate
                  ORDER BY ЗаказПокупателя.Дата DESC</xdto:Query>
      <xdto:Parameters>
        <xdto:Parameter>
          <xdto:Name>StartDate</xdto:Name>
          <xdto:Value>2024-01-01T00:00:00</xdto:Value>
        </xdto:Parameter>
      </xdto:Parameters>
    </xdto:Execute>
  </soap:Body>
</soap:Envelope>"""
        
        response = requests.post(
            url,
            data=xdto_request,
            auth=HTTPBasicAuth(username, password),
            headers={'Content-Type': 'text/xml; charset=utf-8'},
            timeout=30
        )
        
        if response.status_code == 200:
            return parse_xdto_response(response.text)
        else:
            print(f"1C response error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error fetching from 1C: {str(e)}")
        return []

def parse_xdto_response(xml_text: str) -> List[Dict]:
    """Парсинг XDTO ответа от 1С"""
    import xml.etree.ElementTree as ET
    
    documents = []
    try:
        root = ET.fromstring(xml_text)
        
        for row in root.findall('.//{http://www.1c.ru/SSL/IntegrationService}Row'):
            doc = {}
            for field in row:
                tag_name = field.tag.split('}')[-1]
                doc[tag_name.lower()] = field.text
            
            if doc.get('uid'):
                documents.append({
                    'uid': doc.get('uid'),
                    'number': doc.get('number', ''),
                    'date': doc.get('date', ''),
                    'sum': float(doc.get('sum', 0) or 0),
                    'customer': doc.get('customer', ''),
                    'raw_data': doc
                })
    except Exception as e:
        print(f"Error parsing XDTO: {str(e)}")
    
    return documents

def create_bitrix_deal(webhook_url: str, document: Dict) -> str:
    """Создание сделки в Битрикс24"""
    try:
        url = f"{webhook_url}crm.deal.add.json"
        
        data = {
            'fields': {
                'TITLE': f"Заказ {document['document_number']} от {document['document_date']}",
                'OPPORTUNITY': float(document['document_sum'] or 0),
                'CURRENCY_ID': 'RUB',
                'COMMENTS': f"Документ из 1С УНФ: {document['document_uid']}\nКонтрагент: {document['customer_name']}"
            }
        }
        
        response = requests.post(url, json=data, timeout=10)
        result = response.json()
        
        if result.get('result'):
            return str(result['result'])
        else:
            print(f"Bitrix error: {result}")
            return None
    except Exception as e:
        print(f"Error creating deal: {str(e)}")
        return None

def check_deal_exists(webhook_url: str, deal_id: str) -> bool:
    """Проверка существования сделки в Битрикс24"""
    try:
        url = f"{webhook_url}crm.deal.get.json"
        data = {'id': deal_id}
        
        response = requests.post(url, json=data, timeout=10)
        result = response.json()
        
        return bool(result.get('result'))
    except Exception as e:
        print(f"Error checking deal: {str(e)}")
        return False

def response_json(status_code: int, data: Dict) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }