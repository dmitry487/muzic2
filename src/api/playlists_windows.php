<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['playlists' => []]);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Простой запрос без JOIN
    $stmt = $pdo->prepare("SELECT id, name, cover FROM playlists WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Добавляем количество треков (упрощенно)
    foreach ($playlists as &$playlist) {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?");
        $stmt->execute([$playlist['id']]);
        $playlist['track_count'] = $stmt->fetch()['count'];
    }
    
    echo json_encode(['playlists' => $playlists]);
    
} catch (Exception $e) {
    echo json_encode(['playlists' => []]);
}
?>
