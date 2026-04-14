<?php
header('Content-Type: application/json');
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Ультра-быстрая версия для Windows
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['playlists' => []]);
    exit;
}

try {
    require_once __DIR__ . '/../config/db.php';
    $pdo = get_db_connection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Create playlist
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Название плейлиста обязательно']);
            exit;
        }
        $stmt = $pdo->prepare("INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, 0)");
        $stmt->execute([$_SESSION['user_id'], $name]);
        echo json_encode(['success' => true, 'playlist_id' => $pdo->lastInsertId()]);
        exit;
    }
    
    // Delete playlist
    if ($method === 'DELETE') {
        $playlist_id = $_GET['playlist_id'] ?? null;
        if (!$playlist_id) {
            http_response_code(400);
            echo json_encode(['error' => 'playlist_id обязателен']);
            exit;
        }
        // Ensure ownership
        $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ? LIMIT 1");
        $stmt->execute([$playlist_id, $_SESSION['user_id']]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'Нет доступа к плейлисту']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?");
        $stmt->execute([$playlist_id]);
        $stmt = $pdo->prepare("DELETE FROM playlists WHERE id = ? AND user_id = ?");
        $stmt->execute([$playlist_id, $_SESSION['user_id']]);
        echo json_encode(['success' => true]);
        exit;
    }
    
    // Простой запрос без JOIN + создаём "Любимые треки" если нет
    $stmt = $pdo->prepare("SELECT id, name, cover FROM playlists WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Проверяем есть ли "Любимые треки", если нет — создаём
    $hasFavorites = false;
    foreach ($playlists as $pl) {
        if (strtolower(trim($pl['name'])) === 'любимые треки') {
            $hasFavorites = true;
            break;
        }
    }
    if (!$hasFavorites) {
        try {
            $stmt = $pdo->prepare("INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, 0)");
            $stmt->execute([$_SESSION['user_id'], 'Любимые треки']);
            $newId = $pdo->lastInsertId();
            if ($newId) {
                array_unshift($playlists, ['id' => $newId, 'name' => 'Любимые треки', 'cover' => null, 'track_count' => 0]);
            }
        } catch (Exception $e) {
            // Игнорируем ошибки создания
        }
    }
    
    // Добавляем количество треков (упрощенно)
    foreach ($playlists as &$playlist) {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?");
        $stmt->execute([$playlist['id']]);
        $playlist['track_count'] = $stmt->fetch()['count'];
    }
    
    echo json_encode(['playlists' => $playlists]);
    
} catch (Exception $e) {
    echo json_encode(['playlists' => []]);
}
?>
