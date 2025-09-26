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
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        if ($q !== '') {
            $st=$db->prepare('SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? ORDER BY id DESC LIMIT 500');
            $like = '%'.$q.'%';
            $st->execute([$like,$like,$like]);
            $rows = $st->fetchAll();
        } else {
            $rows=$db->query('SELECT * FROM tracks ORDER BY id DESC LIMIT 200')->fetchAll();
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = file_get_contents('php://input');
    admin_log(['method'=>$method,'raw'=>$raw]);
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $action = $body['action'] ?? '';

    if ($action === 'create') {
        $title = trim((string)($body['title'] ?? ''));
        $artist = trim((string)($body['artist'] ?? ''));
        $album = trim((string)($body['album'] ?? ''));
        $file = trim((string)($body['file_path'] ?? ''));
        $cover = trim((string)($body['cover'] ?? ''));
        $type = in_array(($body['album_type'] ?? 'album'), ['album','ep','single']) ? $body['album_type'] : 'album';
        $dur = (int)($body['duration'] ?? 0);
        if ($title==='' || $artist==='' || $album==='' || $file==='') throw new Exception('Заполните обязательные поля');
        $st = $db->prepare('INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover) VALUES (?,?,?,?,?,?,?)');
        $st->execute([$title,$artist,$album,$type,$dur,$file,$cover]);
        echo json_encode(['success'=>true, 'id'=>$db->lastInsertId()]);
        exit;
    }

    if ($action === 'update') {
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) throw new Exception('Неверный ID');
        $fields = ['title','artist','album','album_type','duration','file_path','cover'];
        $set=[]; $params=[':id'=>$id];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $set[] = "$f = :$f";
                $params[":$f"] = $f==='duration' ? (int)$body[$f] : trim((string)$body[$f]);
            }
        }
        if (!$set) throw new Exception('Нечего сохранять');
        $st = $db->prepare('UPDATE tracks SET '.implode(',', $set).' WHERE id=:id');
        $st->execute($params);
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'delete') {
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) throw new Exception('Неверный ID');
        $st = $db->prepare('DELETE FROM tracks WHERE id=?');
        $st->execute([$id]);
        echo json_encode(['success'=>true]);
        exit;
    }

    throw new Exception('Неизвестное действие');
} catch (Throwable $e) {
    admin_log(['error'=>$e->getMessage(), 'trace'=>$e->getTraceAsString()]);
    http_response_code(400);
    echo json_encode(['success'=>false, 'message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
