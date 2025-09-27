<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$db = get_db_connection();

// Используем RANDOM() для SQLite, RAND() для MySQL
$random_func = (strpos(get_class($db), 'SQLite') !== false) ? 'RANDOM()' : 'RAND()';

$tracks = $db->query("SELECT * FROM tracks ORDER BY $random_func LIMIT 12")->fetchAll();

$albums = $db->query("SELECT album, artist, album_type, cover, MIN(id) as id FROM tracks GROUP BY album, artist, album_type, cover ORDER BY $random_func LIMIT 6")->fetchAll();

$artists = $db->query("SELECT artist, cover, MIN(id) as id FROM tracks GROUP BY artist, cover ORDER BY $random_func LIMIT 6")->fetchAll();

$favorites = $db->query("SELECT * FROM tracks ORDER BY $random_func LIMIT 6")->fetchAll();
$mixes = $db->query("SELECT * FROM tracks ORDER BY $random_func LIMIT 6")->fetchAll();

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 