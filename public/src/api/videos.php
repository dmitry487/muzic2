<?php
header('Content-Type: application/json; charset=utf-8');

// Base videos directory
$baseDir = __DIR__ . '/../../../tracks/video';
$baseUrl = '/muzic2/tracks/video/';

$artist = isset($_GET['artist']) ? trim((string)$_GET['artist']) : '';
$artistLower = mb_strtolower($artist, 'UTF-8');

$result = [];
if (is_dir($baseDir)) {
    $files = scandir($baseDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $path = $baseDir . '/' . $f;
        if (!is_file($path)) continue;
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
        if (!in_array($ext, ['mp4','webm','ogg'])) continue;

        $title = pathinfo($f, PATHINFO_FILENAME);
        $titleClean = preg_replace('/[_-]+/', ' ', $title);
        $matchArtist = true;
        if ($artistLower !== '') {
            $matchArtist = (mb_strpos(mb_strtolower($title, 'UTF-8'), $artistLower) !== false);
        }
        if (!$matchArtist) continue;

        $result[] = [
            'title' => $titleClean,
            'artist' => $artist,
            'src' => $baseUrl . rawurlencode($f),
            'cover' => null,
            'duration' => 0
        ];
    }
}

echo json_encode(['success' => true, 'data' => $result], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>













