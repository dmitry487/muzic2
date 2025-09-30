<?php
// Database check script
require_once __DIR__ . '/src/config/db.php';

header('Content-Type: application/json');

try {
    $db = get_db_connection();
    
    // Check if users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    $usersTableExists = $stmt->rowCount() > 0;
    
    // Check if playlists table exists
    $stmt = $db->query("SHOW TABLES LIKE 'playlists'");
    $playlistsTableExists = $stmt->rowCount() > 0;
    
    // Check if tracks table exists
    $stmt = $db->query("SHOW TABLES LIKE 'tracks'");
    $tracksTableExists = $stmt->rowCount() > 0;
    
    // Count users
    $userCount = 0;
    if ($usersTableExists) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        $userCount = $result['count'];
    }
    
    // Count playlists
    $playlistCount = 0;
    if ($playlistsTableExists) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM playlists");
        $result = $stmt->fetch();
        $playlistCount = $result['count'];
    }
    
    // Count tracks
    $trackCount = 0;
    if ($tracksTableExists) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM tracks");
        $result = $stmt->fetch();
        $trackCount = $result['count'];
    }
    
    // Get all users
    $users = [];
    if ($usersTableExists) {
        $stmt = $db->query("SELECT id, username, email FROM users");
        $users = $stmt->fetchAll();
    }
    
    echo json_encode([
        'status' => 'OK',
        'tables' => [
            'users' => $usersTableExists,
            'playlists' => $playlistsTableExists,
            'tracks' => $tracksTableExists
        ],
        'counts' => [
            'users' => $userCount,
            'playlists' => $playlistCount,
            'tracks' => $trackCount
        ],
        'users' => $users
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage()
    ]);
}
?>
