<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$artist = isset($_GET['artist']) ? $_GET['artist'] : null;

if (!$artist) {
    echo json_encode(['error' => 'No artist name provided']);
    exit;
}

// Получаем информацию об артисте и его треках
$artistQuery = 'SELECT 
    t.artist AS artist,
    COUNT(*) AS total_tracks,
    COUNT(DISTINCT t.album) AS total_albums,
    SUM(t.duration) AS total_duration,
    COALESCE(a.cover, MIN(t.cover)) AS cover,
    a.bio AS bio
FROM tracks t
LEFT JOIN artists a ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
WHERE TRIM(LOWER(t.artist)) = TRIM(LOWER(?)) OR TRIM(LOWER(t.artist)) LIKE TRIM(LOWER(?))
GROUP BY t.artist, a.cover, a.bio';

$artistStmt = $db->prepare($artistQuery);
$like = '%'.$artist.'%';
$artistStmt->execute([$artist, $like]);
$artistInfo = $artistStmt->fetch();

if (!$artistInfo) {
    echo json_encode(['error' => 'Artist not found', 'debug_artist' => $artist]);
    exit;
}

// Получаем топ-треки артиста (наиболее популярные)
$topTracksQuery = 'SELECT 
    id, title, artist, album, duration, file_path, cover
FROM tracks 
WHERE TRIM(LOWER(artist)) = TRIM(LOWER(?)) OR TRIM(LOWER(artist)) LIKE TRIM(LOWER(?))
ORDER BY id ASC 
LIMIT 50';

$topTracksStmt = $db->prepare($topTracksQuery);
$like = '%'.$artist.'%';
$topTracksStmt->execute([$artist, $like]);
$topTracks = [];

foreach ($topTracksStmt as $track) {
    $topTracks[] = [
        'id' => $track['id'],
        'title' => $track['title'],
        'artist' => $track['artist'],
        'album' => $track['album'],
        'duration' => (int)$track['duration'],
        'src' => $track['file_path'],
        'cover' => $track['cover']
    ];
}

// Получаем альбомы артиста
$albumsQuery = 'SELECT 
    album,
    album_type,
    COUNT(*) as track_count,
    MIN(cover) as cover,
    SUM(duration) as total_duration
FROM tracks 
WHERE TRIM(LOWER(artist)) = TRIM(LOWER(?)) 
GROUP BY album, album_type
ORDER BY album ASC';

$albumsStmt = $db->prepare($albumsQuery);
$albumsStmt->execute([$artist]);
$albums = [];

foreach ($albumsStmt as $album) {
    $albums[] = [
        'title' => $album['album'],
        'type' => $album['album_type'],
        'track_count' => (int)$album['track_count'],
        'cover' => $album['cover'],
        'total_duration' => (int)$album['total_duration']
    ];
}

// Получаем все треки для подсчета прослушиваний (пока заглушка)
$monthlyListeners = rand(100000, 10000000); // Временная заглушка

$response = [
    'name' => $artistInfo['artist'],
    'verified' => true, // Пока всех делаем верифицированными
    'monthly_listeners' => $monthlyListeners,
    'cover' => $artistInfo['cover'],
    'bio' => $artistInfo['bio'] ?? '',
    'total_tracks' => (int)$artistInfo['total_tracks'],
    'total_albums' => (int)$artistInfo['total_albums'],
    'total_duration' => (int)$artistInfo['total_duration'],
    'top_tracks' => $topTracks,
    'albums' => $albums
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
