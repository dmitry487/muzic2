<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
try {
    // Подключение к MySQL базе данных
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Минимальные запросы с случайной сортировкой
    $tracksResult = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY RAND() LIMIT 8");
    $tracks = $tracksResult ? $tracksResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    $albumsResult = $pdo->query("SELECT DISTINCT album, artist, album_type, cover FROM tracks WHERE album IS NOT NULL ORDER BY RAND() LIMIT 6");
    $albums = $albumsResult ? $albumsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    $artistsResult = $pdo->query("SELECT DISTINCT artist, cover FROM tracks WHERE artist IS NOT NULL ORDER BY RAND() LIMIT 6");
    $artists = $artistsResult ? $artistsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Случайные данные для favorites и mixes
    $favoritesResult = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY RAND() LIMIT 3");
    $favorites = $favoritesResult ? $favoritesResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    $mixesResult = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY RAND() LIMIT 3");
    $mixes = $mixesResult ? $mixesResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Не изменяем пути к обложкам - они должны быть как в оригинальном API
    
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
