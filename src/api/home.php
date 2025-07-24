<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

// Случайные треки (12)
$tracks = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 12')->fetchAll();

// Случайные альбомы (6 уникальных)
$albums = $db->query('SELECT album, artist, album_type, cover, MIN(id) as id FROM tracks GROUP BY album ORDER BY RAND() LIMIT 6')->fetchAll();

// Случайные артисты (6 уникальных)
$artists = $db->query('SELECT artist, cover, MIN(id) as id FROM tracks GROUP BY artist ORDER BY RAND() LIMIT 6')->fetchAll();

// Любимые треки и миксы дня — пока просто случайные треки
$favorites = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();
$mixes = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 