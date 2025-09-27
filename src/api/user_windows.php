<?php
// Windows-optimized user API - minimal checks for speed
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_SESSION['user_id'] ?? null;
    if (!$user_id) { 
        echo json_encode(['authenticated' => false]); 
        exit; 
    }

    // Windows: Simple user query - minimal data for speed
    $db = get_db_connection();
    $stmt = $db->prepare('SELECT id, username FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    echo json_encode(['authenticated' => true, 'user' => $user]);
    exit;
}

echo json_encode(['error' => 'Invalid method']);
?>
