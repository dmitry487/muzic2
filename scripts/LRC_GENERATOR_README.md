# Генератор LRC из аудио + текста

## Установка (один раз)

Из корня проекта:

```bash
chmod +x scripts/setup_lrc_env.sh
./scripts/setup_lrc_env.sh
```

Или вручную:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-lrc.txt
```

Нужны **Python 3.8+** и **ffmpeg** (для декодирования аудио). На macOS:

```bash
brew install ffmpeg
```

## Запуск

```bash
source .venv/bin/activate
python scripts/generate_lrc.py \
  -a "tracks/music/трек.mp3" \
  -l "tracks/music/lyrics.txt" \
  -o "tracks/music/трек.lrc" \
  --language ru \
  --ar "Исполнитель" \
  --ti "Название"
```

Без активации venv:

```bash
.venv/bin/python scripts/generate_lrc.py -a трек.mp3 -l lyrics.txt -o трек.lrc --language ru
```

## Файл с текстом

- Кодировка **UTF-8**
- **Построчно** как в песне (каждая строка LRC = строка в файле)
- Пустые строки игнорируются

## Модели

Первый запуск скачает модель Whisper (интернет). Быстрее — `--model small`, точнее — `--model large-v3`. На GPU: `--device cuda --compute-type float16`.
