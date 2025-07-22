<?php
session_start();
require_once __DIR__ . '/../config/db.php';

$db = get_db_connection();

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];

if ($method === 'GET') {
    // Получить все плейлисты пользователя
    $stmt = $db->prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$user_id]);
    $playlists = $stmt->fetchAll();
    echo json_encode(['playlists' => $playlists]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST' && preg_match('#/add$#', $path)) {
    // Добавить трек в плейлист
    $playlist_id = $data['playlist_id'] ?? null;
    $track_id = $data['track_id'] ?? null;
    if (!$playlist_id || !$track_id) {
        http_response_code(400);
        echo json_encode(['error' => 'playlist_id и track_id обязательны']);
        exit;
    }
    // Проверка владельца плейлиста
    $stmt = $db->prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?');
    $stmt->execute([$playlist_id, $user_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Нет доступа к плейлисту']);
        exit;
    }
    // Определяем позицию
    $stmt = $db->prepare('SELECT MAX(position) AS max_pos FROM playlist_tracks WHERE playlist_id = ?');
    $stmt->execute([$playlist_id]);
    $pos = ($stmt->fetch()['max_pos'] ?? 0) + 1;
    // Добавляем
    $stmt = $db->prepare('INSERT IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)');
    $stmt->execute([$playlist_id, $track_id, $pos]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'POST' && preg_match('#/remove$#', $path)) {
    // Удалить трек из плейлиста
    $playlist_id = $data['playlist_id'] ?? null;
    $track_id = $data['track_id'] ?? null;
    if (!$playlist_id || !$track_id) {
        http_response_code(400);
        echo json_encode(['error' => 'playlist_id и track_id обязательны']);
        exit;
    }
    // Проверка владельца плейлиста
    $stmt = $db->prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?');
    $stmt->execute([$playlist_id, $user_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Нет доступа к плейлисту']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?');
    $stmt->execute([$playlist_id, $track_id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'POST') {
    // Создать новый плейлист
    $name = trim($data['name'] ?? '');
    $is_public = !empty($data['is_public']);
    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'Имя плейлиста обязательно']);
        exit;
    }
    $stmt = $db->prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)');
    $stmt->execute([$user_id, $name, $is_public]);
    echo json_encode(['success' => true, 'playlist_id' => $db->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']); 