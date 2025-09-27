<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
$artist = $_GET['artist'] ?? '';

if (empty($artist)) {
    echo json_encode(['error' => 'Artist name required']);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Простой запрос для артиста
    $stmt = $pdo->prepare("SELECT DISTINCT artist, cover FROM tracks WHERE artist = ? LIMIT 1");
    $stmt->execute([$artist]);
    $artistInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$artistInfo) {
        echo json_encode(['error' => 'Artist not found']);
        exit;
    }
    
    // Альбомы артиста (упрощенно)
    $stmt = $pdo->prepare("SELECT DISTINCT album, album_type, cover FROM tracks WHERE artist = ? AND album IS NOT NULL");
    $stmt->execute([$artist]);
    $albums = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Треки артиста (только первые 20)
    $stmt = $pdo->prepare("SELECT id, title, album, album_type, duration, file_path, cover FROM tracks WHERE artist = ? LIMIT 20");
    $stmt->execute([$artist]);
    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'artist' => $artistInfo,
        'albums' => $albums,
        'tracks' => $tracks
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
