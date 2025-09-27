<?php
// Оптимизированная версия home.php для Windows
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Отключаем все лишние проверки для скорости
error_reporting(0);
ini_set('display_errors', 0);

try {
    $db = get_db_connection();
    
    // Простые запросы без сложных GROUP BY
    $tracks = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 12')->fetchAll();
    
    // Упрощенный запрос для альбомов
    $albums = $db->query('SELECT DISTINCT album, artist, album_type, cover FROM tracks LIMIT 6')->fetchAll();
    
    // Упрощенный запрос для артистов
    $artists = $db->query('SELECT DISTINCT artist, cover FROM tracks LIMIT 6')->fetchAll();
    
    // Используем те же данные для favorites и mixes (быстрее)
    $favorites = array_slice($tracks, 0, 6);
    $mixes = array_slice($tracks, 6, 6);
    
    echo json_encode([
        'tracks' => $tracks,
        'albums' => $albums,
        'artists' => $artists,
        'favorites' => $favorites,
        'mixes' => $mixes
    ]);
    
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
