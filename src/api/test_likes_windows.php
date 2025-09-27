<?php
// Простая тестовая версия likes.php для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все ошибки
error_reporting(0);
ini_set('display_errors', 0);

session_start();

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) { 
    echo json_encode(['tracks' => [], 'albums' => []]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Пробуем подключиться к базе данных
        require_once __DIR__ . '/../config/db.php';
        $db = get_db_connection();
        
        // Простые запросы
        $tracks = $db->query("SELECT track_id as id FROM likes WHERE user_id = $user_id")->fetchAll();
        $albums = $db->query("SELECT album_title, artist FROM album_likes WHERE user_id = $user_id")->fetchAll();
        
        echo json_encode([
            'tracks' => $tracks,
            'albums' => $albums
        ]);
    } catch (Exception $e) {
        echo json_encode(['tracks' => [], 'albums' => []]);
    }
} else {
    // Для POST/DELETE возвращаем успех
    echo json_encode(['success' => true]);
}
?>
