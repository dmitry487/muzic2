<?php
// Простая тестовая версия для Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все ошибки
error_reporting(0);
ini_set('display_errors', 0);

try {
    // Пробуем подключиться к базе данных
    require_once __DIR__ . '/../config/db.php';
    $db = get_db_connection();
    
    // Простые запросы
    $tracks = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8')->fetchAll();
    
    // Создаем альбомы и артистов из треков
    $albums = [];
    $artists = [];
    $seen_albums = [];
    $seen_artists = [];
    
    foreach ($tracks as $track) {
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
    // Возвращаем тестовые данные при ошибке
    echo json_encode([
        'tracks' => [
            ['id' => 1, 'title' => 'Тестовый трек', 'artist' => 'Тестовый артист', 'album' => 'Тестовый альбом', 'album_type' => 'album', 'duration' => 180, 'file_path' => 'test.mp3', 'cover' => 'test.jpg']
        ],
        'albums' => [
            ['album' => 'Тестовый альбом', 'artist' => 'Тестовый артист', 'album_type' => 'album', 'cover' => 'test.jpg']
        ],
        'artists' => [
            ['artist' => 'Тестовый артист', 'cover' => 'test.jpg']
        ],
        'favorites' => [
            ['id' => 1, 'title' => 'Тестовый трек', 'artist' => 'Тестовый артист', 'album' => 'Тестовый альбом', 'album_type' => 'album', 'duration' => 180, 'file_path' => 'test.mp3', 'cover' => 'test.jpg']
        ],
        'mixes' => [
            ['id' => 1, 'title' => 'Тестовый трек', 'artist' => 'Тестовый артист', 'album' => 'Тестовый альбом', 'album_type' => 'album', 'duration' => 180, 'file_path' => 'test.mp3', 'cover' => 'test.jpg']
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>
