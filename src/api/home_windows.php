<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Ультра-быстрая версия для Windows
try {
    // Подключение к MySQL базе данных
    $pdo = new PDO('mysql:host=localhost;port=8889;dbname=muzic2', 'root', 'root');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    
    // Минимальные запросы без JOIN
    $tracksResult = $pdo->query("SELECT id, title, artist, album, album_type, duration, file_path, cover FROM tracks LIMIT 8");
    $tracks = $tracksResult ? $tracksResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    $albumsResult = $pdo->query("SELECT DISTINCT album, artist, album_type, cover FROM tracks WHERE album IS NOT NULL LIMIT 6");
    $albums = $albumsResult ? $albumsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    $artistsResult = $pdo->query("SELECT DISTINCT artist, cover FROM tracks WHERE artist IS NOT NULL LIMIT 6");
    $artists = $artistsResult ? $artistsResult->fetchAll(PDO::FETCH_ASSOC) : [];
    
    // Статические данные для favorites и mixes (самые медленные)
    $favorites = array_slice($tracks, 0, 3);
    $mixes = array_slice($tracks, 3, 3);
    
    // Исправляем пути к обложкам
    foreach ($tracks as &$track) {
        if ($track['cover']) {
            $track['cover'] = '/muzic2/' . $track['cover'];
        }
    }
    
    foreach ($albums as &$album) {
        if ($album['cover']) {
            $album['cover'] = '/muzic2/' . $album['cover'];
        }
    }
    
    foreach ($artists as &$artist) {
        if ($artist['cover']) {
            $artist['cover'] = '/muzic2/' . $artist['cover'];
        }
    }
    
    foreach ($favorites as &$track) {
        if ($track['cover']) {
            $track['cover'] = '/muzic2/' . $track['cover'];
        }
    }
    
    foreach ($mixes as &$track) {
        if ($track['cover']) {
            $track['cover'] = '/muzic2/' . $track['cover'];
        }
    }
    
    echo json_encode([
        'tracks' => $tracks,
        'albums' => $albums,
        'artists' => $artists,
        'favorites' => $favorites,
        'mixes' => $mixes
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>
