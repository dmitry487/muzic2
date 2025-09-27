<?php
// Windows-optimized likes API - minimal checks for speed
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) { 
    echo json_encode(['tracks' => [], 'albums' => []]); 
    exit; 
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Windows: Ensure album_likes table exists
    $createTable = "CREATE TABLE IF NOT EXISTS album_likes (
        user_id INT,
        album_title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, album_title)
    )";
    $db->exec($createTable);
    
    // Windows: Simple liked tracks - minimal data for speed
    $stmt = $db->prepare('SELECT t.id, t.title, t.artist, t.cover FROM likes l JOIN tracks t ON l.track_id = t.id WHERE l.user_id = ? LIMIT 20');
    $stmt->execute([$user_id]);
    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Windows: Simple liked albums - minimal data for speed
    $albumStmt = $db->prepare('SELECT album_title FROM album_likes WHERE user_id = ? LIMIT 20');
    $albumStmt->execute([$user_id]);
    $albums = $albumStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['tracks' => $tracks, 'albums' => $albums]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $track_id = $data['track_id'] ?? null;
    $album_title = $data['album_title'] ?? null;
    
    if ($track_id) {
        // Windows: Simple track like - no playlist logic for speed
        $stmt = $db->prepare('INSERT IGNORE INTO likes (user_id, track_id) VALUES (?, ?)');
        $stmt->execute([$user_id, $track_id]);
    } elseif ($album_title) {
        // Windows: Simple album like - no table creation for speed
        $stmt = $db->prepare('INSERT IGNORE INTO album_likes (user_id, album_title) VALUES (?, ?)');
        $stmt->execute([$user_id, $album_title]);
    }
    
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $track_id = $data['track_id'] ?? null;
    $album_title = $data['album_title'] ?? null;
    
    if ($track_id) {
        // Windows: Simple track unlike - no playlist logic for speed
        $stmt = $db->prepare('DELETE FROM likes WHERE user_id = ? AND track_id = ?');
        $stmt->execute([$user_id, $track_id]);
    } elseif ($album_title) {
        // Windows: Simple album unlike
        $stmt = $db->prepare('DELETE FROM album_likes WHERE user_id = ? AND album_title = ?');
        $stmt->execute([$user_id, $album_title]);
    }
    
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['error' => 'Invalid method']);
?>
