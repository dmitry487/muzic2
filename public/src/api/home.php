<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

$tracks = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url FROM tracks ORDER BY RAND() LIMIT 12')->fetchAll();

$albums = $db->query('SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY album ORDER BY RAND() LIMIT 6')->fetchAll();

// Prefer explicit artists table so newly created artists appear
try {
    $artists = $db->query('SELECT a.name AS artist, COALESCE(a.cover, MIN(t.cover)) AS cover, MIN(t.id) AS id, COUNT(t.id) AS track_count FROM artists a LEFT JOIN tracks t ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist)) GROUP BY a.name, a.cover ORDER BY RAND() LIMIT 6')->fetchAll();
    if (!$artists || count($artists) === 0) {
        // Fallback to tracks if no artists present
        $artists = $db->query('SELECT artist, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY artist ORDER BY RAND() LIMIT 6')->fetchAll();
    }
} catch (Throwable $e) {
    $artists = $db->query('SELECT artist, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY artist ORDER BY RAND() LIMIT 6')->fetchAll();
}

$favorites = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();
$mixes = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 