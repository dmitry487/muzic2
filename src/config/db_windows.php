<?php
// Windows-optimized database configuration
function get_db_connection_windows() {
    $host = 'localhost';
    $dbname = 'muzic2';
    $username = 'root';
    $password = 'root';
    
    // Для Windows используем порт 3306 (стандартный MySQL)
    $dsn = "mysql:host=$host;port=3306;dbname=$dbname;charset=utf8mb4";
    
    try {
        $pdo = new PDO($dsn, $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        // Fallback на порт 8889 для совместимости
        try {
            $dsn = "mysql:host=$host;port=8889;dbname=$dbname;charset=utf8mb4";
            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            return $pdo;
        } catch (PDOException $e2) {
            throw new Exception('Database connection failed: ' . $e2->getMessage());
        }
    }
}
?>
