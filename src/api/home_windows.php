<?php
require_once __DIR__ . '/../config/session_init.php';
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Требуется авторизация']);
    exit;
}

$trackCols = 'id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit';

function muzic2_home_cache_path(): string
{
    $dir = __DIR__ . '/../../tmp/cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir . '/home_windows_v1.json';
}

function muzic2_home_cache_read(int $ttlSec): ?string
{
    $path = muzic2_home_cache_path();
    if (!is_file($path)) {
        return null;
    }
    $mtime = @filemtime($path);
    if (!$mtime || (time() - $mtime) > $ttlSec) {
        return null;
    }
    $raw = @file_get_contents($path);
    return ($raw !== false && $raw !== '') ? $raw : null;
}

function muzic2_home_cache_write(string $json): void
{
    $path = muzic2_home_cache_path();
    @file_put_contents($path, $json, LOCK_EX);
}

/**
 * Одним запросом по списку id (вместо сотен SELECT ... WHERE id = ?).
 */
function muzic2_fetch_tracks_by_ids(PDO $pdo, string $cols, array $ids): array
{
    $ids = array_values(array_unique(array_map('intval', array_filter($ids))));
    if ($ids === []) {
        return [];
    }
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("SELECT $cols FROM tracks WHERE id IN ($ph)");
    $st->execute($ids);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Случайные треки: батч id + один IN-запрос (быстро на больших таблицах).
 */
function muzic2_random_tracks_fast(PDO $pdo, string $cols, int $need): array
{
    $stats = $pdo->query('SELECT MIN(id) AS mn, MAX(id) AS mx, COUNT(*) AS cnt FROM tracks')->fetch(PDO::FETCH_ASSOC);
    $cnt = (int)($stats['cnt'] ?? 0);
    if ($cnt === 0) {
        return [];
    }
    if ($cnt <= $need) {
        $stmt = $pdo->query("SELECT $cols FROM tracks ORDER BY id ASC");

        return $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    }
    $mn = (int)($stats['mn'] ?? 1);
    $mx = (int)($stats['mx'] ?? 1);
    if ($mn > $mx) {
        return [];
    }
    $cap = min(400, max(80, $need * 4));
    $ids = [];
    $guard = 0;
    while (count($ids) < $cap && $guard < $cap * 4) {
        $guard++;
        $ids[random_int($mn, $mx)] = true;
    }
    $rows = muzic2_fetch_tracks_by_ids($pdo, $cols, array_keys($ids));
    shuffle($rows);
    if (count($rows) >= $need) {
        return array_slice($rows, 0, $need);
    }
    $lim = max($need, 80);
    $st = $pdo->query("SELECT $cols FROM tracks ORDER BY id DESC LIMIT $lim");
    $fallback = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
    shuffle($fallback);

    return array_slice($fallback, 0, $need);
}

try {
    // Short cache for first-screen speedup, safe for all users (payload is non-personalized).
    $cached = muzic2_home_cache_read(25);
    if ($cached !== null) {
        echo $cached;
        exit;
    }

    $pdo = get_db_connection();

    $pool = muzic2_random_tracks_fast($pdo, $trackCols, 24);
    $tracks = array_slice($pool, 0, 8);
    $favorites = array_slice($pool, 8, 3);
    $mixes = array_slice($pool, 11, 3);

    $seenAlbums = [];
    $albums = [];
    foreach ($pool as $row) {
        $al = isset($row['album']) ? trim((string) $row['album']) : '';
        if ($al === '') {
            continue;
        }
        if (isset($seenAlbums[$al])) {
            continue;
        }
        $seenAlbums[$al] = true;
        $albums[] = [
            'album' => $al,
            'artist' => $row['artist'] ?? '',
            'album_type' => $row['album_type'] ?? '',
            'cover' => $row['cover'] ?? '',
        ];
        if (count($albums) >= 6) {
            break;
        }
    }
    if (count($albums) < 6) {
        // Без GROUP BY по всей таблице: последние строки + уникальность в PHP
        $st = $pdo->query("SELECT album, artist, album_type, cover FROM tracks WHERE album IS NOT NULL AND TRIM(album) <> '' ORDER BY id DESC LIMIT 150");
        $extra = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
        shuffle($extra);
        foreach ($extra as $row) {
            $al = trim((string) ($row['album'] ?? ''));
            if ($al === '' || isset($seenAlbums[$al])) {
                continue;
            }
            $seenAlbums[$al] = true;
            $albums[] = [
                'album' => $al,
                'artist' => $row['artist'] ?? '',
                'album_type' => $row['album_type'] ?? '',
                'cover' => $row['cover'] ?? '',
            ];
            if (count($albums) >= 6) {
                break;
            }
        }
    }

    $artists = [];
    try {
        $artStmt = $pdo->query('SELECT name AS artist, cover FROM artists LIMIT 80');
        $artPool = $artStmt ? $artStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        shuffle($artPool);
        $artists = array_slice($artPool, 0, 6);
    } catch (Throwable $e) {
        $artists = [];
    }

    if (count($artists) < 6) {
        $seenA = [];
        foreach ($artists as $a) {
            $nm = trim((string) ($a['artist'] ?? ''));
            if ($nm !== '') {
                $seenA[$nm] = true;
            }
        }
        $need = 6 - count($artists);
        $st = $pdo->query("SELECT artist, cover FROM tracks WHERE artist IS NOT NULL AND TRIM(artist) <> '' ORDER BY id DESC LIMIT 120");
        $taPool = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
        shuffle($taPool);
        foreach ($taPool as $row) {
            $nm = trim((string) ($row['artist'] ?? ''));
            if ($nm === '' || isset($seenA[$nm])) {
                continue;
            }
            $seenA[$nm] = true;
            $artists[] = $row;
            if (count($artists) >= 6) {
                break;
            }
        }
    }

    $payload = json_encode([
        'tracks' => $tracks,
        'albums' => $albums,
        'artists' => $artists,
        'favorites' => $favorites,
        'mixes' => $mixes,
    ]);
    if ($payload === false) {
        throw new RuntimeException('json_encode_failed');
    }
    muzic2_home_cache_write($payload);
    echo $payload;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
