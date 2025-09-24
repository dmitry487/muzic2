<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/db.php';

try {
    $db = get_db_connection();
    
    $query = $_GET['q'] ?? '';
    $type = $_GET['type'] ?? 'all'; // all, tracks, artists, albums
    
    if (empty($query)) {
        echo json_encode(['error' => 'Query parameter is required']);
        exit;
    }
    
    $results = [
        'tracks' => [],
        'artists' => [],
        'albums' => []
    ];
    
    // Search tracks
    if ($type === 'all' || $type === 'tracks') {
        $stmt = $db->prepare("
            SELECT 
                id,
                title,
                duration,
                file_path as src,
                cover,
                artist,
                album
            FROM tracks 
            WHERE 
                title LIKE ? OR 
                artist LIKE ? OR 
                album LIKE ?
            ORDER BY 
                CASE 
                    WHEN title LIKE ? THEN 1
                    WHEN artist LIKE ? THEN 2
                    WHEN album LIKE ? THEN 3
                    ELSE 4
                END,
                title
            LIMIT 50
        ");
        
        $searchTerm = '%' . $query . '%';
        $exactMatch = $query . '%';
        
        $stmt->execute([
            $searchTerm, $searchTerm, $searchTerm,
            $exactMatch, $exactMatch, $exactMatch
        ]);
        
        $results['tracks'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Search artists
    if ($type === 'all' || $type === 'artists') {
        $stmt = $db->prepare("
            SELECT DISTINCT
                artist as name,
                cover,
                COUNT(*) as track_count
            FROM tracks 
            WHERE artist LIKE ?
            GROUP BY artist, cover
            ORDER BY 
                CASE WHEN artist LIKE ? THEN 1 ELSE 2 END,
                track_count DESC,
                artist
            LIMIT 20
        ");
        
        $searchTerm = '%' . $query . '%';
        $exactMatch = $query . '%';
        
        $stmt->execute([$searchTerm, $exactMatch]);
        
        $results['artists'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Search albums
    if ($type === 'all' || $type === 'albums') {
        $stmt = $db->prepare("
            SELECT DISTINCT
                album as title,
                artist,
                cover,
                album_type,
                COUNT(*) as track_count
            FROM tracks 
            WHERE album LIKE ? OR artist LIKE ?
            GROUP BY album, artist, cover, album_type
            ORDER BY 
                CASE WHEN album LIKE ? THEN 1 ELSE 2 END,
                track_count DESC,
                album
            LIMIT 20
        ");
        
        $searchTerm = '%' . $query . '%';
        $exactMatch = $query . '%';
        
        $stmt->execute([$searchTerm, $searchTerm, $exactMatch]);
        
        $results['albums'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode($results);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
