<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$album = isset($_GET['album']) ? $_GET['album'] : null;
if (!$album) {
    echo json_encode(['error' => 'No album name']);
    exit;
}

// Поиск по album без учёта регистра и пробелов (только существующие поля)
$sql = 'SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover FROM tracks WHERE TRIM(LOWER(album)) = TRIM(LOWER(?)) GROUP BY album';
$albumRow = $db->prepare($sql);
$albumRow->execute([$album]);
$albumRow = $albumRow->fetch();
if (!$albumRow) {
    echo json_encode(['error' => 'Album not found', 'debug_album' => $album]);
    exit;
}

$artist = $albumRow['artist'];
$cover = $albumRow['cover'];

// Получаем все треки этого альбома (без plays)
$tracks = $db->prepare('SELECT id, title, artist, duration, file_path, cover FROM tracks WHERE TRIM(LOWER(album)) = TRIM(LOWER(?)) ORDER BY id ASC');
$tracks->execute([$album]);
$trackList = [];
$totalDuration = 0;
foreach ($tracks as $t) {
    $trackList[] = [
        'id' => $t['id'],
        'title' => $t['title'],
        'artist' => $t['artist'],
        'duration' => (int)$t['duration'],
        'src' => $t['file_path'],
        'cover' => $t['cover']
    ];
    $totalDuration += (int)$t['duration'];
}

$res = [
    'title' => $albumRow['album'],
    'artist' => $artist,
    'cover' => $cover,
    'total_duration' => $totalDuration,
    'tracks' => $trackList
];
echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); 