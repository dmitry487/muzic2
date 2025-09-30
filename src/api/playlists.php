<?php
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$db = get_db_connection();

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];

if ($method === 'GET') {
    // If playlist_id provided, return tracks
    $playlist_id = $_GET['playlist_id'] ?? null;
    if ($playlist_id) {
        // Return track info for playlist with feats and alias file_path as src; include optional video_url
        $stmt = $db->prepare('SELECT t.id, t.title, t.artist, t.album, t.duration, t.cover, t.file_path AS src, t.video_url,
            (SELECT GROUP_CONCAT(ta.artist ORDER BY ta.artist SEPARATOR ", ") FROM track_artists ta WHERE ta.track_id=t.id AND ta.role="featured") AS feats
          FROM playlist_tracks pt JOIN tracks t ON pt.track_id = t.id WHERE pt.playlist_id = ? ORDER BY pt.position ASC');
        $stmt->execute([$playlist_id]);
        echo json_encode(['tracks' => $stmt->fetchAll()]);
    } else {
        // Ensure default "Любимые треки" exists for this user
        $check = $db->prepare('SELECT id FROM playlists WHERE user_id = ? AND name = ? LIMIT 1');
        $check->execute([$user_id, 'Любимые треки']);
        if (!$check->fetch()) {
            $ins = $db->prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, 0)');
            $ins->execute([$user_id, 'Любимые треки']);
        }
        $stmt = $db->prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user_id]);
        $playlists = $stmt->fetchAll();
        
        // Add special cover for "Любимые треки" playlist
        foreach ($playlists as &$playlist) {
            if ($playlist['name'] === 'Любимые треки') {
                $playlist['cover'] = 'tracks/covers/favorites-playlist.png';
            }
        }
        
        echo json_encode(['playlists' => $playlists]);
    }
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST' && preg_match('#/add$#', $path)) {
    $playlist_id = $data['playlist_id'] ?? null;
    $track_id = $data['track_id'] ?? null;
    if (!$playlist_id || !$track_id) {
        http_response_code(400);
        echo json_encode(['error' => 'playlist_id и track_id обязательны']);
        exit;
    }
    $stmt = $db->prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?');
    $stmt->execute([$playlist_id, $user_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Нет доступа к плейлисту']);
        exit;
    }
    $stmt = $db->prepare('SELECT MAX(position) AS max_pos FROM playlist_tracks WHERE playlist_id = ?');
    $stmt->execute([$playlist_id]);
    $pos = ($stmt->fetch()['max_pos'] ?? 0) + 1;
    $stmt = $db->prepare('INSERT IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)');
    $stmt->execute([$playlist_id, $track_id, $pos]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'POST' && preg_match('#/remove$#', $path)) {
    $playlist_id = $data['playlist_id'] ?? null;
    $track_id = $data['track_id'] ?? null;
    if (!$playlist_id || !$track_id) {
        http_response_code(400);
        echo json_encode(['error' => 'playlist_id и track_id обязательны']);
        exit;
    }
    $stmt = $db->prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?');
    $stmt->execute([$playlist_id, $user_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Нет доступа к плейлисту']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?');
    $stmt->execute([$playlist_id, $track_id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'POST') {
    // rename or delete?
    if (preg_match('#/rename$#', $path)) {
        $playlist_id = $data['playlist_id'] ?? null;
        $name = trim($data['name'] ?? '');
        if (!$playlist_id || !$name) { http_response_code(400); echo json_encode(['error' => 'playlist_id и name обязательны']); exit; }
        $stmt = $db->prepare('UPDATE playlists SET name = ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$name, $playlist_id, $user_id]);
        echo json_encode(['success' => true]);
        exit;
    } elseif (preg_match('#/delete$#', $path)) {
        $playlist_id = $data['playlist_id'] ?? null;
        if (!$playlist_id) { http_response_code(400); echo json_encode(['error' => 'playlist_id обязателен']); exit; }
        $stmt = $db->prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?');
        $stmt->execute([$playlist_id, $user_id]);
        echo json_encode(['success' => true]);
        exit;
    } else {
        $name = trim($data['name'] ?? '');
        $is_public = !empty($data['is_public']);
        if (!$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Имя плейлиста обязательно']);
            exit;
        }
        $stmt = $db->prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)');
        $stmt->execute([$user_id, $name, $is_public]);
        echo json_encode(['success' => true, 'playlist_id' => $db->lastInsertId()]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']); 