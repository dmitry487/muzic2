<?php
// Оптимизированная версия likes.php для Windows
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все лишние проверки для скорости
error_reporting(0);
ini_set('display_errors', 0);

$db = get_db_connection();
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) { 
    echo json_encode(['tracks' => [], 'albums' => []]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Простые запросы без сложных JOIN
        $tracks = $db->query("SELECT track_id as id FROM likes WHERE user_id = $user_id")->fetchAll();
        $albums = $db->query("SELECT album_title, artist FROM album_likes WHERE user_id = $user_id")->fetchAll();
        
        echo json_encode([
            'tracks' => $tracks,
            'albums' => $albums
        ]);
    } catch (Exception $e) {
        echo json_encode(['tracks' => [], 'albums' => []]);
    }
} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['track_id'])) {
        // Лайк трека
        try {
            $db->exec("INSERT OR IGNORE INTO likes (user_id, track_id) VALUES ($user_id, {$input['track_id']})");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    } else if (isset($input['album_title'])) {
        // Лайк альбома
        try {
            $album_title = $db->quote($input['album_title']);
            $artist = $db->quote($input['artist'] ?? '');
            $db->exec("INSERT OR IGNORE INTO album_likes (user_id, album_title, artist) VALUES ($user_id, $album_title, $artist)");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    }
} else if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['track_id'])) {
        // Удаление лайка трека
        try {
            $db->exec("DELETE FROM likes WHERE user_id = $user_id AND track_id = {$input['track_id']}");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    } else if (isset($input['album_title'])) {
        // Удаление лайка альбома
        try {
            $album_title = $db->quote($input['album_title']);
            $artist = $db->quote($input['artist'] ?? '');
            $db->exec("DELETE FROM album_likes WHERE user_id = $user_id AND album_title = $album_title AND artist = $artist");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    }
}
?>
