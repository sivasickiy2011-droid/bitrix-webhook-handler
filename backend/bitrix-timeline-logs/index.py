'''
Business: Получение списка бизнес-процессов Битрикс24 через REST API
Args: event с httpMethod, queryStringParameters (limit)
Returns: Список запущенных БП или шаблонов БП если нет активных экземпляров
'''
import json
import os
from typing import Dict, Any, List
import requests

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
    print(f"[DEBUG] Получено шаблонов: {len(templates)}")
    
    # Получаем список всех экземпляров БП (активные + завершённые)
    instances_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instances',
        json={
            'select': ['ID', 'MODIFIED', 'STARTED', 'STARTED_BY', 'TEMPLATE_ID', 'WORKFLOW_STATUS', 'DOCUMENT_ID'],
            'order': {'STARTED': 'DESC'},
            'filter': {'>STARTED_BY': 0}
        },
        timeout=30
    )
    
    print(f"[DEBUG] Статус ответа instances: {instances_response.status_code}")
    
    if instances_response.status_code != 200:
        print(f"[DEBUG] Текст ответа: {instances_response.text[:500]}")
        raise Exception(f'Ошибка запроса к API: HTTP {instances_response.status_code}')
    
    data = instances_response.json()
    
    print(f"[DEBUG] Полный ответ API: {data}")
    
    if 'error' in data:
        raise Exception(f"Ошибка API Битрикс24: {data.get('error_description', 'Неизвестная ошибка')}")
    
    instances = data.get('result', [])
    print(f"[DEBUG] Получено экземпляров БП: {len(instances)}")
    
    if instances:
        print(f"[DEBUG] Первый экземпляр: {instances[0]}")
    
    # Преобразуем экземпляры БП в формат для отображения
    logs = []
    
    if instances:
        for instance in instances[:limit]:
            template_id = instance.get('TEMPLATE_ID', '')
            template = templates.get(template_id, {})
            
            log = {
                'ID': instance.get('ID', ''),
                'CREATED': instance.get('STARTED', instance.get('MODIFIED', '')),
                'AUTHOR_ID': str(instance.get('STARTED_BY', '')),
                'SETTINGS': {
                    'TITLE': template.get('NAME', 'Бизнес-процесс'),
                    'MESSAGE': f"Статус: {instance.get('WORKFLOW_STATUS', 'неизвестен')}",
                    'COMMENT': f"Документ: {instance.get('DOCUMENT_ID', 'N/A')}"
                },
                'ASSOCIATED_ENTITY_TYPE_ID': 'bizproc',
                'ASSOCIATED_ENTITY_ID': template_id
            }
            logs.append(log)
    else:
        # Если нет запущенных БП, показываем доступные шаблоны
        print(f"[DEBUG] Нет экземпляров БП, показываем шаблоны")
        for template_id, template in list(templates.items())[:limit]:
            log = {
                'ID': f"template_{template_id}",
                'CREATED': template.get('MODIFIED', ''),
                'AUTHOR_ID': str(template.get('USER_ID', '')),
                'SETTINGS': {
                    'TITLE': template.get('NAME', 'Шаблон БП'),
                    'MESSAGE': f"Тип: {template.get('DOCUMENT_TYPE', ['', '', 'Неизвестно'])[2]}",
                    'COMMENT': template.get('DESCRIPTION', 'Шаблон бизнес-процесса (не запущен)')
                },
                'ASSOCIATED_ENTITY_TYPE_ID': 'bizproc_template',
                'ASSOCIATED_ENTITY_ID': template_id
            }
            logs.append(log)
    
    print(f"[DEBUG] Сформировано логов: {len(logs)}")
    
    return logs