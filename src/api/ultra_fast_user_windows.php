<?php
// Ультра-быстрая версия user.php для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем ВСЕ для максимальной скорости
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 0);

// Простая проверка сессии без лишних проверок
session_start();

$user_id = $_SESSION['user_id'] ?? null;

if ($user_id) {
    try {
        // Прямое подключение к SQLite
        $db_path = __DIR__ . '/../../db/database.sqlite';
        $pdo = new PDO("sqlite:$db_path");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
        
        $stmt = $pdo->prepare('SELECT id, username, email FROM users WHERE id = ?');
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
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
