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
    
    // Сначала проверяем таблицу artists для правильной обложки
    $stmt = $pdo->prepare("SELECT name, cover FROM artists WHERE name = ? LIMIT 1");
    $stmt->execute([$artist]);
    $artistInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Если нет в таблице artists, берем из tracks
    if (!$artistInfo) {
        $stmt = $pdo->prepare("SELECT DISTINCT artist, MIN(cover) as cover FROM tracks WHERE artist = ? GROUP BY artist LIMIT 1");
        $stmt->execute([$artist]);
        $artistInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$artistInfo) {
        echo json_encode(['error' => 'Artist not found']);
        exit;
    }
    
    // Альбомы артиста (упрощенно) - группируем по альбому
    $stmt = $pdo->prepare("SELECT album, MIN(album_type) as album_type, MIN(cover) as cover FROM tracks WHERE artist = ? AND album IS NOT NULL GROUP BY album ORDER BY album");
    $stmt->execute([$artist]);
    $albums = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Треки артиста (только первые 20)
    $stmt = $pdo->prepare("SELECT id, title, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks WHERE artist = ? ORDER BY id LIMIT 20");
    $stmt->execute([$artist]);
    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Подсчитываем общее количество треков и альбомов
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_tracks FROM tracks WHERE artist = ?");
    $stmt->execute([$artist]);
    $totalTracks = $stmt->fetch(PDO::FETCH_ASSOC)['total_tracks'];
    
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT album) as total_albums FROM tracks WHERE artist = ? AND album IS NOT NULL");
    $stmt->execute([$artist]);
    $totalAlbums = $stmt->fetch(PDO::FETCH_ASSOC)['total_albums'];
    
    // Подсчитываем общую длительность
    $stmt = $pdo->prepare("SELECT SUM(duration) as total_duration FROM tracks WHERE artist = ?");
    $stmt->execute([$artist]);
    $totalDuration = $stmt->fetch(PDO::FETCH_ASSOC)['total_duration'] ?? 0;
    
    // Формируем ответ в том же формате, что и оригинальный API
    $response = [
        'name' => $artistInfo['name'] ?? $artistInfo['artist'],
        'verified' => true,
        'monthly_listeners' => rand(100000, 10000000),
        'cover' => $artistInfo['cover'],
        'bio' => null,
        'total_tracks' => (int)$totalTracks,
        'total_albums' => (int)$totalAlbums,
        'total_duration' => (int)$totalDuration,
        'top_tracks' => $tracks,
        'albums' => $albums
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
