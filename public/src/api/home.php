<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

// Read optional limits (with safe bounds)
$limitTracks = max(1, min(50, (int)($_GET['limit_tracks'] ?? 12)));
$limitAlbums = max(1, min(24, (int)($_GET['limit_albums'] ?? 6)));
$limitArtists = max(1, min(24, (int)($_GET['limit_artists'] ?? 6)));
$limitFavorites = max(1, min(24, (int)($_GET['limit_favorites'] ?? 6)));
$limitMixes = max(1, min(24, (int)($_GET['limit_mixes'] ?? 6)));

// Fast, index-friendly selections (avoid ORDER BY RAND())
$tracksStmt = $db->prepare('SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY id DESC LIMIT :lim');
$tracksStmt->bindValue(':lim', $limitTracks, PDO::PARAM_INT);
$tracksStmt->execute();
$tracks = $tracksStmt->fetchAll(PDO::FETCH_ASSOC);

// Albums: pick latest track per album and order by that recency
$albumsStmt = $db->prepare('SELECT album,
       MIN(artist) AS artist,
       MIN(album_type) AS album_type,
       MIN(cover) AS cover,
       MAX(id) AS last_track_id
  FROM tracks
 GROUP BY album
 ORDER BY last_track_id DESC
 LIMIT :lim');
$albumsStmt->bindValue(':lim', $limitAlbums, PDO::PARAM_INT);
$albumsStmt->execute();
$albums = $albumsStmt->fetchAll(PDO::FETCH_ASSOC);

// Artists: prefer explicit artists table; order by recent activity
try {
    $artistsStmt = $db->prepare('SELECT a.name AS artist,
       COALESCE(a.cover, MIN(t.cover)) AS cover,
       MAX(t.id) AS last_track_id,
       COUNT(t.id) AS track_count
      FROM artists a
 LEFT JOIN tracks t ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
  GROUP BY a.name, a.cover
  ORDER BY last_track_id DESC NULLS LAST
  LIMIT :lim');
    // MySQL doesn’t support NULLS LAST; emulate by ordering IS NULL then DESC
    $artistsSql = 'SELECT a.name AS artist,
       COALESCE(a.cover, MIN(t.cover)) AS cover,
       MAX(t.id) AS last_track_id,
       COUNT(t.id) AS track_count
      FROM artists a
 LEFT JOIN tracks t ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
  GROUP BY a.name, a.cover
  ORDER BY (MAX(t.id) IS NULL) ASC, MAX(t.id) DESC
  LIMIT :lim';
    $artistsStmt = $db->prepare($artistsSql);
    $artistsStmt->bindValue(':lim', $limitArtists, PDO::PARAM_INT);
    $artistsStmt->execute();
    $artists = $artistsStmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$artists || count($artists) === 0) {
        $fallbackStmt = $db->prepare('SELECT artist,
           MIN(cover) AS cover,
           MAX(id) AS last_track_id
          FROM tracks
         GROUP BY artist
         ORDER BY last_track_id DESC
         LIMIT :lim');
        $fallbackStmt->bindValue(':lim', $limitArtists, PDO::PARAM_INT);
        $fallbackStmt->execute();
        $artists = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
    }
} catch (Throwable $e) {
    $fallbackStmt = $db->prepare('SELECT artist,
       MIN(cover) AS cover,
       MAX(id) AS last_track_id
      FROM tracks
     GROUP BY artist
     ORDER BY last_track_id DESC
     LIMIT :lim');
    $fallbackStmt->bindValue(':lim', $limitArtists, PDO::PARAM_INT);
    $fallbackStmt->execute();
    $artists = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
}

$favoritesStmt = $db->prepare('SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY id DESC LIMIT :lim');
$favoritesStmt->bindValue(':lim', $limitFavorites, PDO::PARAM_INT);
$favoritesStmt->execute();
$favorites = $favoritesStmt->fetchAll(PDO::FETCH_ASSOC);

$mixesStmt = $db->prepare('SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit FROM tracks ORDER BY id DESC LIMIT :lim');
$mixesStmt->bindValue(':lim', $limitMixes, PDO::PARAM_INT);
$mixesStmt->execute();
$mixes = $mixesStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]);