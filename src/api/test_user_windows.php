<?php
// Простая тестовая версия user.php для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все ошибки
error_reporting(0);
ini_set('display_errors', 0);

session_start();

$user_id = $_SESSION['user_id'] ?? null;

if ($user_id) {
    try {
        // Пробуем подключиться к базе данных
        require_once __DIR__ . '/../config/db.php';
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
?>
