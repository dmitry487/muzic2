<?php
// Ультра-быстрая версия home.php для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем ВСЕ для максимальной скорости
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 0);

try {
    // Прямое подключение к SQLite без лишних проверок
    $db_path = __DIR__ . '/../../db/database.sqlite';
    if (!file_exists($db_path)) {
        throw new Exception('Database file not found');
    }
    $pdo = new PDO("sqlite:$db_path");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Максимально простые запросы
    $tracks = $pdo->query('SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8')->fetchAll(PDO::FETCH_ASSOC);
    
    // Используем те же данные для всех секций (быстрее)
    $albums = [];
    $artists = [];
    $seen_albums = [];
    $seen_artists = [];
    
    foreach ($tracks as $track) {
        // Собираем уникальные альбомы
        $album_key = $track['album'] . '|' . $track['artist'];
        if (!isset($seen_albums[$album_key])) {
            $albums[] = [
                'album' => $track['album'],
                'artist' => $track['artist'],
                'album_type' => $track['album_type'],
                'cover' => $track['cover']
            ];
            $seen_albums[$album_key] = true;
        }
        
        // Собираем уникальных артистов
        if (!isset($seen_artists[$track['artist']])) {
            $artists[] = [
                'artist' => $track['artist'],
                'cover' => $track['cover']
            ];
            $seen_artists[$track['artist']] = true;
        }
    }
    
    // Ограничиваем количество
    $albums = array_slice($albums, 0, 4);
    $artists = array_slice($artists, 0, 4);
    $favorites = array_slice($tracks, 0, 4);
    $mixes = array_slice($tracks, 4, 4);
    
    echo json_encode([
        'tracks' => $tracks,
        'albums' => $albums,
        'artists' => $artists,
        'favorites' => $favorites,
        'mixes' => $mixes
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Минимальный ответ при ошибке
    echo json_encode([
        'tracks' => [],
        'albums' => [],
        'artists' => [],
        'favorites' => [],
        'mixes' => []
    ]);
}
?>
