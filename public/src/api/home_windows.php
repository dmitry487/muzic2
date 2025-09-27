<?php
// Windows-optimized home API - minimal queries for speed
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

// Windows: Simple limits - no complex bounds checking
$limitTracks = min(10, (int)($_GET['limit_tracks'] ?? 10));
$limitAlbums = min(10, (int)($_GET['limit_albums'] ?? 10));
$limitArtists = min(10, (int)($_GET['limit_artists'] ?? 10));

// Windows: Simple random tracks - minimal data for speed
$tracksStmt = $db->prepare('SELECT id, title, artist, cover FROM tracks ORDER BY RAND() LIMIT ?');
$tracksStmt->execute([$limitTracks]);
$tracks = $tracksStmt->fetchAll(PDO::FETCH_ASSOC);

// Windows: Simple random albums - no GROUP BY for speed
$albumsStmt = $db->prepare('SELECT DISTINCT album as title, artist, album_type, cover FROM tracks WHERE album IS NOT NULL ORDER BY RAND() LIMIT ?');
$albumsStmt->execute([$limitAlbums]);
$albums = $albumsStmt->fetchAll(PDO::FETCH_ASSOC);

// Windows: Simple random artists - no JOIN for speed
$artistsStmt = $db->prepare('SELECT DISTINCT artist as name, MIN(cover) as cover FROM tracks WHERE artist IS NOT NULL GROUP BY artist ORDER BY RAND() LIMIT ?');
$artistsStmt->execute([$limitArtists]);
$artists = $artistsStmt->fetchAll(PDO::FETCH_ASSOC);

// Windows: Simple favorites - minimal data for speed
$favoritesStmt = $db->prepare('SELECT id, title, artist, cover FROM tracks ORDER BY RAND() LIMIT ?');
$favoritesStmt->execute([$limitTracks]);
$favorites = $favoritesStmt->fetchAll(PDO::FETCH_ASSOC);

// Windows: Simple mixes - minimal data for speed  
$mixesStmt = $db->prepare('SELECT id, title, artist, cover FROM tracks ORDER BY RAND() LIMIT ?');
$mixesStmt->execute([$limitTracks]);
$mixes = $mixesStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]);
?>
