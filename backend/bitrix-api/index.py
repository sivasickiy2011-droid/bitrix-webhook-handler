"""
Business: Integrates with Bitrix24 API to fetch deal products and create purchases in smart process
Args: event - dict with httpMethod, queryStringParameters (deal_id), body (purchase data)
      context - object with request_id attribute
Returns: HTTP response with products list or purchase creation result
"""

import json
import os
from typing import Dict, Any, List
import urllib.request
import urllib.parse
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        bitrix_webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL', '')
        smart_process_id = os.environ.get('SMART_PROCESS_PURCHASES_ID', '')
        
        if not bitrix_webhook_url:
            return response_json(500, {
                'success': False,
                'error': 'BITRIX24_WEBHOOK_URL not configured'
            })
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
    except Exception as e:
        return response_json(500, {
            'success': False,
            'error': f'Initialization error: {str(e)}'
        })
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            deal_id = query_params.get('deal_id', '').strip()
            action = query_params.get('action', '')
            
            if action == 'list_purchases':
                cur.execute("""
                    SELECT * FROM purchases 
                    ORDER BY created_at DESC 
                    LIMIT 100
                """)
                purchases = cur.fetchall()
                
                return response_json(200, {
                    'success': True,
                    'purchases': [dict(p) for p in purchases]
                })
            
            if action == 'list_webhooks':
                cur.execute("""
                    SELECT * FROM purchase_webhooks 
                    ORDER BY created_at DESC 
                    LIMIT 100
                """)
                webhooks = cur.fetchall()
                
                return response_json(200, {
                    'success': True,
                    'webhooks': [dict(w) for w in webhooks]
                })
            
            if action == 'stats':
                stats = calculate_monthly_stats(cur)
                return response_json(200, {
                    'success': True,
                    'stats': stats
                })
            
            if action == 'test_connection':
                test_result = {
                    'success': True,
                    'webhook_configured': bool(bitrix_webhook_url),
                    'smart_process_configured': bool(smart_process_id),
                    'database_connected': True
                }
                
                if not bitrix_webhook_url:
                    test_result['success'] = False
                    test_result['error'] = 'BITRIX24_WEBHOOK_URL не настроен в секретах'
                elif not smart_process_id:
                    test_result['success'] = False
                    test_result['error'] = 'SMART_PROCESS_PURCHASES_ID не настроен в секретах'
                else:
                    try:
                        test_url = f"{bitrix_webhook_url}crm.deal.list.json?filter[ID]=1"
                        req = urllib.request.Request(test_url)
                        with urllib.request.urlopen(req, timeout=5) as response:
                            test_data = json.loads(response.read().decode('utf-8'))
                            if 'error' in test_data:
                                test_result['success'] = False
                                test_result['error'] = f'Ошибка Битрикс24: {test_data["error_description"]}'
                    except Exception as e:
                        test_result['success'] = False
                        test_result['error'] = f'Не удалось подключиться к Битрикс24: {str(e)}'
                
                return response_json(200, test_result)
            
            if action == 'get_deal_fields':
                fields = get_deal_fields(bitrix_webhook_url)
                
                if 'error' in fields:
                    return response_json(400, {
                        'success': False,
                        'error': fields['error']
                    })
                
                return response_json(200, {
                    'success': True,
                    'fields': fields['fields']
                })
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id parameter required'
                })
            
            products = get_deal_products(bitrix_webhook_url, deal_id)
            
            if 'error' in products:
                return response_json(400, {
                    'success': False,
                    'error': products['error']
                })
            
            return response_json(200, {
                'success': True,
                'products': products['products'],
                'total_items': len(products['products']),
                'deal_id': deal_id
            })
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'create_purchase')
            
            if action == 'create_purchase':
                deal_id = body_data.get('deal_id', '').strip()
                products = body_data.get('products', [])
                
                import sys
                print(f"DEBUG POST: deal_id={deal_id}, products count={len(products)}", file=sys.stderr)
                if products:
                    print(f"DEBUG: First product: {products[0]}", file=sys.stderr)
                else:
                    print(f"DEBUG: body_data keys: {list(body_data.keys())}", file=sys.stderr)
                    print(f"DEBUG: full body_data: {body_data}", file=sys.stderr)
                
                if not deal_id:
                    return response_json(400, {
                        'success': False,
                        'error': 'deal_id required'
                    })
                
                if not products:
                    return response_json(400, {
                        'success': False,
                        'error': 'products list required'
                    })
                
                if not smart_process_id:
                    return response_json(500, {
                        'success': False,
                        'error': 'SMART_PROCESS_PURCHASES_ID not configured'
                    })
                
                purchase_result = create_purchase_in_bitrix(
                    bitrix_webhook_url,
                    smart_process_id,
                    deal_id,
                    products
                )
                
                if 'error' in purchase_result:
                    return response_json(400, {
                        'success': False,
                        'error': purchase_result['error']
                    })
                
                purchase_id = purchase_result['purchase_id']
                total_amount = sum(p['total'] for p in products)
                products_json = json.dumps(products, ensure_ascii=False)
                
                cur.execute("""
                    INSERT INTO purchases 
                    (purchase_id, deal_id, title, status, products_count, total_amount, products_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    purchase_id,
                    deal_id,
                    f'Закупка по сделке #{deal_id}',
                    'new',
                    len(products),
                    total_amount,
                    products_json
                ))
                
                conn.commit()
                
                return response_json(200, {
                    'success': True,
                    'purchase_id': purchase_id,
                    'products_count': len(products),
                    'total_amount': total_amount
                })
        
        return response_json(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        conn.rollback()
        return response_json(500, {
            'success': False,
            'error': str(e)
        })
    finally:
        cur.close()
        conn.close()

def get_deal_products(webhook_url: str, deal_id: str) -> Dict[str, Any]:
    """Get products from Bitrix24 deal using crm.deal.productrows.get"""
    try:
        api_url = f"{webhook_url}crm.deal.productrows.get.json"
        params = {'id': deal_id}
        
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(api_url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if 'result' not in result:
            return {'error': 'Failed to fetch products from Bitrix24'}
        
        products = []
        for item in result['result']:
            product_type = int(item.get('TYPE', 1))  # 1 = товар, 4 = услуга
            products.append({
                'id': str(item.get('PRODUCT_ID', '')),
                'name': item.get('PRODUCT_NAME', 'Неизвестный товар'),
                'quantity': float(item.get('QUANTITY', 0)),
                'price': float(item.get('PRICE', 0)),
                'total': float(item.get('PRICE', 0)) * float(item.get('QUANTITY', 0)),
                'measure': item.get('MEASURE_NAME', 'шт'),
                'measureCode': int(item.get('MEASURE_CODE', 796)),
                'type': product_type,
                'isService': product_type == 4  # 4 = услуга
            })
        
        return {'products': products}
        
    except Exception as e:
        return {'error': f'Bitrix24 API error: {str(e)}'}

def get_deal_fields(webhook_url: str) -> Dict[str, Any]:
    """Get list of available deal fields from Bitrix24"""
    try:
        api_url = f"{webhook_url}crm.deal.fields.json"
        req = urllib.request.Request(api_url)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if 'error' in result:
            return {'error': f'Bitrix24 error: {result.get("error_description", result["error"])}'}
        
        if 'result' not in result:
            return {'error': 'Invalid Bitrix24 response'}
        
        fields = []
        for field_name, field_data in result['result'].items():
            fields.append({
                'name': field_name,
                'label': field_data.get('title', field_data.get('formLabel', field_name)),
                'type': field_data.get('type', 'string')
            })
        
        return {'fields': fields}
        
    except Exception as e:
        return {'error': f'Bitrix24 API error: {str(e)}'}

def create_purchase_in_bitrix(webhook_url: str, entity_type_id: str, deal_id: str, products: List[Dict]) -> Dict[str, Any]:
    """Create purchase in Bitrix24 smart process using crm.item.add"""
    try:
        api_url = f"{webhook_url}crm.item.add.json"
        
        total_amount = sum(p['total'] for p in products)
        products_text = '\n'.join([
            f"{i+1}. {p['name']} (ID: {p['id']}) - {p['quantity']} {p['measure']} x {p['price']} ₽ = {p['total']} ₽"
            for i, p in enumerate(products)
        ])
        
        # Создаём закупку с названием и привязкой к сделке
        title = f'Закупка по сделке #{deal_id} на сумму {total_amount:,.0f} ₽ ({len(products)} товаров)'
        
        params = {
            'entityTypeId': int(entity_type_id),
            'fields': {
                'title': title,
                'parentId2': int(deal_id),  # Привязываем к сделке
                'opportunity': total_amount  # Сумма закупки
            }
        }
        
        # Отправляем как JSON в теле запроса
        json_data = json.dumps(params).encode('utf-8')
        req = urllib.request.Request(
            api_url,
            data=json_data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if 'error' in result:
            error_msg = result.get('error_description', result.get('error', 'Unknown Bitrix24 error'))
            return {'error': f'Битрикс24: {error_msg}'}
        
        if 'result' not in result or 'item' not in result['result']:
            return {'error': f'Некорректный ответ Битрикс24: {json.dumps(result)}'}
        
        purchase_id = str(result['result']['item']['id'])
        
        # Добавляем товары через crm.item.productrow.set
        products_added = False
        try:
            print(f"DEBUG: Товаров для добавления: {len(products)}")
            
            # Формируем массив товарных позиций
            product_rows = []
            for idx, product in enumerate(products):
                row = {
                    'productName': product['name'],
                    'price': float(product['price']),
                    'quantity': float(product['quantity']),
                    'sort': (idx + 1) * 10
                }
                
                # Добавляем productId только если это товар из каталога
                if product['id'] and product['id'].isdigit() and int(product['id']) > 0:
                    row['productId'] = int(product['id'])
                
                product_rows.append(row)
            
            # Используем формат ownerType как "T" + entityTypeId (например "T1036")
            productrow_api_url = f"{webhook_url}crm.item.productrow.set.json"
            productrow_params = {
                'ownerType': f'T{entity_type_id}',  # Формат: T{entityTypeId} для смарт-процессов
                'ownerId': int(purchase_id),
                'productRows': product_rows
            }
            
            print(f"DEBUG: Устанавливаем товарные позиции: {json.dumps(productrow_params, ensure_ascii=False)}")
            
            productrow_data = json.dumps(productrow_params).encode('utf-8')
            productrow_req = urllib.request.Request(
                productrow_api_url,
                data=productrow_data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(productrow_req, timeout=10) as productrow_response:
                productrow_result = json.loads(productrow_response.read().decode('utf-8'))
                print(f"DEBUG: Результат установки товарных позиций: {json.dumps(productrow_result, ensure_ascii=False)}")
                
                if 'result' in productrow_result and productrow_result['result'].get('productRows'):
                    products_added = True
                    print(f"DEBUG: Успешно добавлено {len(productrow_result['result']['productRows'])} товарных позиций")
                    
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else ''
            print(f"ERROR: Ошибка добавления товаров HTTP {e.code}: {error_body}")
        except Exception as e:
            print(f"ERROR: Ошибка добавления товаров: {str(e)}")
        
        # Добавляем товары комментарием в таймлайн (так как productRows не работает для смарт-процессов)
        try:
            comment_text = f"📦 Товары из сделки #{deal_id}:\n\n{products_text}\n\n💰 Итого: {total_amount:,.0f} ₽"
            
            comment_api_url = f"{webhook_url}crm.timeline.comment.add.json"
            comment_params = {
                'fields': {
                    'ENTITY_ID': int(purchase_id),
                    'ENTITY_TYPE': f'dynamic_{entity_type_id}',
                    'COMMENT': comment_text
                }
            }
            
            comment_data = json.dumps(comment_params).encode('utf-8')
            comment_req = urllib.request.Request(
                comment_api_url,
                data=comment_data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(comment_req, timeout=10) as comment_response:
                comment_result = json.loads(comment_response.read().decode('utf-8'))
                print(f"DEBUG: Комментарий добавлен: {comment_result}")
        except Exception as e:
            print(f"ERROR: Не удалось добавить комментарий: {str(e)}")
        
        return {'purchase_id': purchase_id}
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('error_description', error_data.get('error', error_body))
        except:
            error_msg = error_body or str(e)
        return {'error': f'Битрикс24 HTTP {e.code}: {error_msg}'}
    except Exception as e:
        return {'error': f'Ошибка API: {str(e)}'}

def calculate_monthly_stats(cur) -> Dict[str, Any]:
    """Calculate purchase statistics for current and previous month"""
    
    cur.execute("""
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0) as total_amount
        FROM purchases
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    """)
    current = cur.fetchone()
    
    cur.execute("""
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0) as total_amount
        FROM purchases
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    """)
    previous = cur.fetchone()
    
    current_count = int(current['count'])
    current_amount = float(current['total_amount'])
    previous_count = int(previous['count'])
    previous_amount = float(previous['total_amount'])
    
    count_diff = current_count - previous_count
    amount_diff = current_amount - previous_amount
    
    count_percent = (count_diff / previous_count * 100) if previous_count > 0 else 0
    amount_percent = (amount_diff / previous_amount * 100) if previous_amount > 0 else 0
    
    return {
        'current_month': {
            'count': current_count,
            'total_amount': current_amount
        },
        'previous_month': {
            'count': previous_count,
            'total_amount': previous_amount
        },
        'difference': {
            'count': count_diff,
            'count_percent': round(count_percent, 2),
            'amount': amount_diff,
            'amount_percent': round(amount_percent, 2)
        }
    }

def response_json(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }