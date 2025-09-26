<?php
session_start();
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$db = get_db_connection();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { http_response_code(401); echo json_encode(['error' => 'Не авторизован']); exit; }

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // list liked tracks with track info
    $stmt = $db->prepare('SELECT t.* FROM likes l JOIN tracks t ON l.track_id = t.id WHERE l.user_id = ? ORDER BY l.created_at DESC');
    $stmt->execute([$user_id]);
    echo json_encode(['tracks' => $stmt->fetchAll()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if ($method === 'POST') {
    $track_id = $data['track_id'] ?? null;
    if (!$track_id) { http_response_code(400); echo json_encode(['error' => 'track_id обязателен']); exit; }
    $stmt = $db->prepare('INSERT IGNORE INTO likes (user_id, track_id) VALUES (?, ?)');
    $stmt->execute([$user_id, $track_id]);
    // Also ensure the track is in the user's default "Любимые треки" playlist
    $pl = $db->prepare('SELECT id FROM playlists WHERE user_id = ? AND name = ? LIMIT 1');
    $pl->execute([$user_id, 'Любимые треки']);
    $playlistId = ($row = $pl->fetch()) ? $row['id'] : null;
    if (!$playlistId) {
        $crt = $db->prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, 0)');
        $crt->execute([$user_id, 'Любимые треки']);
        $playlistId = $db->lastInsertId();
    }
    if ($playlistId) {
        $posStmt = $db->prepare('SELECT COALESCE(MAX(position),0)+1 AS next_pos FROM playlist_tracks WHERE playlist_id = ?');
        $posStmt->execute([$playlistId]);
        $next = ($posStmt->fetch()['next_pos']) ?? 1;
        $insPt = $db->prepare('INSERT IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)');
        $insPt->execute([$playlistId, $track_id, $next]);
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $track_id = $data['track_id'] ?? null;
    if (!$track_id) { http_response_code(400); echo json_encode(['error' => 'track_id обязателен']); exit; }
    $stmt = $db->prepare('DELETE FROM likes WHERE user_id = ? AND track_id = ?');
    $stmt->execute([$user_id, $track_id]);
    // Remove from default favorites playlist as well
    $pl = $db->prepare('SELECT id FROM playlists WHERE user_id = ? AND name = ? LIMIT 1');
    $pl->execute([$user_id, 'Любимые треки']);
    if ($row = $pl->fetch()) {
        $delPt = $db->prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?');
        $delPt->execute([$row['id'], $track_id]);
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);
?>


