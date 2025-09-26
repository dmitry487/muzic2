<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$artist = isset($_GET['artist']) ? (string)$_GET['artist'] : null;

if (!$artist) {
    echo json_encode(['error' => 'No artist name provided']);
    exit;
}

// Prefer explicit artists table first, so artists without tracks still resolve
$explicitCover = null; $bio = null; $explicitName = null;
try {
    $row = $db->prepare('SELECT name, cover, bio FROM artists WHERE LOWER(name)=LOWER(?) LIMIT 1');
    $row->execute([$artist]);
    $ar = $row->fetch();
    if ($ar) { $explicitName = $ar['name']; $explicitCover = $ar['cover']; $bio = $ar['bio']; }
} catch (Throwable $e) {}

// Try to find exact-match (case-insensitive) artist rows in tracks (for stats)
$artistQuery = 'SELECT 
    artist,
    COUNT(*) as total_tracks,
    COUNT(DISTINCT album) as total_albums,
    SUM(duration) as total_duration,
    MIN(cover) as cover
FROM tracks 
WHERE LOWER(artist) = LOWER(?) 
GROUP BY artist';

$artistStmt = $db->prepare($artistQuery);
$artistStmt->execute([$artist]);
$artistInfo = $artistStmt->fetch();

// If no tracks entry but explicit artist exists, synthesize minimal info
if (!$artistInfo && $explicitName) {
    $artistInfo = [
        'artist' => $explicitName,
        'total_tracks' => 0,
        'total_albums' => 0,
        'total_duration' => 0,
        'cover' => $explicitCover
    ];
}

if (!$artistInfo) {
    echo json_encode(['error' => 'Artist not found', 'debug_artist' => $artist]);
    exit;
}

// Top tracks for this exact artist (may be empty)
$topTracks = [];
try {
    $topTracksQuery = 'SELECT id, title, artist, album, duration, file_path, cover, video_url, explicit FROM tracks WHERE LOWER(artist) = LOWER(?) ORDER BY id ASC LIMIT 10';
    $topTracksStmt = $db->prepare($topTracksQuery);
    $topTracksStmt->execute([$artist]);
    foreach ($topTracksStmt as $track) {
        $topTracks[] = [
            'id' => $track['id'],
            'title' => $track['title'],
            'artist' => $track['artist'],
            'album' => $track['album'],
            'duration' => (int)$track['duration'],
            'file_path' => $track['file_path'],
            'cover' => $track['cover'],
            'video_url' => $track['video_url'],
            'explicit' => (int)$track['explicit']
        ];
    }
} catch (Throwable $e) {}

// Albums for this exact artist (may be empty)
$albums = [];
try {
    $albumsQuery = 'SELECT album, album_type, COUNT(*) as track_count, MIN(cover) as cover, SUM(duration) as total_duration FROM tracks WHERE LOWER(artist) = LOWER(?) GROUP BY album, album_type ORDER BY album ASC';
    $albumsStmt = $db->prepare($albumsQuery);
    $albumsStmt->execute([$artist]);
    foreach ($albumsStmt as $album) {
        $albums[] = [
            'title' => $album['album'],
            'type' => $album['album_type'],
            'track_count' => (int)$album['track_count'],
            'cover' => $album['cover'],
            'total_duration' => (int)$album['total_duration']
        ];
    }
} catch (Throwable $e) {}

$monthlyListeners = rand(100000, 10000000);

$response = [
    'name' => $artistInfo['artist'],
    'verified' => true,
    'monthly_listeners' => $monthlyListeners,
    'cover' => $explicitCover ?: $artistInfo['cover'],
    'bio' => $bio ?: null,
    'total_tracks' => (int)$artistInfo['total_tracks'],
    'total_albums' => (int)$artistInfo['total_albums'],
    'total_duration' => (int)$artistInfo['total_duration'],
    'top_tracks' => $topTracks,
    'albums' => $albums
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
