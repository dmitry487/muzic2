<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

$tracks = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 12')->fetchAll();

$albums = $db->query('SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY album ORDER BY RAND() LIMIT 6')->fetchAll();

$rows = $db->query('SELECT 
    t.artist AS artist,
    COALESCE(a.cover, MIN(t.cover)) AS cover,
    MIN(t.id) AS id
FROM tracks t
LEFT JOIN artists a ON TRIM(LOWER(a.name)) = TRIM(LOWER(t.artist))
GROUP BY t.artist, a.cover
ORDER BY RAND() LIMIT 100')->fetchAll();

// Split composite artist names like "9mice, Kai Angel" into separate entries
$artistMap = [];
foreach ($rows as $r) {
    $parts = preg_split('/\s*(?:,|&| x |\\bfeat\\.?\\b|\\bft\\.?\\b)\s*/iu', (string)$r['artist']);
    foreach ($parts as $name) {
        $name = trim($name);
        if ($name === '') continue;
        $key = mb_strtolower($name);
        if (!isset($artistMap[$key])) {
            $artistMap[$key] = [
                'artist' => $name,
                'cover' => $r['cover'],
                'id' => $r['id']
            ];
        }
        if (empty($artistMap[$key]['cover']) && !empty($r['cover'])) {
            $artistMap[$key]['cover'] = $r['cover'];
        }
    }
}
$artists = array_values($artistMap);
shuffle($artists);
$artists = array_slice($artists, 0, 6);

$favorites = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();
$mixes = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 