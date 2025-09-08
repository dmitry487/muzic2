<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $db = get_db_connection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        if ($q !== '') {
            $st = $db->prepare('SELECT album, MIN(artist) AS artist, MIN(album_type) AS album_type, MIN(cover) AS cover, COUNT(*) AS track_count FROM tracks WHERE album LIKE ? GROUP BY album ORDER BY album ASC LIMIT 500');
            $st->execute(['%'.$q.'%']);
            $rows = $st->fetchAll();
        } else {
            $rows = $db->query('SELECT album, MIN(artist) AS artist, MIN(album_type) AS album_type, MIN(cover) AS cover, COUNT(*) AS track_count FROM tracks GROUP BY album ORDER BY album ASC LIMIT 200')->fetchAll();
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $action = $body['action'] ?? '';

    if ($action === 'update') {
        $album = trim((string)($body['album'] ?? ''));
        $album_new = trim((string)($body['album_new'] ?? ''));
        $artist = isset($body['artist']) ? trim((string)$body['artist']) : null;
        $cover = isset($body['cover']) ? trim((string)$body['cover']) : null;
        $type = isset($body['album_type']) && in_array($body['album_type'], ['album','ep','single']) ? $body['album_type'] : null;

        if ($album === '' && $album_new === '') {
            throw new Exception('Введите текущее или новое название альбома');
        }

        // Target album to apply updates to (supports creating/updating when current is empty)
        $target = $album !== '' ? $album : $album_new;

        $db->beginTransaction();
        if ($artist !== null) { $st = $db->prepare('UPDATE tracks SET artist=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$artist, $target]); }
        if ($cover !== null)  { $st = $db->prepare('UPDATE tracks SET cover=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))');  $st->execute([$cover,  $target]); }
        if ($type  !== null)  { $st = $db->prepare('UPDATE tracks SET album_type=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))'); $st->execute([$type,   $target]); }
        // If renaming an existing album
        if ($album !== '' && $album_new !== '' && strcasecmp($album, $album_new) !== 0) {
            $st = $db->prepare('UPDATE tracks SET album=? WHERE TRIM(LOWER(album))=TRIM(LOWER(?))');
            $st->execute([$album_new, $album]);
        }
        $db->commit();
        echo json_encode(['success'=>true]);
        exit;
    }

    throw new Exception('Неизвестное действие');
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
