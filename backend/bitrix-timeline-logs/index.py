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
    print(f"[DEBUG] Получено шаблонов БП: {len(templates)}")
    
    # Используем bizproc.workflow.instance.list для получения ПОЛНОЙ истории (не только активных)
    instances_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instance.list',
        json={
            'select': ['ID', 'STARTED', 'STARTED_BY', 'TEMPLATE_ID', 'MODIFIED', 'WORKFLOW_STATE', 'DOCUMENT_ID', 'MODULE_ID', 'ENTITY'],
            'order': {'STARTED': 'DESC'},
            'filter': {'>STARTED_BY': '0'}  # Только запущенные пользователями
        },
        timeout=30
    )
    
    print(f"[DEBUG] Запрос instance.list статус: {instances_response.status_code}")
    
    instances = []
    if instances_response.status_code == 200:
        instances_data = instances_response.json()
        instances = instances_data.get('result', [])
        print(f"[DEBUG] Получено экземпляров БП из instance.list: {len(instances)}")
        if instances:
            print(f"[DEBUG] Первый экземпляр: ID={instances[0].get('ID')}, TEMPLATE_ID={instances[0].get('TEMPLATE_ID')}, STARTED={instances[0].get('STARTED')}")
    else:
        print(f"[DEBUG] Ошибка instance.list: {instances_response.text[:300]}")
    
    # Получаем задачи БП для дополнительной проверки истории
    tasks_response = requests.post(
        f'{webhook_url}/bizproc.task.list',
        json={
            'select': ['ID', 'WORKFLOW_ID', 'WORKFLOW_TEMPLATE_ID', 'WORKFLOW_TEMPLATE_NAME', 'WORKFLOW_STARTED', 'WORKFLOW_STARTED_BY', 'MODIFIED'],
            'order': {'WORKFLOW_STARTED': 'DESC'}
        },
        timeout=30
    )
    
    tasks = []
    if tasks_response.status_code == 200:
        tasks_data = tasks_response.json()
        tasks = tasks_data.get('result', [])
        print(f"[DEBUG] Получено задач БП: {len(tasks)}")
        if tasks:
            print(f"[DEBUG] Первая задача: WORKFLOW_TEMPLATE_ID={tasks[0].get('WORKFLOW_TEMPLATE_ID')}, WORKFLOW_STARTED={tasks[0].get('WORKFLOW_STARTED')}")
    
    # Получаем статистику из БД для БП "Дубли компании"
    db_stats = get_db_bp_stats()
    print(f"[DEBUG] Статистика из БД: {db_stats}")
    
    # Находим реальный ID шаблона "Дубли компании" в Битрикс24
    duplicates_template_id = None
    for tid, tdata in templates.items():
        template_name = tdata.get('NAME', '').lower()
        if 'дубл' in template_name:
            duplicates_template_id = tid
            print(f"[DEBUG] Используем реальный ID шаблона Дубли компании: {duplicates_template_id}")
            break
    
    # Считаем статистику запусков для каждого шаблона из instance.list
    template_stats = {}
    for instance in instances:
        template_id = instance.get('TEMPLATE_ID', '') or instance.get('WORKFLOW_TEMPLATE_ID', '')
        if not template_id:
            continue
            
        if template_id not in template_stats:
            template_stats[template_id] = {
                'total': 0,
                'last_started': instance.get('STARTED', ''),
                'last_status': instance.get('WORKFLOW_STATE', {}).get('STATE_NAME', 'completed') if isinstance(instance.get('WORKFLOW_STATE'), dict) else 'completed',
                'last_instance_id': instance.get('ID', ''),
                'instances': []
            }
        template_stats[template_id]['total'] += 1
        template_stats[template_id]['instances'].append({
            'id': instance.get('ID'),
            'started': instance.get('STARTED'),
            'started_by': instance.get('STARTED_BY')
        })
    
    # Дополняем статистику из задач БП (если instance.list пустой)
    for task in tasks:
        template_id = task.get('WORKFLOW_TEMPLATE_ID', '')
        if not template_id or template_id in template_stats:
            continue
        
        template_stats[template_id] = {
            'total': 1,
            'last_started': task.get('WORKFLOW_STARTED', ''),
            'last_status': 'completed',
            'last_instance_id': task.get('WORKFLOW_ID', ''),
            'instances': [{
                'id': task.get('WORKFLOW_ID'),
                'started': task.get('WORKFLOW_STARTED'),
                'started_by': task.get('WORKFLOW_STARTED_BY')
            }]
        }
    
    # Добавляем статистику из БД для найденного шаблона "Дубли компании"
    if db_stats and db_stats.get('total_runs', 0) > 0 and duplicates_template_id:
        # Объединяем данные из БД с данными из API
        existing_stats = template_stats.get(duplicates_template_id, {'total': 0, 'instances': []})
        template_stats[duplicates_template_id] = {
            'total': max(db_stats['total_runs'], existing_stats.get('total', 0)),
            'last_started': db_stats['last_run'] or existing_stats.get('last_started', ''),
            'last_status': 'completed',
            'last_instance_id': existing_stats.get('last_instance_id', 'db_record'),
            'instances': existing_stats.get('instances', []),
            'db_duplicates_found': db_stats.get('duplicates_found', 0)
        }
    
    print(f"[DEBUG] Общая статистика по шаблонам: {template_stats}")
    for tid, stats in template_stats.items():
        print(f"[DEBUG] Шаблон {tid}: {stats['total']} запусков, последний: {stats['last_started']}")
    
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
                    'has_history': True,
                    'instances': stats.get('instances', []),
                    'db_duplicates_found': stats.get('db_duplicates_found', 0)
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