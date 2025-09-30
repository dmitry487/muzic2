<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$db = get_db_connection();

$tracks = $db->query('SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8')->fetchAll();

$albums = $db->query('SELECT DISTINCT album, artist, album_type, cover FROM tracks LIMIT 4')->fetchAll();
$artists = $db->query('SELECT DISTINCT artist, cover FROM tracks LIMIT 4')->fetchAll();

$favorites = array_slice($tracks, 0, 4);
$mixes = array_slice($tracks, 4, 4);

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 