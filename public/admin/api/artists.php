<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json; charset=utf-8');

function admin_log($message){
    try {
        $file = __DIR__ . '/../admin_api.log';
        $prefix = '['.date('Y-m-d H:i:s').'] ' . ($_SERVER['REQUEST_URI'] ?? '') . ' ';
        if (is_array($message) || is_object($message)) { $message = json_encode($message, JSON_UNESCAPED_UNICODE); }
        @file_put_contents($file, $prefix . $message . "\n", FILE_APPEND);
    } catch (Throwable $e) {}
}

try {
    $db = get_db_connection();

    // Ensure artists table exists
    $db->exec('CREATE TABLE IF NOT EXISTS artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        cover VARCHAR(255),
        bio TEXT,
        promo_video VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    
    // Add promo_video column if it doesn't exist
    try {
        $db->exec("ALTER TABLE artists ADD COLUMN promo_video VARCHAR(500) DEFAULT NULL");
    } catch (Throwable $e) {
        // Column already exists, ignore
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        if ($q !== '') {
            // List artists from artists table including those without tracks
            $sql = "SELECT a.name AS artist,
                           a.cover AS artist_cover,
                           a.bio AS bio,
                           a.promo_video AS promo_video,
                           COUNT(t.id) AS tracks,
                           MIN(t.cover) AS track_cover
                    FROM artists a
                    LEFT JOIN tracks t ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
                    WHERE a.name LIKE ?
                    GROUP BY a.name, a.cover, a.bio, a.promo_video
                    ORDER BY a.name ASC
                    LIMIT 500";
            $st = $db->prepare($sql);
            $like = '%'.$q.'%';
            $st->execute([$like]);
            $rows = $st->fetchAll();
        } else {
            $rows = $db->query("SELECT a.name AS artist,
                                       a.cover AS artist_cover,
                                       a.bio AS bio,
                                       a.promo_video AS promo_video,
                                       COUNT(t.id) AS tracks,
                                       MIN(t.cover) AS track_cover
                                FROM artists a
                                LEFT JOIN tracks t ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
                                GROUP BY a.name, a.cover, a.bio, a.promo_video
                                ORDER BY a.name ASC
                                LIMIT 200")->fetchAll();
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Read JSON body
    $raw = file_get_contents('php://input');
    admin_log(['method'=>$_SERVER['REQUEST_METHOD'] ?? '','raw'=>$raw]);
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $action = isset($body['action']) ? (string)$body['action'] : '';

    if ($action === 'create') {
        $name = trim((string)($body['name'] ?? ''));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        $promoVideo = trim((string)($body['promo_video'] ?? ''));
        if ($name === '') throw new Exception('Введите имя артиста');
        $st = $db->prepare('INSERT INTO artists (name, cover, bio, promo_video) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio), promo_video=VALUES(promo_video)');
        $st->execute([$name, $cover, $bio, $promoVideo]);
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'update') {
        $name = trim((string)($body['name'] ?? ''));
        $name_new = trim((string)($body['name_new'] ?? $name));
        $cover = trim((string)($body['cover'] ?? ''));
        $bio = trim((string)($body['bio'] ?? ''));
        $promoVideo = trim((string)($body['promo_video'] ?? ''));
        if ($name === '') throw new Exception('Введите текущее имя артиста');
        $db->beginTransaction();
        if (strcasecmp($name, $name_new) !== 0) {
            $st = $db->prepare('UPDATE tracks SET artist = ? WHERE TRIM(LOWER(artist)) = TRIM(LOWER(?))');
            $st->execute([$name_new, $name]);
        }
        $st = $db->prepare('INSERT INTO artists (name, cover, bio, promo_video) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE cover=VALUES(cover), bio=VALUES(bio), promo_video=VALUES(promo_video)');
        $st->execute([$name_new, $cover, $bio, $promoVideo]);
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
    admin_log(['error'=>$e->getMessage(), 'trace'=>$e->getTraceAsString()]);
    http_response_code(400);
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
