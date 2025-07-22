<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Получаем данные из POST
$data = json_decode(file_get_contents('php://input'), true);
$login = trim($data['login'] ?? ''); // email или username
$password = $data['password'] ?? '';

if (!$login || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Заполните все поля']);
    exit;
}

$db = get_db_connection();

// Ищем пользователя по email или username
$stmt = $db->prepare('SELECT id, email, username, password_hash FROM users WHERE email = ? OR username = ?');
$stmt->execute([$login, $login]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Неверный логин или пароль']);
    exit;
}

// Сохраняем пользователя в сессии
$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];

// Ответ
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'username' => $user['username']
    ]
]); 