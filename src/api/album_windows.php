<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$album = $_GET['album'] ?? '';

if (empty($album)) {
    echo json_encode(['error' => 'Album name required']);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);

    $stmt = $pdo->prepare("SELECT DISTINCT album, artist, album_type, cover FROM tracks WHERE album = ? LIMIT 1");
    $stmt->execute([$album]);
    $albumInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$albumInfo) {
        echo json_encode(['error' => 'Album not found']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT t.id, t.title, t.artist, t.album, t.album_type, t.duration, t.file_path, t.cover, t.video_url, t.explicit,
        (SELECT GROUP_CONCAT(ta.artist ORDER BY ta.artist SEPARATOR ', ') FROM track_artists ta WHERE ta.track_id=t.id AND ta.role='featured') AS feats
      FROM tracks t WHERE t.album = ?");
    $stmt->execute([$album]);
    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'title' => $albumInfo['album'],
        'artist' => $albumInfo['artist'],
        'cover' => $albumInfo['cover'],
        'total_duration' => array_sum(array_column($tracks, 'duration')),
        'tracks' => $tracks
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
