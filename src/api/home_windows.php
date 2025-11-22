<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Проверка авторизации
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Требуется авторизация']);
    exit;
}

// Ультра-быстрая версия для Windows
try {
    // Подключение к MySQL базе данных
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Минимальные запросы с случайной сортировкой
    $tracksResult = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY RAND() LIMIT 8");
    $tracks = $tracksResult ? $tracksResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Получаем уникальные альбомы случайным образом
    $albumsResult = $pdo->query("
        SELECT album, artist, album_type, cover 
        FROM (
            SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover 
            FROM tracks 
            WHERE album IS NOT NULL 
            GROUP BY album
        ) AS unique_albums
        ORDER BY RAND() 
        LIMIT 6
    ");
    $albums = $albumsResult ? $albumsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Получаем уникальных артистов случайным образом - сначала из таблицы artists
    $artistsResult = $pdo->query("
        SELECT a.name as artist, a.cover 
        FROM artists a 
        ORDER BY RAND() 
        LIMIT 6
    ");
    $artists = $artistsResult ? $artistsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Если не хватает артистов, дополняем из tracks
    if (count($artists) < 6) {
        $tracksArtistsResult = $pdo->query("
            SELECT artist, MIN(cover) as cover 
            FROM tracks 
            WHERE artist IS NOT NULL 
            AND artist NOT IN (SELECT name FROM artists)
            GROUP BY artist
            ORDER BY RAND() 
            LIMIT " . (6 - count($artists)) . "
        ");
        $tracksArtists = $tracksArtistsResult ? $tracksArtistsResult->fetchAll(PDO::FETCH_ASSOC) : [];
        $artists = array_merge($artists, $tracksArtists);
    }
    
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
