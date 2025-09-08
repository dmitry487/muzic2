<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $db = get_db_connection();

    // Ensure artists table exists
    $db->exec('CREATE TABLE IF NOT EXISTS artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        cover VARCHAR(255),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

        // Base query grouped by original artist string from tracks
        $baseSql = "SELECT t.artist,
                           MIN(t.cover) AS track_cover,
                           COUNT(*) AS tracks,
                           a.cover AS artist_cover,
                           a.bio AS bio
                    FROM tracks t
                    LEFT JOIN artists a ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))";
        $params = [];
        if ($q !== '') { $baseSql .= " WHERE t.artist LIKE ?"; $params[] = '%'.$q.'%'; }
        $baseSql .= " GROUP BY t.artist, a.cover, a.bio ORDER BY t.artist ASC LIMIT " . ($q !== '' ? '500' : '200');

        $st = $db->prepare($baseSql);
        $st->execute($params);
        $rawRows = $st->fetchAll();

        // Split composite names (commas, &, x, feat/ft) into separate artists and aggregate
        $agg = [];
        foreach ($rawRows as $r) {
            $names = preg_split('/\s*(?:,|&| x |\bfeat\.?\b|\bft\.?\b)\s*/iu', (string)$r['artist']);
            foreach ($names as $name) {
                $name = trim($name);
                if ($name === '') continue;
                $key = mb_strtolower($name);
                if (!isset($agg[$key])) {
                    $agg[$key] = [
                        'artist' => $name,
                        'track_cover' => $r['track_cover'],
                        'artist_cover' => $r['artist_cover'],
                        'bio' => $r['bio'],
                        'tracks' => 0
                    ];
                }
                $agg[$key]['tracks'] += (int)$r['tracks'];
                // Prefer artist_cover, else keep any existing, else track_cover
                if (empty($agg[$key]['artist_cover']) && !empty($r['artist_cover'])) $agg[$key]['artist_cover'] = $r['artist_cover'];
                if (empty($agg[$key]['track_cover']) && !empty($r['track_cover'])) $agg[$key]['track_cover'] = $r['track_cover'];
                if (empty($agg[$key]['bio']) && !empty($r['bio'])) $agg[$key]['bio'] = $r['bio'];
            }
        }
        // Reindex to array
        $rows = array_values($agg);

        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Read JSON body
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $action = isset($body['action']) ? (string)$body['action'] : '';

    if ($action === 'create') {
        $rawName = trim((string)($body['name'] ?? ''));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        if ($rawName === '') throw new Exception('Введите имя артиста');

        // Split composite names like "Kai Angel, 9mice" or "Artist x Artist" or with feat/ft/&
        $parts = preg_split('/\s*(?:,|&| x |\bfeat\.?\b|\bft\.?\b)\s*/iu', $rawName);
        $parts = array_filter(array_map(function($s){ return trim($s); }, $parts), function($s){ return $s !== ''; });
        if (empty($parts)) { $parts = [$rawName]; }

        $st = $db->prepare('INSERT INTO artists (name, cover, bio) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio)');
        foreach ($parts as $name) {
            $st->execute([$name, $cover, $bio]);
        }
        echo json_encode(['success'=>true, 'created'=>count($parts)]);
        exit;
    }

    if ($action === 'update') {
        $name = trim((string)($body['name'] ?? ''));
        $name_new = trim((string)($body['name_new'] ?? $name));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        if ($name === '') throw new Exception('Введите текущее имя артиста');
        $db->beginTransaction();
        if (strcasecmp($name, $name_new) !== 0) {
            $st = $db->prepare('UPDATE tracks SET artist = ? WHERE TRIM(LOWER(artist)) = TRIM(LOWER(?))');
            $st->execute([$name_new, $name]);
        }
        $st = $db->prepare('INSERT INTO artists (name, cover, bio) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio)');
        $st->execute([$name_new, $cover, $bio]);
        $db->commit();
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'delete') {
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') throw new Exception('Введите имя артиста');
        $st = $db->prepare('DELETE FROM artists WHERE TRIM(LOWER(name)) = TRIM(LOWER(?))');
        $st->execute([$name]);
        echo json_encode(['success'=>true]);
        exit;
    }

    throw new Exception('Неизвестное действие');
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
