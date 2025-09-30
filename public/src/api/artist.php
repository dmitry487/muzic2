<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$artist = isset($_GET['artist']) ? (string)$_GET['artist'] : null;

if (!$artist) {
    echo json_encode(['error' => 'No artist name provided']);
    exit;
}

$explicitCover = null; $bio = null; $explicitName = null;
try {
    $row = $db->prepare('SELECT name, cover, bio FROM artists WHERE LOWER(name)=LOWER(?) LIMIT 1');
    $row->execute([$artist]);
    $ar = $row->fetch();
    if ($ar) { $explicitName = $ar['name']; $explicitCover = $ar['cover']; $bio = $ar['bio']; }
} catch (Throwable $e) {}

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

$topTracks = [];
try {
    
    try { $db->exec("CREATE TABLE IF NOT EXISTS track_artists (id INT AUTO_INCREMENT PRIMARY KEY, track_id INT NOT NULL, artist VARCHAR(255) NOT NULL, role ENUM('primary','featured') NOT NULL DEFAULT 'featured', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_track_artist_role (track_id, artist, role))"); } catch (Throwable $e2) {}
    $sql = "SELECT DISTINCT t.id, t.title, t.artist, t.album, t.duration, t.file_path, t.cover, t.video_url, t.explicit,
                   (SELECT GROUP_CONCAT(ta2.artist ORDER BY ta2.artist SEPARATOR ', ') FROM track_artists ta2 WHERE ta2.track_id=t.id AND ta2.role='featured') AS feats
            FROM tracks t
            LEFT JOIN track_artists ta ON ta.track_id = t.id AND ta.role='featured'
            WHERE LOWER(t.artist)=LOWER(?) OR LOWER(ta.artist)=LOWER(?)
            ORDER BY t.id DESC LIMIT 50";
    $stmt = $db->prepare($sql);
    $stmt->execute([$artist,$artist]);
    foreach ($stmt as $track) {
        $topTracks[] = [
            'id' => $track['id'],
            'title' => $track['title'],
            'artist' => $track['artist'],
            'feats' => $track['feats'] ?? null,
            'album' => $track['album'],
            'duration' => (int)$track['duration'],
            'file_path' => $track['file_path'],
            'cover' => $track['cover'],
            'video_url' => $track['video_url'],
            'explicit' => (int)$track['explicit']
        ];
    }
} catch (Throwable $e) {}

$albums = [];
try {
    
    try { $db->exec("CREATE TABLE IF NOT EXISTS album_artists (id INT AUTO_INCREMENT PRIMARY KEY, album VARCHAR(255) NOT NULL, artist VARCHAR(255) NOT NULL, role ENUM('primary','featured') NOT NULL DEFAULT 'featured', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_album_artist_role (album, artist, role))"); } catch (Throwable $e2) {}
    $sqlAlbums = "SELECT t.album, t.album_type, COUNT(*) as track_count, MIN(t.cover) as cover, SUM(t.duration) as total_duration
                  FROM tracks t
                  LEFT JOIN track_artists ta ON ta.track_id = t.id AND ta.role='featured'
                  LEFT JOIN album_artists aa ON TRIM(LOWER(aa.album)) = TRIM(LOWER(t.album)) AND aa.role='featured'
                  WHERE LOWER(t.artist)=LOWER(?) OR LOWER(ta.artist)=LOWER(?) OR LOWER(aa.artist)=LOWER(?)
                  GROUP BY t.album, t.album_type
                  ORDER BY t.album ASC";
    $albumsStmt = $db->prepare($sqlAlbums);
    $albumsStmt->execute([$artist, $artist, $artist]);
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

try {
    if (count($albums) === 0) {
        $aa = $db->prepare('SELECT aa.album as album, MIN(t.album_type) as album_type, MIN(t.cover) as cover
                             FROM album_artists aa LEFT JOIN tracks t ON TRIM(LOWER(t.album))=TRIM(LOWER(aa.album))
                             WHERE LOWER(aa.artist)=LOWER(?) AND aa.role="featured"
                             GROUP BY aa.album');
        $aa->execute([$artist]);
        foreach ($aa as $row) {
            $albums[] = [
                'title' => $row['album'],
                'type' => $row['album_type'] ?: 'album',
                'track_count' => 0,
                'cover' => $row['cover'],
                'total_duration' => 0
            ];
        }
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
