<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
$album = $_GET['album'] ?? '';

if (empty($album)) {
    echo json_encode(['error' => 'Album name required']);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Информация об альбоме
    $stmt = $pdo->prepare("SELECT DISTINCT album, artist, album_type, cover FROM tracks WHERE album = ? LIMIT 1");
    $stmt->execute([$album]);
    $albumInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$albumInfo) {
        echo json_encode(['error' => 'Album not found']);
        exit;
    }
    
    // Треки альбома
    $stmt = $pdo->prepare("SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks WHERE album = ?");
    $stmt->execute([$album]);
    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'album' => $albumInfo,
        'tracks' => $tracks
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
