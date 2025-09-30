<?php
// Быстрое исправление авторизации на Windows
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h2>Исправление авторизации на Windows</h2>";

// 1. Создаем таблицу users если её нет
echo "<h3>1. Создание таблицы users</h3>";
try {
    // Пробуем подключиться с портом 3306 (Windows)
    $host = 'localhost';
    $port = 3306;
    $dbname = 'muzic2';
    $username = 'root';
    $password = 'root';
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Подключение к БД успешно (порт 3306)<br>";
    
    // Создаем таблицу users
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    $pdo->exec($sql);
    echo "✅ Таблица 'users' создана/проверена<br>";
    
    // Создаем тестового пользователя
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute(['testuser']);
    if ($stmt->fetchColumn() == 0) {
        $hash = password_hash('123456', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->execute(['testuser', 'test@test.com', $hash]);
        echo "✅ Тестовый пользователь создан (логин: testuser, пароль: 123456)<br>";
    } else {
        echo "✅ Тестовый пользователь уже существует<br>";
    }
    
} catch (PDOException $e) {
    echo "❌ Ошибка подключения к БД: " . $e->getMessage() . "<br>";
    echo "Пробуем порт 8889...<br>";
    
    try {
        $port = 8889;
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✅ Подключение к БД успешно (порт 8889)<br>";
        
        // Создаем таблицу users
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        
        $pdo->exec($sql);
        echo "✅ Таблица 'users' создана/проверена<br>";
        
    } catch (PDOException $e2) {
        echo "❌ Ошибка подключения к БД: " . $e2->getMessage() . "<br>";
    }
}

// 2. Обновляем конфигурацию для Windows
echo "<h3>2. Обновление конфигурации</h3>";
$dbConfig = '<?php
// Конфигурация базы данных для Windows MAMP
ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

function get_db_connection() {
    $host = "localhost";
    $port = 3306; // Стандартный порт для Windows MAMP
    $dbname = "muzic2";
    $username = "root";
    $password = "root";
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        // Fallback на порт 8889 если 3306 не работает
        try {
            $port = 8889;
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e2) {
            throw new Exception("Database connection failed: " . $e2->getMessage());
        }
    }
}
?>';

file_put_contents(__DIR__ . '/src/config/db.php', $dbConfig);
echo "✅ Конфигурация обновлена для Windows<br>";

// 3. Тестируем API
echo "<h3>3. Тестирование API</h3>";

// Тест регистрации
$timestamp = time();
$testData = json_encode(['email' => "test{$timestamp}@test.com", 'username' => "testuser{$timestamp}", 'password' => '123456']);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $testData
    ]
]);

$result = file_get_contents('http://localhost:8888/muzic2/src/api/register.php', false, $context);
if ($result !== false) {
    $response = json_decode($result, true);
    if (isset($response['success'])) {
        echo "✅ API регистрации работает<br>";
        $testUsername = "testuser{$timestamp}";
    } else {
        echo "❌ API регистрации ошибка: " . ($response['error'] ?? 'неизвестная ошибка') . "<br>";
        $testUsername = "testuser"; // Используем существующего пользователя
    }
} else {
    echo "❌ API регистрации недоступен<br>";
    echo "Ошибка: " . error_get_last()['message'] . "<br>";
    $testUsername = "testuser"; // Используем существующего пользователя
}

// Тест авторизации
$testData = json_encode(['login' => $testUsername, 'password' => '123456']);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $testData
    ]
]);

$result = file_get_contents('http://localhost:8888/muzic2/src/api/login.php', false, $context);
if ($result !== false) {
    $response = json_decode($result, true);
    if (isset($response['success'])) {
        echo "✅ API авторизации работает<br>";
    } else {
        echo "❌ API авторизации ошибка: " . ($response['error'] ?? 'неизвестная ошибка') . "<br>";
    }
} else {
    echo "❌ API авторизации недоступен<br>";
    echo "Ошибка: " . error_get_last()['message'] . "<br>";
}

echo "<h3>4. Инструкции</h3>";
echo "<strong>Если проблемы остались:</strong><br>";
echo "1. Убедитесь, что MAMP запущен<br>";
echo "2. Проверьте, что MySQL активен в MAMP<br>";
echo "3. Создайте базу данных 'muzic2' в phpMyAdmin<br>";
echo "4. Проверьте порт MySQL в настройках MAMP<br>";
echo "5. Перезапустите MAMP<br>";

echo "<h3>5. Тестовые данные</h3>";
echo "Логин: <strong>{$testUsername}</strong><br>";
echo "Пароль: <strong>123456</strong><br>";
echo "Email: <strong>test{$timestamp}@test.com</strong><br>";

?>
