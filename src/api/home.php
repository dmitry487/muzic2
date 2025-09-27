<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$db = get_db_connection();

// Простые запросы для ускорения
$tracks = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8')->fetchAll();

// Упрощенные запросы для альбомов и артистов
$albums = $db->query('SELECT DISTINCT album, artist, album_type, cover FROM tracks LIMIT 4')->fetchAll();
$artists = $db->query('SELECT DISTINCT artist, cover FROM tracks LIMIT 4')->fetchAll();

// Используем те же данные для favorites и mixes (быстрее)
$favorites = array_slice($tracks, 0, 4);
$mixes = array_slice($tracks, 4, 4);

// Исправляем пути к обложкам
foreach ($tracks as &$track) {
    if ($track['cover']) {
        $track['cover'] = '/muzic2/' . $track['cover'];
    }
}

foreach ($albums as &$album) {
    if ($album['cover']) {
        $album['cover'] = '/muzic2/' . $album['cover'];
    }
}

foreach ($artists as &$artist) {
    if ($artist['cover']) {
        $artist['cover'] = '/muzic2/' . $artist['cover'];
    }
}

foreach ($favorites as &$track) {
    if ($track['cover']) {
        $track['cover'] = '/muzic2/' . $track['cover'];
    }
}

foreach ($mixes as &$track) {
    if ($track['cover']) {
        $track['cover'] = '/muzic2/' . $track['cover'];
    }
}

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 