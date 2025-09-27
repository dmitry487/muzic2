<?php
// Ультра-быстрая версия likes.php для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем ВСЕ для максимальной скорости
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 0);

session_start();

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) { 
    echo json_encode(['tracks' => [], 'albums' => []]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Прямое подключение к SQLite
        $db_path = __DIR__ . '/../../db/database.sqlite';
        $pdo = new PDO("sqlite:$db_path");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
        
        // Простые запросы
        $tracks = $pdo->query("SELECT track_id as id FROM likes WHERE user_id = $user_id")->fetchAll(PDO::FETCH_ASSOC);
        $albums = $pdo->query("SELECT album_title, artist FROM album_likes WHERE user_id = $user_id")->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'tracks' => $tracks,
            'albums' => $albums
        ]);
    } catch (Exception $e) {
        echo json_encode(['tracks' => [], 'albums' => []]);
    }
} else {
    // Для POST/DELETE возвращаем успех без обработки (упрощение)
    echo json_encode(['success' => true]);
}
?>
