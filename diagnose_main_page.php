<?php
// Diagnostic script for main page loading issues
echo "<h1>🔍 Диагностика загрузки главной страницы</h1>";

echo "<h2>1. Проверка операционной системы</h2>";
echo "PHP_OS: " . PHP_OS . "<br>";
echo "php_uname('s'): " . php_uname('s') . "<br>";
$isWindows = (
    strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ||
    strpos(strtoupper(PHP_OS), 'WINDOWS') !== false ||
    strpos(strtoupper(php_uname('s')), 'WINDOWS') !== false
);
echo "Windows detected: " . ($isWindows ? 'YES' : 'NO') . "<br>";

echo "<h2>2. Проверка подключения к базе данных</h2>";
try {
    require_once __DIR__ . '/src/config/db.php';
    $db = get_db_connection();
    echo "✅ База данных подключена<br>";
    
    // Проверка таблиц
    $tables = ['tracks', 'users', 'playlists', 'likes'];
    foreach ($tables as $table) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
        $count = $stmt->fetch()['count'];
        echo "✅ Таблица $table: $count записей<br>";
    }
    
    // Проверка album_likes
    try {
        $stmt = $db->query("SELECT COUNT(*) as count FROM album_likes");
        $count = $stmt->fetch()['count'];
        echo "✅ Таблица album_likes: $count записей<br>";
    } catch (Exception $e) {
        echo "⚠️ Таблица album_likes не существует<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Ошибка подключения к БД: " . $e->getMessage() . "<br>";
}

echo "<h2>3. Проверка API endpoints</h2>";

// Функция для тестирования API
function testAPI($url, $name) {
    echo "<h3>Тестирование $name</h3>";
    echo "URL: $url<br>";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json',
            'timeout' => 10
        ]
    ]);
    
    $start = microtime(true);
    $result = @file_get_contents($url, false, $context);
    $time = round((microtime(true) - $start) * 1000, 2);
    
    if ($result !== false) {
        $data = json_decode($result, true);
        if ($data) {
            echo "✅ $name работает ({$time}ms)<br>";
            if (isset($data['tracks'])) echo "   - Треков: " . count($data['tracks']) . "<br>";
            if (isset($data['albums'])) echo "   - Альбомов: " . count($data['albums']) . "<br>";
            if (isset($data['artists'])) echo "   - Артистов: " . count($data['artists']) . "<br>";
            if (isset($data['authenticated'])) echo "   - Авторизован: " . ($data['authenticated'] ? 'YES' : 'NO') . "<br>";
        } else {
            echo "⚠️ $name вернул невалидный JSON<br>";
            echo "Ответ: " . substr($result, 0, 200) . "...<br>";
        }
    } else {
        echo "❌ $name не работает<br>";
        $error = error_get_last();
        if ($error) echo "Ошибка: " . $error['message'] . "<br>";
    }
}

// Тестируем все API
testAPI('http://localhost:8888/muzic2/src/api/user.php', 'user.php');
testAPI('http://localhost:8888/muzic2/public/src/api/home.php', 'home.php');
testAPI('http://localhost:8888/muzic2/src/api/likes.php', 'likes.php');

echo "<h2>4. Проверка Windows-версий API</h2>";
testAPI('http://localhost:8888/muzic2/src/api/user_windows.php', 'user_windows.php');
testAPI('http://localhost:8888/muzic2/public/src/api/home_windows.php', 'home_windows.php');
testAPI('http://localhost:8888/muzic2/src/api/likes_windows.php', 'likes_windows.php');

echo "<h2>5. Проверка сессий</h2>";
session_start();
echo "Session ID: " . session_id() . "<br>";
echo "Session status: " . session_status() . "<br>";
echo "User ID in session: " . ($_SESSION['user_id'] ?? 'NOT SET') . "<br>";

echo "<h2>6. Проверка файлов</h2>";
$files = [
    'public/index.php',
    'public/assets/js/app.js',
    'src/api/user.php',
    'public/src/api/home.php',
    'src/api/likes.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "✅ $file существует<br>";
    } else {
        echo "❌ $file не найден<br>";
    }
}

echo "<h2>7. Рекомендации</h2>";
if ($isWindows) {
    echo "🖥️ Обнаружена Windows - используются оптимизированные API<br>";
} else {
    echo "🍎 Обнаружен Mac - используются оригинальные API<br>";
}
?>
