<?php
require_once __DIR__ . '/../config/db.php';

// Получаем данные из POST
$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

// Валидация
if (!$email || !$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Заполните все поля']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Некорректный email']);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Пароль слишком короткий']);
    exit;
}

$db = get_db_connection();

// Проверка уникальности email и username
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
$stmt->execute([$email, $username]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Email или логин уже заняты']);
    exit;
}

// Хешируем пароль
$hash = password_hash($password, PASSWORD_DEFAULT);

// Добавляем пользователя
$stmt = $db->prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)');
try {
    $stmt->execute([$email, $username, $hash]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка при регистрации']);
} 