<?php
/**
 * Экспортирует данные из MySQL в статические JSON-файлы
 * для офлайн-режима Electron приложения.
 */

require_once __DIR__ . '/../../src/config/db.php';

$targetDir = realpath(__DIR__ . '/../content/api');
if (!$targetDir) {
    fwrite(STDERR, "Не найдена папка app/content/api\n");
    exit(1);
}

$albumsDir = $targetDir . '/albums';
$artistsDir = $targetDir . '/artists';
foreach ([$albumsDir, $artistsDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

function encode_key(string $value): string {
    $encoded = rawurlencode($value);
    return str_replace('%', '_', $encoded);
}

function normalize_media_path(?string $path, string $fallback = ''): string {
    if (!$path) return $fallback;
    $path = str_replace('\\', '/', $path);
    $pos = strpos($path, 'tracks/');
    if ($pos !== false) {
        $path = substr($path, $pos);
    }
    return ltrim($path, './');
}

function save_json(string $path, $data): void {
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function collect_tracks_from_filesystem(): array {
    $tracksDir = realpath(__DIR__ . '/../../tracks/music');
    if (!$tracksDir) return [];

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($tracksDir, FilesystemIterator::SKIP_DOTS)
    );
    $supported = ['mp3','wav','flac','m4a','aac','ogg'];
    $tracks = [];
    $id = 1;

    foreach ($iterator as $file) {
        if ($file->isDir()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, $supported, true)) continue;
        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($tracksDir)));
        $relative = ltrim($relative, '/');
        $filePath = 'tracks/music/' . $relative;
        $base = $file->getBasename('.' . $ext);

        $artist = 'Неизвестный артист';
        $title = $base;
        if (strpos($base, ' - ') !== false) {
            [$maybeArtist, $maybeTitle] = explode(' - ', $base, 2);
            if ($maybeArtist && $maybeTitle) {
                $artist = trim($maybeArtist);
                $title = trim($maybeTitle);
            }
        }

        $tracks[] = [
            'id' => $id++,
            'title' => $title,
            'artist' => $artist,
            'album' => $artist,
            'album_type' => 'album',
            'duration' => 0,
            'file_path' => './' . $filePath,
            'cover' => './tracks/covers/placeholder.jpg',
            'src' => './' . $filePath,
            'video_url' => '',
            'explicit' => 0
        ];
    }
    return $tracks;
}

$db = null;
try {
    $db = get_db_connection();
} catch (Throwable $e) {
    fwrite(STDERR, "⚠️  Не удалось подключиться к БД: " . $e->getMessage() . PHP_EOL);
}

$tracks = [];
if ($db) {
    $trackSql = 'SELECT id, title, artist, album, album_type, duration, file_path, cover, video_url, explicit 
                 FROM tracks ORDER BY created_at DESC';
    $stmt = $db->query($trackSql);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $filePath = normalize_media_path($row['file_path'], '');
        $coverPath = normalize_media_path($row['cover'], 'tracks/covers/placeholder.jpg');
        $tracks[] = [
            'id' => (int)$row['id'],
            'title' => $row['title'],
            'artist' => $row['artist'],
            'album' => $row['album'],
            'album_type' => $row['album_type'],
            'duration' => (int)($row['duration'] ?? 0),
            'file_path' => './' . $filePath,
            'cover' => './' . $coverPath,
            'src' => './' . $filePath,
            'video_url' => $row['video_url'] ?? '',
            'explicit' => (int)!empty($row['explicit'])
        ];
    }
}

if (!$tracks) {
    fwrite(STDERR, "Использую файловую систему для создания каталога...\n");
    $tracks = collect_tracks_from_filesystem();
}

if (!$tracks) {
    fwrite(STDERR, "Не удалось собрать треки — офлайн JSON не создан.\n");
    exit(0);
}

save_json($targetDir . '/tracks.json', ['tracks' => $tracks]);

// Готовим агрегированные данные по альбомам и артистам
$albumsMap = [];
$artistsMap = [];

