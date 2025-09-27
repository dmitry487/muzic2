<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$album = isset($_GET['album']) ? $_GET['album'] : null;
if (!$album) {
    echo json_encode(['error' => 'No album name']);
    exit;
}

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

$tracks = $db->prepare('SELECT id, title, artist, duration, file_path, cover, video_url, explicit FROM tracks WHERE TRIM(LOWER(album)) = TRIM(LOWER(?)) ORDER BY id ASC');
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
        'cover' => $t['cover'],
        'video_url' => $t['video_url'],
        'explicit' => (int)$t['explicit']
    ];
    $totalDuration += (int)$t['duration'];
}

// Исправляем пути к обложкам
$cover = $cover ? '/muzic2/' . $cover : null;

foreach ($trackList as &$track) {
    if ($track['cover']) {
        $track['cover'] = '/muzic2/' . $track['cover'];
    }
}

$res = [
    'title' => $albumRow['album'],
    'artist' => $artist,
    'cover' => $cover,
    'total_duration' => $totalDuration,
    'tracks' => $trackList
];
echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); 

