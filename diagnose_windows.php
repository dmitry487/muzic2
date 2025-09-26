<?php
// Диагностика проблем с авторизацией на Windows
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h2>Диагностика авторизации на Windows</h2>";

// 1. Проверка подключения к БД
echo "<h3>1. Проверка подключения к БД</h3>";
try {
    require_once __DIR__ . '/src/config/db.php';
    $db = get_db_connection();
    echo "✅ Подключение к БД успешно<br>";
    
    // Проверка таблицы users
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Таблица 'users' существует<br>";
        
        // Проверка структуры таблицы
        $stmt = $db->query("DESCRIBE users");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "Структура таблицы users:<br>";
        foreach ($columns as $col) {
            echo "- {$col['Field']} ({$col['Type']})<br>";
        }
        
        // Проверка пользователей
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $count = $stmt->fetch()['count'];
        echo "Количество пользователей: $count<br>";
        
    } else {
        echo "❌ Таблица 'users' не существует<br>";
        echo "Создаем таблицу...<br>";
        
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        
        $db->exec($sql);
        echo "✅ Таблица 'users' создана<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Ошибка подключения к БД: " . $e->getMessage() . "<br>";
    echo "<strong>Возможные решения:</strong><br>";
    echo "1. Проверьте, что MAMP запущен<br>";
    echo "2. Проверьте порт MySQL (обычно 3306 на Windows)<br>";
    echo "3. Проверьте настройки в src/config/db.php<br>";
}

// 2. Проверка сессий
echo "<h3>2. Проверка сессий</h3>";
session_start();
echo "Session ID: " . session_id() . "<br>";
echo "Session status: " . session_status() . "<br>";
echo "Session save path: " . session_save_path() . "<br>";

// 3. Проверка API endpoints
echo "<h3>3. Проверка API endpoints</h3>";

// Проверка register.php
echo "Проверка register.php...<br>";
$testData = json_encode(['email' => 'test@test.com', 'username' => 'testuser', 'password' => '123456']);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $testData
    ]
]);

$result = file_get_contents('http://localhost:8888/muzic2/src/api/register.php', false, $context);
if ($result) {
    $response = json_decode($result, true);
    if (isset($response['success'])) {
        echo "✅ register.php работает<br>";
    } else {
        echo "❌ register.php ошибка: " . ($response['error'] ?? 'неизвестная ошибка') . "<br>";
    }
} else {
    echo "❌ register.php недоступен<br>";
}

// Проверка login.php
echo "Проверка login.php...<br>";
$testData = json_encode(['login' => 'testuser', 'password' => '123456']);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $testData
    ]
]);

$result = file_get_contents('http://localhost:8888/muzic2/src/api/login.php', false, $context);
if ($result) {
    $response = json_decode($result, true);
    if (isset($response['success'])) {
        echo "✅ login.php работает<br>";
    } else {
        echo "❌ login.php ошибка: " . ($response['error'] ?? 'неизвестная ошибка') . "<br>";
    }
} else {
    echo "❌ login.php недоступен<br>";
}

// 4. Проверка конфигурации MAMP
echo "<h3>4. Рекомендации для Windows</h3>";
echo "<strong>Если авторизация не работает на Windows:</strong><br>";
echo "1. <strong>Проверьте порт MySQL</strong> - на Windows MAMP обычно использует порт 3306, а не 8889<br>";
echo "2. <strong>Обновите src/config/db.php</strong> - измените порт на 3306<br>";
echo "3. <strong>Проверьте, что MAMP запущен</strong> - MySQL должен быть активен<br>";
echo "4. <strong>Создайте базу данных</strong> - откройте phpMyAdmin и создайте базу 'muzic2'<br>";
echo "5. <strong>Проверьте права доступа</strong> - убедитесь, что PHP может писать в папку сессий<br>";

echo "<h3>5. Быстрое исправление для Windows</h3>";
echo "Создайте файл <strong>src/config/db_windows.php</strong> с настройками для Windows:<br>";
echo "<pre>";
echo "&lt;?php\n";
echo "function get_db_connection() {\n";
echo "    \$host = 'localhost';\n";
echo "    \$port = 3306; // Стандартный порт для Windows MAMP\n";
echo "    \$dbname = 'muzic2';\n";
echo "    \$username = 'root';\n";
echo "    \$password = 'root';\n";
echo "    \$dsn = \"mysql:host=\$host;port=\$port;dbname=\$dbname;charset=utf8mb4\";\n";
echo "    try {\n";
echo "        \$pdo = new PDO(\$dsn, \$username, \$password);\n";
echo "        \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n";
echo "        return \$pdo;\n";
echo "    } catch (PDOException \$e) {\n";
echo "        throw new Exception('Database connection failed: ' . \$e->getMessage());\n";
echo "    }\n";
echo "}\n";
echo "?&gt;";
echo "</pre>";

?>
