# Исправление ошибки SSL на Windows

## Проблема
Ошибка `net:error_ssl_protocol` означает, что браузер пытается использовать HTTPS, а сервер работает по HTTP.

## Решение

### 1. Откройте сайт по HTTP адресу:
```
http://localhost:8888/muzic2/public/index.php
```

### 2. Если браузер автоматически перенаправляет на HTTPS:
- В адресной строке вручную введите `http://` вместо `https://`
- Или откройте `http://localhost:8888/muzic2/index.html` (упрощенная версия)

### 3. Очистите кэш браузера:
- Нажмите Ctrl+Shift+Delete
- Выберите "Все время"
- Очистите кэш и cookies

### 4. Если проблема повторяется:
- Откройте `http://localhost:8888/muzic2/index.html`
- Это упрощенная версия без PHP зависимостей

## Альтернативные адреса:
- `http://localhost:8888/muzic2/public/`
- `http://localhost:8888/muzic2/index.html`
- `http://127.0.0.1:8888/muzic2/public/index.php`
