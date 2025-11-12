'''
Business: Получение списка бизнес-процессов Битрикс24 с реальной статистикой из БД
Args: event с httpMethod, queryStringParameters (limit)
Returns: Список шаблонов БП с актуальной статистикой запусков из webhook_logs
'''
import json
import os
from typing import Dict, Any, List
import requests
import psycopg2
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters') or {}
    limit = int(params.get('limit', '50'))
    
    try:
        logs = get_timeline_logs(limit)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'logs': logs,
                'count': len(logs)
            }, ensure_ascii=False)
        }
    except Exception as e:
        print(f"[ERROR] Ошибка получения логов Timeline: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Ошибка получения логов Timeline'
            }, ensure_ascii=False)
        }

def get_db_bp_stats() -> Dict[str, Any]:
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        print("[DEBUG] DATABASE_URL не найден, статистика из БД недоступна")
        return {}
    
    try:
        conn = psycopg2.connect(dsn)
        cursor = conn.cursor()
        
        # Получаем статистику по БП "Дубли компании" (webhook_type = 'check_inn')
        cursor.execute("""
            SELECT 
                COUNT(*) as total_runs,
                COUNT(CASE WHEN duplicate_found THEN 1 END) as duplicates_found,
                MAX(created_at) as last_run,
                MIN(created_at) as first_run
            FROM t_p8980362_bitrix_webhook_handl.webhook_logs
            WHERE webhook_type = 'check_inn'
        """)
        
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if row:
            return {
                'template_id': '4',  # ID шаблона "Дубли компании"
                'total_runs': row[0] or 0,
                'duplicates_found': row[1] or 0,
                'last_run': row[2].isoformat() if row[2] else None,
                'first_run': row[3].isoformat() if row[3] else None
            }
    except Exception as e:
        print(f"[DEBUG] Ошибка получения статистики из БД: {e}")
        return {}
    
    return {}

def get_timeline_logs(limit: int) -> List[Dict[str, Any]]:
    webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_BP_WEBHOOK_URL или BITRIX24_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    print(f"[DEBUG] Используем webhook: {webhook_url[:50]}...")
    
    # Проверяем лог событий БП
    event_log_response = requests.post(
        f'{webhook_url}/bizproc.event.log.list',
        json={
            'order': {'ID': 'DESC'},
            'select': ['ID', 'CREATED', 'NAME', 'DESCRIPTION', 'WORKFLOW_ID']
        },
        timeout=30
    )
    
    print(f"[DEBUG] Event log API статус: {event_log_response.status_code}")
    if event_log_response.status_code == 200:
        event_log_data = event_log_response.json()
        print(f"[DEBUG] Event log первые записи: {event_log_data.get('result', [])[:3] if event_log_data.get('result') else 'Пусто'}")
    
    # Получаем список шаблонов БП
    templates_response = requests.post(
        f'{webhook_url}/bizproc.workflow.template.list',
        json={
            'SELECT': ['ID', 'NAME', 'DESCRIPTION', 'MODIFIED', 'USER_ID', 'DOCUMENT_TYPE']
        },
        timeout=30
    )
    
    templates_response.raise_for_status()
    templates_data = templates_response.json()
    
    if 'result' not in templates_data:
        raise Exception(f"Ошибка получения шаблонов: {templates_data.get('error_description', 'Неизвестная ошибка')}")
    
    templates = {t['ID']: t for t in templates_data.get('result', [])}
    print(f"[DEBUG] Получено шаблонов: {len(templates)}")
    
    # Пробуем получить ВСЕ экземпляры без фильтров
    all_instances_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instances',
        json={
            'select': ['ID', 'MODIFIED', 'STARTED', 'STARTED_BY', 'TEMPLATE_ID', 'WORKFLOW_STATUS', 'DOCUMENT_ID'],
            'order': {'ID': 'DESC'}
        },
        timeout=30
    )
    
    print(f"[DEBUG] Запрос ВСЕХ экземпляров: статус {all_instances_response.status_code}")
    
    instances = []
    if all_instances_response.status_code == 200:
        all_data = all_instances_response.json()
        print(f"[DEBUG] Ответ API: {all_data}")
        instances = all_data.get('result', [])
        print(f"[DEBUG] Всего найдено экземпляров БП: {len(instances)}")
        if instances:
            print(f"[DEBUG] Первые 3 экземпляра: {instances[:3]}")
    else:
        print(f"[DEBUG] Ошибка запроса: {all_instances_response.text[:500]}")
    print(f"[DEBUG] Получено экземпляров БП: {len(instances)}")
    
    if instances:
        print(f"[DEBUG] Первый экземпляр: {instances[0]}")
    
    # Получаем статистику из БД для БП "Дубли компании"
    db_stats = get_db_bp_stats()
    print(f"[DEBUG] Статистика из БД: {db_stats}")
    
    # Считаем статистику запусков для каждого шаблона из API
    template_stats = {}
    for instance in instances:
        template_id = instance.get('TEMPLATE_ID', '')
        if template_id not in template_stats:
            template_stats[template_id] = {
                'total': 0,
                'last_started': instance.get('STARTED', ''),
                'last_status': instance.get('WORKFLOW_STATUS', ''),
                'last_instance_id': instance.get('ID', '')
            }
        template_stats[template_id]['total'] += 1
    
    # Добавляем статистику из БД для template_id='4' ("Дубли компании")
    if db_stats and db_stats.get('total_runs', 0) > 0:
        template_stats[db_stats['template_id']] = {
            'total': db_stats['total_runs'],
            'last_started': db_stats['last_run'] or '',
            'last_status': 'completed',
            'last_instance_id': 'db_record'
        }
    
    print(f"[DEBUG] Общая статистика по шаблонам: {template_stats}")
    
    # Формируем список всех шаблонов со статистикой
    logs = []
    for template_id, template in list(templates.items())[:limit]:
        stats = template_stats.get(template_id)
        
        if stats:
            # Шаблон с историей запусков
            log = {
                'ID': template_id,
                'CREATED': stats['last_started'],
                'AUTHOR_ID': str(template.get('USER_ID', '')),
                'SETTINGS': {
                    'TITLE': template.get('NAME', 'Бизнес-процесс'),
                    'MESSAGE': f"Всего запусков: {stats['total']}",
                    'COMMENT': f"Последний запуск: {stats['last_started'][:10]} • Статус: {stats['last_status']}"
                },
                'ASSOCIATED_ENTITY_TYPE_ID': 'bizproc_template',
                'ASSOCIATED_ENTITY_ID': template_id,
                'STATS': {
                    'total_runs': stats['total'],
                    'last_run': stats['last_started'],
                    'has_history': True
                }
            }
        else:
            # Шаблон без запусков
            log = {
                'ID': f"template_{template_id}",
                'CREATED': template.get('MODIFIED', ''),
                'AUTHOR_ID': str(template.get('USER_ID', '')),
                'SETTINGS': {
                    'TITLE': template.get('NAME', 'Шаблон БП'),
                    'MESSAGE': f"Тип: {template.get('DOCUMENT_TYPE', ['', '', 'Неизвестно'])[2]}",
                    'COMMENT': template.get('DESCRIPTION', 'Этот бизнес-процесс ещё не запускался')
                },
                'ASSOCIATED_ENTITY_TYPE_ID': 'bizproc_template',
                'ASSOCIATED_ENTITY_ID': template_id,
                'STATS': {
                    'total_runs': 0,
                    'has_history': False
                }
            }
        logs.append(log)
    
    print(f"[DEBUG] Сформировано логов: {len(logs)}")
    
    return logs