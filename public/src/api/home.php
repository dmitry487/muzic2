<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

$tracks = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 12')->fetchAll();

$albums = $db->query('SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY album ORDER BY RAND() LIMIT 6')->fetchAll();

$artists = $db->query('SELECT artist, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY artist ORDER BY RAND() LIMIT 6')->fetchAll();

$favorites = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();
$mixes = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 