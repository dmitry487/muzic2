#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генерация LRC (в т.ч. покадрово по словам) из аудио + текста песни.

Подход:
1. faster-whisper с word_timestamps — даёт время начала/конца каждого распознанного слова.
2. Выравнивание вашего текста к цепочке слов Whisper (жадно + LCS), чтобы
   тайминги переносились на «правильные» слова из lyrics.
3. Запись в формате как в stranger_ULTRA_PRECISE.lrc:
   [mm:ss.xx] <mm:ss.xx>слово1 <mm:ss.xx>слово2 ...

Требования:
  pip install faster-whisper

Опционально (лучше выравнивание при опечатках/вариантах):
  pip install rapidfuzz

Пример:
  python scripts/generate_lrc.py --audio track.mp3 --lyrics lyrics.txt --out track.lrc
  python scripts/generate_lrc.py --audio track.mp3 --lyrics lyrics.txt --out track.lrc --model large-v3
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List, Tuple, Optional

# --- LRC time helpers ---------------------------------------------------------

def sec_to_lrc(t: float) -> str:
    """Seconds -> mm:ss.xx"""
    if t < 0:
        t = 0.0
    m = int(t // 60)
    s = t - m * 60
    return f"{m:02d}:{s:05.2f}"


def normalize_token(s: str) -> str:
    """Для сопоставления: нижний регистр, без пунктуации по краям."""
    s = s.strip().lower()
    s = re.sub(r"^[^\w\u0400-\u04FF]+|[^\w\u0400-\u04FF]+$", "", s, flags=re.UNICODE)
    return s


def tokenize_lyrics(text: str) -> List[str]:
    """Разбить текст на слова/токены (сохраняем пунктуацию как отдельные токены при необходимости)."""
    # Сохраняем слова и знаки как в оригинале, но режем по пробелам/переносам
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # слова + оставляем дефисы внутри слов
        parts = re.findall(r"\S+", line)
        if parts:
            lines.append(parts)
    return lines  # list of list of tokens per line


# --- Alignment: Whisper words -> lyrics lines ---------------------------------

def whisper_words_to_list(segments) -> List[Tuple[str, float, float]]:
    """Сегменты faster-whisper -> [(word, start, end), ...]"""
    out = []
    for seg in segments:
        if seg.words is None:
            continue
        for w in seg.words:
            word = (w.word or "").strip()
            if not word:
                continue
            out.append((word, float(w.start), float(w.end)))
    return out


def lcs_alignment(a: List[str], b: List[str]) -> List[Tuple[Optional[int], Optional[int]]]:
    """
    LCS-based alignment indices: pairs (i in a or None, j in b or None).
    Упрощённо: строим LCS и восстанавливаем пары индексов.
    """
    na, nb = len(a), len(b)
    # dp[i][j] = LCS length for a[:i], b[:j]
    dp = [[0] * (nb + 1) for _ in range(na + 1)]
    for i in range(1, na + 1):
        for j in range(1, nb + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    # backtrack
    pairs = []
    i, j = na, nb
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1]:
            pairs.append((i - 1, j - 1))
            i -= 1
            j -= 1
        elif j > 0 and (i == 0 or dp[i][j - 1] >= dp[i - 1][j]):
            pairs.append((None, j - 1))
            j -= 1
        else:
            pairs.append((i - 1, None))
            i -= 1
    pairs.reverse()
    return pairs


def align_line_to_whisper(
    line_tokens: List[str],
    whisper_norm: List[str],
    whisper_times: List[Tuple[float, float]],
    whisper_pos: int,
) -> Tuple[List[Tuple[str, float, float]], int]:
    """
    Выровнять одну строку lyrics к подпоследовательности whisper_words начиная с whisper_pos.
    Возвращает список (original_token, start, end) и новый whisper_pos.
    """
    if not line_tokens:
        return [], whisper_pos

    line_norm = [normalize_token(t) for t in line_tokens]
    # Берём окно whisper слов вперёд (эвристика: строка не длиннее 80 слов)
    window = 120
    end_pos = min(whisper_pos + window, len(whisper_norm))
    sub_whisper = whisper_norm[whisper_pos:end_pos]
    sub_times = whisper_times[whisper_pos:end_pos]

    pairs = lcs_alignment(sub_whisper, line_norm)
    # Собираем для каждого токена строки время: по совпадениям с whisper
    result = []
    w_idx = 0
    for token in line_tokens:
        n = normalize_token(token)
        if not n:
            # пунктуация — привязываем к предыдущему end
            if result:
                _, _, e = result[-1]
                result.append((token, e, e))
            else:
                t0 = sub_times[0][0] if sub_times else 0.0
                result.append((token, t0, t0))
            continue
        # найти следующее совпадение в pairs
        found = False
        while w_idx < len(pairs):
            wi, li = pairs[w_idx]
            if li is not None and wi is not None and sub_whisper[wi] == n:
                start, end = sub_times[wi]
                result.append((token, start, end))
                w_idx += 1
                found = True
                break
            w_idx += 1
        if not found:
            # нет совпадения — интерполяция между соседями
            if result:
                _, _, e = result[-1]
                result.append((token, e, e + 0.15))
            elif sub_times:
                t0 = sub_times[0][0]
                result.append((token, t0, t0 + 0.15))
            else:
                result.append((token, 0.0, 0.15))

    # Сдвигаем whisper_pos: по последнему использованному индексу whisper
    # приблизительно — сколько whisper слов «съели»
    used = 0
    for wi, li in pairs:
        if wi is not None:
            used = max(used, wi + 1)
    new_pos = whisper_pos + used
    return result, new_pos


def build_enhanced_lrc_line(word_times: List[Tuple[str, float, float]]) -> str:
    """Одна строка LRC: [start] <t1>w1 <t2>w2 ..."""
    if not word_times:
        return ""
    line_start = word_times[0][1]
    parts = [f"[{sec_to_lrc(line_start)}]"]
    # Whisper обычно ставит метку "когда услышал", из-за чего слово чуть запаздывает.
    # Компенсируем это для всех токенов после первого в строке.
    # В примере ожидается сдвиг на 0.10 секунды (100 ms).
    lag_compensation_sec = 0.10
    for i, (token, start, end) in enumerate(word_times):
        ts = start if i == 0 else max(0.0, start - lag_compensation_sec)
        parts.append(f"<{sec_to_lrc(ts)}>{token}")
    return " ".join(parts)


def transcribe_and_build_lrc(
    audio_path: Path,
    lyrics_path: Path,
    model_size: str = "medium",
    device: str = "cpu",
    compute_type: str = "int8",
    language: Optional[str] = None,
    initial_prompt: Optional[str] = None,
) -> str:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("Установите: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)

    lyrics_text = lyrics_path.read_text(encoding="utf-8")
    line_token_lists = tokenize_lyrics(lyrics_text)

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    # initial_prompt помогает Whisper ближе к вашему тексту
    prompt = initial_prompt or lyrics_text[:200]

    segments, info = model.transcribe(
        str(audio_path),
        language=language,
        word_timestamps=True,
        initial_prompt=prompt,
        vad_filter=True,
    )

    whisper_list = whisper_words_to_list(segments)
    if not whisper_list:
        # fallback: только сегменты без слов
        lines_out = []
        for seg in segments:
            t = seg.text.strip()
            if t:
                lines_out.append(f"[{sec_to_lrc(seg.start)}]{t}")
        return "\n".join(lines_out) + "\n"

    whisper_norm = [normalize_token(w) for w, _, _ in whisper_list]
    whisper_times = [(a, b) for _, a, b in whisper_list]

    out_lines = []
    pos = 0
    for line_tokens in line_token_lists:
        word_times, pos = align_line_to_whisper(line_tokens, whisper_norm, whisper_times, pos)
        if word_times:
            out_lines.append(build_enhanced_lrc_line(word_times))

    return "\n".join(out_lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description="Генерация LRC из аудио + текста (word timestamps)")
    ap.add_argument("--audio", "-a", required=True, help="Путь к аудио (mp3/wav/...)")
    ap.add_argument("--lyrics", "-l", required=True, help="Файл с текстом построчно")
    ap.add_argument("--out", "-o", required=True, help="Куда записать .lrc")
    ap.add_argument("--model", default="medium", help="Размер модели Whisper (tiny..large-v3)")
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"], help="Устройство")
    ap.add_argument("--compute-type", default="int8", help="int8, float16, float32 (для GPU лучше float16)")
    ap.add_argument("--language", default=None, help="Код языка, напр. ru — иначе авто")
    ap.add_argument("--ar", default="", help="Тег [ar: ...]")
    ap.add_argument("--ti", default="", help="Тег [ti: ...]")
    args = ap.parse_args()

    audio_path = Path(args.audio).resolve()
    lyrics_path = Path(args.lyrics).resolve()
    out_path = Path(args.out).resolve()

    if not audio_path.is_file():
        print(f"Нет файла: {audio_path}", file=sys.stderr)
        sys.exit(1)
    if not lyrics_path.is_file():
        print(f"Нет файла: {lyrics_path}", file=sys.stderr)
        sys.exit(1)

    body = transcribe_and_build_lrc(
        audio_path,
        lyrics_path,
        model_size=args.model,
        device=args.device,
        compute_type=args.compute_type,
        language=args.language,
    )

    header = []
    if args.ar:
        header.append(f"[ar: {args.ar}]")
    if args.ti:
        header.append(f"[ti: {args.ti}]")
    header.append("[by: generate_lrc.py faster-whisper]")
    header.append("")

    out_path.write_text("\n".join(header) + body, encoding="utf-8")
    print(f"Записано: {out_path}")


if __name__ == "__main__":
    main()
