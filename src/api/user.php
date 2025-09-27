<?php
// Auto-detect Windows and use optimized version
// Check multiple ways to detect Windows
$isWindows = (
    strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ||
    strpos(strtoupper(PHP_OS), 'WINDOWS') !== false ||
    strpos(strtoupper(php_uname('s')), 'WINDOWS') !== false
);

if ($isWindows) {
    include __DIR__ . '/user_windows.php';
    exit;
}

// Original Mac version below
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_SESSION['user_id'] ?? null;
    if (!$user_id) { echo json_encode(['authenticated' => false]); exit; }

    $db = get_db_connection();
    $stmt = $db->prepare('SELECT id, email, username FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    echo json_encode(['authenticated' => true, 'user' => $user]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);
?>








