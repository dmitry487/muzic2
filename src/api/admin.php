<?php
// Admin API for quick content management
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'stats';
    
    if ($action === 'stats') {
        // Get statistics
        $tracks = $db->query('SELECT COUNT(*) as count FROM tracks')->fetch()['count'];
        $albums = $db->query('SELECT COUNT(DISTINCT album) as count FROM tracks')->fetch()['count'];
        $artists = $db->query('SELECT COUNT(DISTINCT artist) as count FROM tracks WHERE artist IS NOT NULL')->fetch()['count'];
        $users = $db->query('SELECT COUNT(*) as count FROM users')->fetch()['count'];
        
        echo json_encode([
            'tracks' => $tracks,
            'albums' => $albums,
            'artists' => $artists,
            'users' => $users
        ]);
        exit;
    }
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    if ($action === 'add_track') {
        $title = trim($data['title'] ?? '');
        $artist = trim($data['artist'] ?? '');
        $album = trim($data['album'] ?? '');
        $duration = intval($data['duration'] ?? 0);
        $cover = trim($data['cover'] ?? '');
        $albumType = in_array(($data['album_type'] ?? 'album'), ['album','ep','single']) ? $data['album_type'] : 'album';
        $filePath = trim($data['file_path'] ?? ($data['audio'] ?? ''));
        
        if (!$title || !$artist || !$filePath) {
            http_response_code(400);
            echo json_encode(['error' => 'Название, артист и файл аудио обязательны']);
            exit;
        }
        
        try {
            // Insert track
            $stmt = $db->prepare('
                INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([$title, $artist, $album, $albumType, $duration, $filePath, $cover]);
            
            $trackId = $db->lastInsertId();
            
            // track_artists table is not used in current schema
            
            echo json_encode(['success' => true, 'id' => $trackId]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Ошибка добавления трека: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'add_album') {
        $title = trim($data['title'] ?? '');
        $artist = trim($data['artist'] ?? '');
        $albumType = in_array(($data['album_type'] ?? 'album'), ['album','ep','single']) ? $data['album_type'] : 'album';
        $cover = trim($data['cover'] ?? '');
        
        if (!$title || !$artist) {
            http_response_code(400);
            echo json_encode(['error' => 'Название и артист обязательны']);
            exit;
        }
        
        try {
            // Create minimal placeholder track so album appears in listings
            $stmt = $db->prepare('
                INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute(['Intro', $artist, $title, $albumType, 0, 'tracks/music/placeholder.mp3', $cover]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Ошибка добавления альбома: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'add_artist') {
        $name = trim($data['name'] ?? '');
        $genre = trim($data['genre'] ?? '');
        $country = trim($data['country'] ?? '');
        $avatar = trim($data['avatar'] ?? '');
        $description = trim($data['description'] ?? '');
        
        if (!$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Имя артиста обязательно']);
            exit;
        }
        
        try {
            // Check if artist exists
            $checkStmt = $db->prepare('SELECT COUNT(*) as count FROM tracks WHERE artist = ?');
            $checkStmt->execute([$name]);
            $exists = $checkStmt->fetch()['count'] > 0;
            
            if ($exists) {
                echo json_encode(['success' => true, 'message' => 'Артист уже существует в базе']);
                exit;
            }
            
            // Create a sample track for the artist (no track_artists table)
            $stmt = $db->prepare('
                INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                'Добро пожаловать - ' . $name,
                $name,
                'Сборник',
                'album',
                180,
                '/muzic2/public/assets/audio/placeholder.mp3',
                $avatar
            ]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Ошибка добавления артиста: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'bulk_add_tracks') {
        $tracks = $data['tracks'] ?? [];
        
        if (empty($tracks)) {
            http_response_code(400);
            echo json_encode(['error' => 'Нет треков для добавления']);
            exit;
        }
        
        $added = 0;
        $errors = [];
        
        foreach ($tracks as $track) {
            try {
                $albumType = in_array(($track['album_type'] ?? 'album'), ['album','ep','single']) ? $track['album_type'] : 'album';
                $filePath = $track['file_path'] ?? ($track['audio'] ?? '/muzic2/public/assets/audio/placeholder.mp3');
                $stmt = $db->prepare('
                    INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ');
                $stmt->execute([
                    $track['title'] ?? 'Без названия',
                    $track['artist'] ?? 'Неизвестный артист',
                    $track['album'] ?? '',
                    $albumType,
                    $track['duration'] ?? 180,
                    $filePath,
                    $track['cover'] ?? ''
                ]);
                
                $added++;
            } catch (Exception $e) {
                $errors[] = $track['title'] . ': ' . $e->getMessage();
            }
        }
        
        echo json_encode([
            'success' => true,
            'added' => $added,
            'total' => count($tracks),
            'errors' => $errors
        ]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);
?>
