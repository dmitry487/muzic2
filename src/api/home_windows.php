<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
try {
    // Подключение к базе данных
    $pdo = new PDO('sqlite:../db/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Минимальные запросы без JOIN
    $tracks = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
    $albums = $pdo->query("SELECT DISTINCT album, artist, album_type, cover FROM tracks WHERE album IS NOT NULL LIMIT 6")->fetchAll(PDO::FETCH_ASSOC);
    $artists = $pdo->query("SELECT DISTINCT artist, cover FROM tracks WHERE artist IS NOT NULL LIMIT 6")->fetchAll(PDO::FETCH_ASSOC);
    
    // Статические данные для favorites и mixes (самые медленные)
    $favorites = array_slice($tracks, 0, 3);
    $mixes = array_slice($tracks, 3, 3);
    
    echo json_encode([
        'tracks' => $tracks,
        'albums' => $albums,
        'artists' => $artists,
        'favorites' => $favorites,
        'mixes' => $mixes
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
