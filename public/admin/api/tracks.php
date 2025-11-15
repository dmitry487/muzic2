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
    // Ensure optional video_url column exists (idempotent)
    try { $db->exec("ALTER TABLE tracks ADD COLUMN video_url VARCHAR(500) NULL"); } catch (Throwable $e) { /* ignore if exists */ }
    // Ensure explicit flag exists
    try { $db->exec("ALTER TABLE tracks ADD COLUMN explicit TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) { /* ignore if exists */ }
    // Ensure feats mapping table exists
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS track_artists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            track_id INT NOT NULL,
            artist VARCHAR(255) NOT NULL,
            role ENUM('primary','featured') NOT NULL DEFAULT 'featured',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_track_artist_role (track_id, artist, role)
        )");
    } catch (Throwable $e) {}
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
        // Attach feats
        try {
            if ($rows && count($rows)>0) {
                $ids = array_map(function($r){ return (int)$r['id']; }, $rows);
                $in = implode(',', array_fill(0, count($ids), '?'));
                $qs = $db->prepare("SELECT track_id, GROUP_CONCAT(artist ORDER BY artist SEPARATOR ', ') AS feats FROM track_artists WHERE role='featured' AND track_id IN ($in) GROUP BY track_id");
                $qs->execute($ids);
                $m = [];
                foreach ($qs as $rr) { $m[(int)$rr['track_id']] = (string)$rr['feats']; }
                foreach ($rows as &$r) { $r['feats'] = $m[(int)$r['id']] ?? ''; }
            }
        } catch (Throwable $e) {}
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
        $video_url = trim((string)($body['video_url'] ?? ''));
        $explicit = !empty($body['explicit']) ? 1 : 0;
        $type = in_array(($body['album_type'] ?? 'album'), ['album','ep','single']) ? $body['album_type'] : 'album';
        $dur = (int)($body['duration'] ?? 0);
        if ($title==='' || $artist==='' || $album==='' || $file==='') throw new Exception('Заполните обязательные поля');
        
        // Нормализуем путь к файлу - должен быть в формате tracks/music/filename.mp3
        function normalizeFilePath($path) {
            if (empty($path)) return '';
            
            // Нормализуем разделители
            $path = str_replace('\\', '/', $path);
            
            // Убираем ведущие слэши и /muzic2/
            $path = preg_replace('#^/+muzic2/+#', '', $path);
            $path = ltrim($path, '/');
            
            // Если путь уже начинается с tracks/, возвращаем как есть
            if (strpos($path, 'tracks/') === 0) {
                return $path;
            }
            
            // Если это абсолютный путь, извлекаем относительный
            $root = realpath(__DIR__ . '/../../../../');
            if ($root && (strpos($path, '/') === 0 || strpos($path, $root) === 0)) {
                $fullPath = realpath($path);
                if ($fullPath && strpos($fullPath, $root) === 0) {
                    $path = substr($fullPath, strlen($root) + 1);
                    // Если получили путь с tracks/, возвращаем
                    if (strpos($path, 'tracks/') === 0) {
                        return $path;
                    }
                }
            }
            
            // Пробуем найти tracks/ в пути
            $idx = strpos($path, 'tracks/');
            if ($idx !== false) {
                return substr($path, $idx);
            }
            
            // Если ничего не помогло, предполагаем что это имя файла в tracks/music/
            return 'tracks/music/' . basename($path);
        }
        
        $file = normalizeFilePath($file);
        
        // Проверяем и копируем файл в tracks/music/ если нужно
        $root = realpath(__DIR__ . '/../../../../');
        $targetPath = $root . '/' . $file;
        $targetDir = dirname($targetPath);
        
        // Если файл не находится в tracks/music/, копируем его туда
        if (strpos($file, 'tracks/music/') === 0) {
            // Путь уже правильный, проверяем существует ли файл
            if (!file_exists($targetPath)) {
                // Пробуем найти исходный файл по оригинальному пути
                $originalPath = trim((string)($body['file_path'] ?? ''));
                if ($originalPath && file_exists($originalPath)) {
                    // Создаем директорию если нужно
                    if (!is_dir($targetDir)) {
                        mkdir($targetDir, 0755, true);
                    }
                    // Копируем файл
                    if (!copy($originalPath, $targetPath)) {
                        throw new Exception('Не удалось скопировать файл');
                    }
                }
            }
        }
        
        $st = $db->prepare('INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover, video_url, explicit) VALUES (?,?,?,?,?,?,?,?,?)');
        $st->execute([$title,$artist,$album,$type,$dur,$file,$cover,$video_url,$explicit]);
        $newId = (int)$db->lastInsertId();
        // Save feats if provided
        $featsRaw = $body['feats'] ?? '';
        $featsArr = [];
        if (is_array($featsRaw)) { $featsArr = $featsRaw; }
        else { $featsArr = array_filter(array_map('trim', explode(',', (string)$featsRaw)), function($x){ return $x!==''; }); }
        if (!empty($featsArr)) {
            $ins = $db->prepare('INSERT IGNORE INTO track_artists (track_id, artist, role) VALUES (?,?,"featured")');
            foreach ($featsArr as $fa) { $ins->execute([$newId, $fa]); }
        }
        echo json_encode(['success'=>true, 'id'=>$newId]);
        exit;
    }

    if ($action === 'update') {
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) throw new Exception('Неверный ID');
        $fields = ['title','artist','album','album_type','duration','file_path','cover','video_url','explicit'];
        $set=[]; $params=[':id'=>$id];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) {
                $set[] = "$f = :$f";
                if ($f==='duration') { $params[":$f"] = (int)$body[$f]; }
                elseif ($f==='explicit') { $params[":$f"] = !empty($body[$f]) ? 1 : 0; }
                else { $params[":$f"] = trim((string)$body[$f]); }
            }
        }
        if (!$set) throw new Exception('Нечего сохранять');
        $st = $db->prepare('UPDATE tracks SET '.implode(',', $set).' WHERE id=:id');
        $st->execute($params);
        // Update feats if provided
        if (array_key_exists('feats', $body)) {
            $db->prepare('DELETE FROM track_artists WHERE track_id=? AND role="featured"')->execute([$id]);
            $featsRaw = $body['feats'];
            $featsArr = [];
            if (is_array($featsRaw)) { $featsArr = $featsRaw; }
            else { $featsArr = array_filter(array_map('trim', explode(',', (string)$featsRaw)), function($x){ return $x!==''; }); }
            if (!empty($featsArr)) {
                $ins = $db->prepare('INSERT IGNORE INTO track_artists (track_id, artist, role) VALUES (?,?,"featured")');
                foreach ($featsArr as $fa) { $ins->execute([$id, $fa]); }
            }
        }
        echo json_encode(['success'=>true]);
        exit;
    }

    if ($action === 'delete') {
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) throw new Exception('Неверный ID');
        try { $db->prepare('DELETE FROM track_artists WHERE track_id=?')->execute([$id]); } catch (Throwable $e) {}
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
