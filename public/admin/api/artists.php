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
        if ($q !== '') {
            $sql = "SELECT t.artist,
                           MIN(t.cover) AS track_cover,
                           COUNT(*) AS tracks,
                           a.cover AS artist_cover,
                           a.bio AS bio
                    FROM tracks t
                    LEFT JOIN artists a ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
                    WHERE t.artist LIKE ?
                    GROUP BY t.artist, a.cover, a.bio
                    ORDER BY t.artist ASC
                    LIMIT 500";
            $st = $db->prepare($sql);
            $like = '%'.$q.'%';
            $st->execute([$like]);
            $rows = $st->fetchAll();
        } else {
            $rows = $db->query("SELECT t.artist,
                                       MIN(t.cover) AS track_cover,
                                       COUNT(*) AS tracks,
                                       a.cover AS artist_cover,
                                       a.bio AS bio
                                FROM tracks t
                                LEFT JOIN artists a ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
                                GROUP BY t.artist, a.cover, a.bio
                                ORDER BY t.artist ASC
                                LIMIT 200")->fetchAll();
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Read JSON body
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $action = isset($body['action']) ? (string)$body['action'] : '';

    if ($action === 'create') {
        $name = trim((string)($body['name'] ?? ''));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        if ($name === '') throw new Exception('Введите имя артиста');
        $st = $db->prepare('INSERT INTO artists (name, cover, bio) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio)');
        $st->execute([$name, $cover, $bio]);
        echo json_encode(['success'=>true]);
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