foreach ($tracks as $track) {
    $albumKey = encode_key(mb_strtolower($track['album']));
    if (!isset($albumsMap[$albumKey])) {
        $albumsMap[$albumKey] = [
            'title' => $track['album'],
            'artist' => $track['artist'],
            'album_type' => $track['album_type'],
            'cover' => $track['cover'],
            'tracks' => [],
            'total_duration' => 0
        ];
    }
    $albumsMap[$albumKey]['tracks'][] = [
        'id' => $track['id'],
        'title' => $track['title'],
        'artist' => $track['artist'],
        'duration' => $track['duration'],
        'src' => $track['src'],
        'cover' => $track['cover'],
        'video_url' => $track['video_url'],
        'explicit' => $track['explicit']
    ];
    $albumsMap[$albumKey]['total_duration'] += $track['duration'];

    $artistKey = encode_key(mb_strtolower($track['artist']));
    if (!isset($artistsMap[$artistKey])) {
        $artistsMap[$artistKey] = [
            'name' => $track['artist'],
            'cover' => $track['cover'],
            'total_tracks' => 0,
            'albums' => [],
            'tracks' => []
        ];
    }
    $artistsMap[$artistKey]['total_tracks'] += 1;
    $artistsMap[$artistKey]['tracks'][] = [
        'id' => $track['id'],
        'title' => $track['title'],
        'album' => $track['album'],
        'duration' => $track['duration'],
        'src' => $track['src'],
        'cover' => $track['cover'],
        'explicit' => $track['explicit']
    ];
    $artistsMap[$artistKey]['albums'][$albumKey] = [
        'title' => $track['album'],
        'cover' => $track['cover'],
        'track_count' => isset($artistsMap[$artistKey]['albums'][$albumKey])
            ? $artistsMap[$artistKey]['albums'][$albumKey]['track_count'] + 1
            : 1
    ];
}

// Сохраняем список альбомов
$albumCards = [];
foreach ($albumsMap as $key => $album) {
    $albumCards[] = [
        'slug' => $key,
        'title' => $album['title'],
        'artist' => $album['artist'],
        'cover' => $album['cover'],
        'track_count' => count($album['tracks'])
    ];

    save_json($albumsDir . '/' . $key . '.json', [
        'title' => $album['title'],
        'artist' => $album['artist'],
        'cover' => $album['cover'],
        'album_type' => $album['album_type'],
        'total_duration' => $album['total_duration'],
        'tracks' => $album['tracks']
    ]);
}
save_json($targetDir . '/all_albums.json', ['albums' => $albumCards]);

// Сохраняем артистов
$artistCards = [];
foreach ($artistsMap as $key => $artist) {
    $artistCards[] = [
        'slug' => $key,
        'name' => $artist['name'],
        'cover' => $artist['cover'],
        'track_count' => $artist['total_tracks']
    ];
    $albums = array_values($artist['albums']);
    usort($albums, fn($a, $b) => strcmp($a['title'], $b['title']));
    $topTracks = array_slice($artist['tracks'], 0, 10);

    save_json($artistsDir . '/' . $key . '.json', [
        'name' => $artist['name'],
        'verified' => true,
        'monthly_listeners' => rand(100000, 5000000),
        'cover' => $artist['cover'],
        'total_tracks' => $artist['total_tracks'],
        'total_albums' => count($artist['albums']),
        'total_duration' => array_sum(array_column($artist['tracks'], 'duration')),
        'top_tracks' => $topTracks,
        'albums' => $albums,
        'tracks' => $artist['tracks']
    ]);
}

// Главная страница
$homeData = [
    'tracks' => array_slice($tracks, 0, 20),
    'albums' => array_slice($albumCards, 0, 12),
    'artists' => array_slice($artistCards, 0, 12),
    'favorites' => array_slice($tracks, 0, 8),
    'mixes' => array_slice($tracks, 8, 12)
];
save_json($targetDir . '/home.json', $homeData);
save_json($targetDir . '/home_windows.json', $homeData);

// Поисковой индекс
$searchData = [
    'tracks' => $tracks,
    'artists' => $artistCards,
    'albums' => $albumCards
];
save_json($targetDir . '/search.json', $searchData);

// Дополнительные статичные файлы
save_json($targetDir . '/likes.json', ['likes' => []]);
save_json($targetDir . '/windows_likes.json', ['likes' => []]);
save_json($targetDir . '/user.json', ['user' => null, 'authenticated' => false]);
save_json($targetDir . '/windows_auth.json', ['user' => null, 'authenticated' => false]);
save_json($targetDir . '/login.json', ['success' => false, 'error' => 'Авторизация недоступна в офлайн-режиме']);
save_json($targetDir . '/logout.json', ['success' => true]);
save_json($targetDir . '/playlists.json', ['playlists' => []]);
save_json($targetDir . '/library.json', [
    'tracks' => $tracks,
    'albums' => $albumCards,
    'artists' => $artistCards
]);

echo "Офлайн JSON успешно сгенерирован.\n";


