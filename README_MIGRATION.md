# 🚀 Инструкция по переносу Muzic2

## ✅ Готово! Все скрипты созданы и протестированы

### 📁 Созданные файлы:
- `MIGRATION_GUIDE.md` - подробная инструкция
- `QUICK_START.md` - быстрый старт
- `scripts/setup_db.php` - авто-импорт БД
- `scripts/quick_migrate.php` - быстрый экспорт/импорт
- `scripts/export_changes.php` - экспорт изменений
- `scripts/import_changes.php` - импорт изменений
- `scripts/sync_media.sh` - синхронизация медиа

---

## 🎯 Самый простой способ переноса (через GitHub)

### 1️⃣ На исходном устройстве:
```bash
cd /Applications/MAMP/htdocs/muzic2
git add . && git commit -m "update" && git push

# Экспорт текущих данных БД в JSON, добавление в репозиторий
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php export
mv muzic2_export_*.json data/changes/latest.json
git add data/changes/latest.json && git commit -m "data: seed update" && git push
```

### 2️⃣ На новом устройстве:
```bash
# 1. Установите MAMP и Git LFS (brew install git git-lfs && git lfs install)
# 2. Клонируйте репозиторий в /Applications/MAMP/htdocs/
# 3. Скачайте LFS-файлы: git lfs pull

cd /Applications/MAMP/htdocs/muzic2
/Applications/MAMP/bin/php/*/bin/php scripts/setup_db.php
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php import data/changes/latest.json
/Applications/MAMP/bin/php/*/bin/php scripts/quick_migrate.php check
```

---

## 🔄 Для постоянной синхронизации

### Вариант A: Общая база данных (рекомендуется)
1. Создайте MySQL на VPS/хостинге
2. Обновите `src/config/db.php` на всех устройствах
3. Все изменения будут видны сразу на всех устройствах

### Вариант B: Синхронизация через GitHub
```bash
# Экспорт изменений с определенной даты и коммит в репозиторий
/Applications/MAMP/bin/php/*/bin/php scripts/export_changes.php --since="2024-01-01" > data/changes/changes_export.json
git add data/changes/changes_export.json && git commit -m "data: export since 2024-01-01" && git push

# Импорт на другом устройстве
git pull
/Applications/MAMP/bin/php/*/bin/php scripts/import_changes.php --file="data/changes/changes_export.json"

# Медиа тянутся через Git LFS (git lfs pull)
```

---

## ✅ Проверка работоспособности

После переноса откройте:
- http://localhost:8888/muzic2/public/ - главная страница
- http://localhost:8888/muzic2/public/admin/ - админ-панель

Проверьте:
- ✅ Воспроизведение треков
- ✅ Видео режим
- ✅ Поиск
- ✅ Добавление новых треков в админке

---

## 🛠️ Команды для проверки

```bash
# Проверка состояния БД и файлов
/Applications/MAMP/bin/php/php8.2.20/bin/php scripts/quick_migrate.php check

# Экспорт всех данных
/Applications/MAMP/bin/php/php8.2.20/bin/php scripts/quick_migrate.php export

# Импорт данных
/Applications/MAMP/bin/php/php8.2.20/bin/php scripts/quick_migrate.php import файл.json

# Справка по командам
/Applications/MAMP/bin/php/php8.2.20/bin/php scripts/quick_migrate.php help
```

---

## ⚠️ Важные моменты

1. **Права доступа:**
   ```bash
   chmod -R 755 /Applications/MAMP/htdocs/muzic2
   chmod -R 777 /Applications/MAMP/htdocs/muzic2/tracks/
   ```

2. **Медиа файлы:** Должны быть в папке `tracks/` с правильными путями

3. **Кодировка:** БД должна использовать UTF-8

4. **Порты MAMP:** Проверьте настройки в `src/config/db.php`

---

## 🎉 Готово!

Теперь вы можете:
- ✅ Переносить проект на любое устройство
- ✅ Синхронизировать изменения между устройствами
- ✅ Сохранять все функции и данные
- ✅ Автоматически настраивать БД при первом запуске

**Все функции сохранены и работают!** 🚀
