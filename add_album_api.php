<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'src/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не разрешен']);
    exit;
}

try {
    // Получаем данные из POST запроса
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Неверные данные');
    }
    
    // Валидация обязательных полей
    $required_fields = ['album_name', 'artist_name', 'album_type', 'selectedCover', 'tracks'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            throw new Exception("Поле {$field} обязательно для заполнения");
        }
    }
    
    if (empty($data['tracks']) || !is_array($data['tracks'])) {
        throw new Exception('Добавьте хотя бы один трек');
    }
    
    $db = get_db_connection();
    
    // Начинаем транзакцию
    $db->beginTransaction();
    
    $album_name = $data['album_name'];
    $artist_name = $data['artist_name'];
    $album_type = $data['album_type'];
    $cover_image = $data['selectedCover'];
    $release_year = $data['release_year'] ?? date('Y');
    $description = $data['description'] ?? '';
    
    $inserted_tracks = 0;
    $total_duration = 0;
    
    // Добавляем каждый трек
    foreach ($data['tracks'] as $track) {
        $sql = "INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            $track['title'],
            $artist_name,
            $album_name,
            $album_type,
            $track['duration'],
            $track['file_path'],
            $cover_image
        ]);
        
        if ($result) {
            $inserted_tracks++;
            $total_duration += $track['duration'];
        } else {
            throw new Exception("Ошибка при добавлении трека: {$track['title']}");
        }
    }
    
    // Подтверждаем транзакцию
    $db->commit();
    
    // Форматируем продолжительность
    $hours = floor($total_duration / 3600);
    $minutes = floor(($total_duration % 3600) / 60);
    $seconds = $total_duration % 60;
    
    $formatted_duration = '';
    if ($hours > 0) {
        $formatted_duration .= $hours . 'ч ';
    }
    $formatted_duration .= $minutes . 'м ' . $seconds . 'с';
    
    echo json_encode([
        'success' => true,
        'message' => 'Альбом успешно добавлен',
        'data' => [
            'album_name' => $album_name,
            'artist_name' => $artist_name,
            'album_type' => $album_type,
            'tracks_count' => $inserted_tracks,
            'total_duration' => $formatted_duration,
            'cover' => $cover_image
        ]
    ]);
    
} catch (Exception $e) {
    // Откатываем транзакцию в случае ошибки
    if (isset($db)) {
        $db->rollback();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
