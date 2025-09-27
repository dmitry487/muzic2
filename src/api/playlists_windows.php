<?php
// Оптимизированная версия playlists.php для Windows
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
    echo json_encode([]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Простой запрос без сложных JOIN
        $playlists = $db->query("SELECT id, name, is_public, cover FROM playlists WHERE user_id = $user_id")->fetchAll();
        echo json_encode($playlists);
    } catch (Exception $e) {
        echo json_encode([]);
    }
} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['name'])) {
        try {
            $name = $db->quote($input['name']);
            $is_public = $input['is_public'] ? 1 : 0;
            $cover = isset($input['cover']) ? $db->quote($input['cover']) : 'NULL';
            
            $db->exec("INSERT INTO playlists (user_id, name, is_public, cover) VALUES ($user_id, $name, $is_public, $cover)");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    }
} else if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['playlist_id'])) {
        try {
            $playlist_id = $input['playlist_id'];
            $db->exec("DELETE FROM playlists WHERE id = $playlist_id AND user_id = $user_id");
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false]);
        }
    }
}
?>
