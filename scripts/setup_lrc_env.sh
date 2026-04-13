#!/usr/bin/env bash
# Создаёт .venv в корне проекта и ставит faster-whisper для generate_lrc.py
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "Создаю .venv в $ROOT ..."
  python3 -m venv .venv
fi

echo "Активирую .venv и ставлю зависимости (нужен интернет)..."
# shellcheck source=/dev/null
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-lrc.txt

echo ""
echo "Готово. Дальше всегда:"
echo "  source .venv/bin/activate"
echo "  python scripts/generate_lrc.py -a трек.mp3 -l текст.txt -o трек.lrc --language ru"
echo ""
echo "Или одной строкой без активации:"
echo "  .venv/bin/python scripts/generate_lrc.py -a ... -l ... -o ..."
