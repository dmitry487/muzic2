# Инструкция по переносу проекта Muzic2

## Варианты переноса

### Вариант 1: Через GitHub (рекомендуется)
Код хранится в GitHub. Медиа файлы — через Git LFS или внешнее хранилище. База — авто-инициализация + экспорт/импорт скриптами.

### Вариант 2: Общая база данных
Настраиваем общую базу данных для всех устройств.

---

## Вариант 1: Перенос через GitHub

### Шаг 1: Подготовка на исходном устройстве

1. **Инициализируйте репозиторий и подключите LFS (один раз):**
```bash
cd /Applications/MAMP/htdocs/muzic2
git init
git lfs install
```

2. **Включите LFS для медиа (уже добавлено в .gitattributes):**
```bash
git add .gitattributes .gitignore
git commit -m "chore: add Git LFS config"
```

3. **Закоммитьте проект и запушьте в GitHub:**
```bash
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

### Шаг 2: Установка на новом устройстве

1. **Установите MAMP и Git LFS:**
   - Скачайте MAMP с официального сайта
   - Установите Git и Git LFS (`brew install git git-lfs`), затем `git lfs install`

2. **Клонируйте репозиторий:**
```bash
cd /Applications/MAMP/htdocs
git clone git@github.com:<you>/<repo>.git muzic2
cd muzic2
git lfs pull
```

3. **Инициализируйте базу данных автоматически:**
```bash
/Applications/MAMP/bin/php/*/bin/php scripts/setup_db.php
```

4. **Настройте подключение к БД:**
   - Откройте `src/config/db.php`
   - Убедитесь, что настройки подключения правильные:
```php
$host = 'localhost';
$port = 8889; // или ваш порт MySQL
$dbname = 'muzic2';
$username = 'root';
$password = 'root'; // или ваш пароль
```

5. **(Опционально) Импортируйте данные из экспорта:**
```bash
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php import data/changes/latest.json
```

6. **Проверьте права доступа:**
```bash
chmod -R 755 /Applications/MAMP/htdocs/muzic2
chmod -R 777 /Applications/MAMP/htdocs/muzic2/tracks/
```

### Шаг 3: Проверка работоспособности

1. Запустите MAMP
2. Откройте http://localhost:8888/muzic2/public/
3. Проверьте:
   - Главная страница загружается
   - Треки воспроизводятся
   - Видео работают
   - Поиск функционирует
   - Админ-панель доступна

---

## Вариант 2: Общая база данных

### Настройка на сервере (VPS/хостинг)

1. **Создайте базу данных на сервере:**
```sql
CREATE DATABASE muzic2;
CREATE USER 'muzic2_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON muzic2.* TO 'muzic2_user'@'%';
FLUSH PRIVILEGES;
```

2. **Импортируйте схему и данные:**
```bash
mysql -h your-server.com -u muzic2_user -p muzic2 < db/schema.sql
mysql -h your-server.com -u muzic2_user -p muzic2 < db/seed.sql
mysql -h your-server.com -u muzic2_user -p muzic2 < insert_tracks.sql
```

### Настройка на каждом устройстве

1. **Обновите конфигурацию БД:**
```php
// src/config/db.php
$host = 'your-server.com';
$port = 3306;
$dbname = 'muzic2';
$username = 'muzic2_user';
$password = 'strong_password';
```

2. **Настройте общее хранилище медиа:**
   - Вариант A: Общая папка (SMB/NFS)
   - Вариант B: Облачное хранилище (S3, Google Drive)
   - Вариант C: FTP-сервер

3. **Обновите пути к медиа:**
```php
// В файлах API обновите пути к медиа
$mediaBaseUrl = 'https://your-cdn.com/muzic2/';
```

---

## Синхронизация изменений

### Автоматическая синхронизация через GitHub
1. Коммитим кодовые изменения и метаданные в GitHub
2. Медиа файлы — через Git LFS (push/pull)
3. Данные БД — через экспорт/импорт JSON:
```bash
# На устройстве-источнике
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php export
mv muzic2_export_*.json data/changes/latest.json
git add data/changes/latest.json
git commit -m "data: update seed export"
git push

# На целевом устройстве
git pull
/Applications/MAMP/bin/php/*/bin/php scripts/setup_db.php
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php import data/changes/latest.json
```

### Ручная синхронизация (если используете локальные БД)

1. **Экспорт изменений:**
```bash
# Скрипт для экспорта изменений с определенной даты
php scripts/export_changes.php --since="2024-01-01"
```

2. **Импорт изменений:**
```bash
# Скрипт для импорта изменений на другое устройство
php scripts/import_changes.php --file="changes_export.json"
```

---

## Устранение проблем

### Проблема: Видео не воспроизводятся
**Решение:**
1. Проверьте права доступа к папке `tracks/`
2. Убедитесь, что файлы видео существуют
3. Проверьте настройки MAMP (порты, права)

### Проблема: База данных не подключается
**Решение:**
1. Проверьте настройки в `src/config/db.php`
2. Убедитесь, что MySQL запущен
3. Проверьте логи MAMP

### Проблема: Медиа файлы не загружаются
**Решение:**
1. Проверьте пути к файлам
2. Убедитесь, что файлы скопированы
3. Проверьте права доступа

### Проблема: Кодировка (кириллица)
**Решение:**
1. Убедитесь, что БД использует UTF-8
2. Проверьте настройки PHP (mbstring)
3. Проверьте заголовки HTTP

---

## Рекомендации

1. **Регулярные бэкапы:**
   - Автоматический бэкап БД каждый день
   - Бэкап медиа файлов каждую неделю

2. **Версионирование:**
   - Используйте Git для кода
   - Не коммитьте медиа файлы в Git

3. **Мониторинг:**
   - Следите за логами ошибок
   - Мониторьте использование диска

4. **Безопасность:**
   - Используйте сильные пароли
   - Ограничьте доступ к админ-панели
   - Регулярно обновляйте зависимости

---

## Контакты для поддержки

Если возникли проблемы:
1. Проверьте логи в `public/admin/admin_api.log`
2. Проверьте логи MAMP
3. Убедитесь, что все файлы скопированы правильно
4. Проверьте права доступа к файлам и папкам
