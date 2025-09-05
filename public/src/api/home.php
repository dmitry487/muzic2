<?php
require_once __DIR__ . '/../../../src/config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();

$tracks = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 12')->fetchAll();

$albums = $db->query('SELECT album, MIN(artist) as artist, MIN(album_type) as album_type, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY album ORDER BY RAND() LIMIT 6')->fetchAll();

$artists = $db->query('SELECT artist, MIN(cover) as cover, MIN(id) as id FROM tracks GROUP BY artist ORDER BY RAND() LIMIT 6')->fetchAll();

$favorites = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 6')->fetchAll();

// Create special mixes with better data
$mixes = [];
$mixTitles = [
    'Топ-хиты дня',
    'Новинки недели', 
    'Популярные треки',
    'Рекомендации для вас',
    'Случайная подборка',
    'Лучшее за месяц'
];

$mixCovers = [
    'tracks/covers/Kai-Angel-ANGEL-MAY-CRY-07.jpg',
    'tracks/covers/Снимок экрана 2025-07-14 в 07.03.03.png',
    'tracks/covers/Снимок экрана 2025-07-19 в 11.56.58.png',
    'tracks/covers/Heavymetal2.webp.png',
    'tracks/covers/m1000x1000.jpeg',
    'tracks/covers/Без названия (1).jpeg'
];

for ($i = 0; $i < 6; $i++) {
    $randomTracks = $db->query('SELECT * FROM tracks ORDER BY RAND() LIMIT 7')->fetchAll();
    $mixTracks = [];
    $totalDuration = 0;
    
    foreach ($randomTracks as $track) {
        $mixTracks[] = [
            'id' => $track['id'],
            'title' => $track['title'],
            'artist' => $track['artist'],
            'duration' => (int)$track['duration'],
            'file_path' => $track['file_path'],
            'cover' => $track['cover']
        ];
        $totalDuration += (int)$track['duration'];
    }
    
    $mixes[] = [
        'id' => 'mix_' . ($i + 1),
        'title' => $mixTitles[$i],
        'description' => 'Подборка из ' . count($mixTracks) . ' треков',
        'cover' => $mixCovers[$i % count($mixCovers)],
        'tracks' => $mixTracks,
        'total_duration' => $totalDuration,
        'track_count' => count($mixTracks),
        'type' => 'mix'
    ];
}

echo json_encode([
    'tracks' => $tracks,
    'albums' => $albums,
    'artists' => $artists,
    'favorites' => $favorites,
    'mixes' => $mixes
]); 