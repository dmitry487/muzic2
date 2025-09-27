<?php
// Оптимизированная версия user.php для Windows
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все лишние проверки для скорости
error_reporting(0);
ini_set('display_errors', 0);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_SESSION['user_id'] ?? null;
    
    if ($user_id) {
        try {
            $db = get_db_connection();
            $stmt = $db->prepare('SELECT id, username, email FROM users WHERE id = ?');
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();
            
            if ($user) {
                echo json_encode([
                    'authenticated' => true,
                    'user' => $user
                ]);
            } else {
                echo json_encode(['authenticated' => false]);
            }
        } catch (Exception $e) {
            echo json_encode(['authenticated' => false]);
        }
    } else {
        echo json_encode(['authenticated' => false]);
    }
} else {
    echo json_encode(['authenticated' => false]);
}
?>
